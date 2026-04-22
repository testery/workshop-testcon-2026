import hashlib
import json
import logging
import uuid

from django.db import transaction
from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .agent_runner import get_runner
from .models import (
    Action,
    Agent,
    AuditEvent,
    ChatMessage,
    Customer,
    Employee,
    Item,
    Order,
    Product,
    Session,
)
from .serializers import (
    ActionCreateRequestSerializer,
    ActionCreateResponseSerializer,
    ActionDetailSerializer,
    AgentSerializer,
    ChatMessageSerializer,
    CustomerSerializer,
    EmployeeSerializer,
    ItemSerializer,
    OrderSerializer,
    ProductSerializer,
    SessionSerializer,
)


def _hash_request_body(action_type: str, payload: dict) -> str:
    canonical = json.dumps(
        {"type": action_type, "payload": payload},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _pascal(s: str) -> str:
    return "".join(p[:1].upper() + p[1:] for p in s.split("_"))


def _flatten_scalar(prefix: str, value, side: str, out: dict) -> None:
    """Emit `{side}{prefix}` = value, recursing into dict values so nested
    serializer output (e.g. `profile = {phone, address}`) becomes
    `{side}ProfilePhone`, `{side}ProfileAddress`. Lists stay opaque."""
    if isinstance(value, dict):
        for k, v in value.items():
            _flatten_scalar(prefix + _pascal(k), v, side, out)
        return
    out[f"{side}{prefix}"] = value


def _flatten_diff(prefix: str, old_val, new_val, out: dict) -> None:
    """Recursively compare old vs new; emit one `old<Key>` / `new<Key>` pair
    per changed *leaf*. Dicts recurse; lists and scalars are compared whole."""
    if isinstance(old_val, dict) or isinstance(new_val, dict):
        keys: set = set()
        if isinstance(old_val, dict):
            keys |= old_val.keys()
        if isinstance(new_val, dict):
            keys |= new_val.keys()
        for k in keys:
            _flatten_diff(
                prefix + _pascal(k),
                old_val.get(k) if isinstance(old_val, dict) else None,
                new_val.get(k) if isinstance(new_val, dict) else None,
                out,
            )
        return
    if old_val != new_val:
        out[f"old{prefix}"] = old_val
        out[f"new{prefix}"] = new_val


def _record_entity_action(
    action_type: str,
    payload: dict,
    entity_type: str = "",
    entity_id: int | None = None,
) -> None:
    key = f"audit:{uuid.uuid4().hex}"
    body_hash = _hash_request_body(action_type, payload)
    audit_action = Action.objects.create(
        type=action_type,
        payload=payload,
        idempotency_key=key,
        request_hash=body_hash,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    AuditEvent.objects.create(
        action=audit_action, event=AuditEvent.EVENT_ACTION_CREATED
    )


class AuditedViewSetMixin:
    """Record an Action row + ACTION_CREATED audit event for every write.

    Subclasses set `audit_entity` (e.g. "item") and get:
      create  -> type="<entity>.created", payload={"new<Field>": ...}
      update  -> type="<entity>.updated", payload only for *changed* fields
                 ({"old<Field>": ..., "new<Field>": ...})
      destroy -> type="<entity>.deleted", payload={"old<Field>": ...}

    No-op updates (no field changed) do not record an audit row.
    """

    audit_entity: str = ""

    def _writable_fields(self, serializer) -> set:
        return {name for name, f in serializer.fields.items() if not f.read_only}

    def perform_create(self, serializer):
        with transaction.atomic():
            super().perform_create(serializer)
            writable = self._writable_fields(serializer)
            fresh = serializer.__class__(serializer.instance).data
            payload: dict = {}
            for k, v in fresh.items():
                if k in writable:
                    _flatten_scalar(_pascal(k), v, "new", payload)
            _record_entity_action(
                f"{self.audit_entity}.created",
                payload,
                entity_type=self.audit_entity,
                entity_id=serializer.instance.pk,
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            writable = self._writable_fields(serializer)
            before = serializer.__class__(serializer.instance).data
            super().perform_update(serializer)
            # Nested writers (e.g. CustomerSerializer updates reverse OneToOne via
            # update_or_create) leave cached relations stale on the instance,
            # so force a fresh read before snapshotting the "after" state.
            serializer.instance.refresh_from_db()
            after = serializer.__class__(serializer.instance).data
            payload: dict = {}
            for k in writable:
                _flatten_diff(_pascal(k), before.get(k), after.get(k), payload)
            if payload:
                _record_entity_action(
                    f"{self.audit_entity}.updated",
                    payload,
                    entity_type=self.audit_entity,
                    entity_id=serializer.instance.pk,
                )

    def perform_destroy(self, instance):
        with transaction.atomic():
            stub = self.get_serializer(instance)
            writable = self._writable_fields(stub)
            snapshot = stub.data
            payload: dict = {}
            for k, v in snapshot.items():
                if k in writable:
                    _flatten_scalar(_pascal(k), v, "old", payload)
            entity_id = instance.pk
            super().perform_destroy(instance)
            _record_entity_action(
                f"{self.audit_entity}.deleted",
                payload,
                entity_type=self.audit_entity,
                entity_id=entity_id,
            )


logger = logging.getLogger(__name__)


class ItemViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "item"
    serializer_class = ItemSerializer

    def get_queryset(self):
        qs = Item.objects.all().order_by("id")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class ActionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ActionDetailSerializer
    lookup_field = "public_id"
    lookup_value_regex = r"act_[a-f0-9]+"

    def get_queryset(self):
        qs = Action.objects.prefetch_related("audit").all()
        entity_type = self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("entity_id")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if entity_id:
            qs = qs.filter(entity_id=entity_id)
        return qs

    def create(self, request, *args, **kwargs):
        key = (request.headers.get("Idempotency-Key") or "").strip()
        if not key:
            return Response(
                {"error": "Idempotency-Key header is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req = ActionCreateRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        body = req.validated_data
        body_hash = _hash_request_body(body["type"], body["payload"])

        existing = Action.objects.filter(idempotency_key=key).first()
        if existing:
            if existing.request_hash != body_hash:
                AuditEvent.objects.create(
                    action=existing, event=AuditEvent.EVENT_IDEMPOTENCY_CONFLICT
                )
                return Response(
                    {"error": "Idempotency key already used with a different request"},
                    status=status.HTTP_409_CONFLICT,
                )
            AuditEvent.objects.create(
                action=existing, event=AuditEvent.EVENT_IDEMPOTENCY_REPLAY
            )
            return Response(
                ActionCreateResponseSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        with transaction.atomic():
            new_action = Action.objects.create(
                type=body["type"],
                payload=body["payload"],
                idempotency_key=key,
                request_hash=body_hash,
            )
            AuditEvent.objects.create(
                action=new_action, event=AuditEvent.EVENT_ACTION_CREATED
            )

        return Response(
            ActionCreateResponseSerializer(new_action).data,
            status=status.HTTP_201_CREATED,
        )


class EmployeeViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "employee"
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        qs = (
            Employee.objects.select_related("supervisor")
            .order_by("last_name", "first_name", "id")
        )
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        supervisor = self.request.query_params.get("supervisor")
        if supervisor:
            qs = qs.filter(supervisor_id=supervisor)
        return qs


class CustomerViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "customer"
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = Customer.objects.select_related("profile").order_by("last_name", "first_name", "id")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return qs


class ProductViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "product"
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all().order_by("name", "id")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class OrderViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "order"
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = (
            Order.objects.select_related("customer")
            .prefetch_related("items__product")
            .order_by("-created_at", "-id")
        )
        customer = self.request.query_params.get("customer")
        if customer:
            qs = qs.filter(customer_id=customer)
        return qs


class AgentViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "agent"
    serializer_class = AgentSerializer

    def get_queryset(self):
        qs = Agent.objects.all().order_by("name", "id")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        return qs


class SessionViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = "session"
    serializer_class = SessionSerializer

    def get_queryset(self):
        qs = (
            Session.objects.select_related("agent")
            .order_by("-created_at", "-id")
        )
        agent = self.request.query_params.get("agent")
        if agent:
            qs = qs.filter(agent_id=agent)
        return qs

    def perform_create(self, serializer):
        session = serializer.save()
        runner = get_runner()
        try:
            handle = runner.start(
                session_id=session.id,
                agent_name=session.agent.name,
                agent_description=session.agent.description,
            )
            session.container_id = handle.container_id
            session.container_url = handle.url
            session.container_status = Session.STATUS_RUNNING
            session.save(update_fields=["container_id", "container_url", "container_status"])
        except Exception:
            logger.exception("Failed to spin up container for session %s", session.id)
            session.container_status = Session.STATUS_FAILED
            session.save(update_fields=["container_status"])

    def perform_destroy(self, instance):
        if instance.container_id:
            try:
                get_runner().stop(instance.container_id)
            except Exception:
                logger.exception("Failed to stop container %s", instance.container_id)
        super().perform_destroy(instance)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        session = self.get_object()
        msgs = session.messages.all()
        return Response(ChatMessageSerializer(msgs, many=True).data)

    @action(detail=True, methods=["post"])
    def chat(self, request, pk=None):
        session = self.get_object()
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response(
                {"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if session.container_status != Session.STATUS_RUNNING:
            return Response(
                {"detail": f"session container not running (status={session.container_status})"},
                status=status.HTTP_409_CONFLICT,
            )
        ChatMessage.objects.create(
            session=session, role=ChatMessage.ROLE_USER, content=message
        )
        try:
            reply = get_runner().chat(
                container_id=session.container_id,
                url=session.container_url,
                user_id=str(session.id),
                message=message,
            )
        except Exception as exc:
            logger.exception("chat failed for session %s", session.id)
            return Response(
                {"detail": f"agent error: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        assistant_msg = ChatMessage.objects.create(
            session=session, role=ChatMessage.ROLE_ASSISTANT, content=reply
        )
        return Response(ChatMessageSerializer(assistant_msg).data)
