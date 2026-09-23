import uuid

from django.core.management.base import BaseCommand
from django.db import transaction

from app.models import (
    Action,
    AuditEvent,
    Customer,
    Employee,
    Item,
    Order,
    Product,
)
from app.serializers import (
    CustomerSerializer,
    EmployeeSerializer,
    ItemSerializer,
    OrderSerializer,
    ProductSerializer,
)
from app.views import _flatten_scalar, _hash_request_body, _pascal


ENTITY_MAP = [
    ("item", Item, ItemSerializer),
    ("employee", Employee, EmployeeSerializer),
    ("customer", Customer, CustomerSerializer),
    ("product", Product, ProductSerializer),
    ("order", Order, OrderSerializer),
]


class Command(BaseCommand):
    help = (
        "Create a synthetic <entity>.backfill Action for every entity row that "
        "has no audit history (rows written before the audit mixin was added, "
        "or created directly via ORM). Idempotent — re-running skips rows that "
        "already have any Action row."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be backfilled without writing.",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        total = 0

        for slug, model, serializer_cls in ENTITY_MAP:
            audited_ids = set(
                Action.objects.filter(entity_type=slug).values_list(
                    "entity_id", flat=True
                )
            )
            missing_qs = model.objects.exclude(pk__in=audited_ids)
            count = missing_qs.count()
            self.stdout.write(f"{slug}: {count} row(s) need backfill")

            if dry or count == 0:
                continue

            for row in missing_qs:
                self._backfill(slug, row, serializer_cls)
                total += 1

        verb = "Would create" if dry else "Created"
        self.stdout.write(self.style.SUCCESS(f"{verb} {total} backfill Action(s)"))

    @transaction.atomic
    def _backfill(self, slug: str, row, serializer_cls) -> None:
        snapshot = serializer_cls(row).data
        writable = {
            name for name, f in serializer_cls().fields.items() if not f.read_only
        }
        payload: dict = {}
        for k, v in snapshot.items():
            if k in writable:
                _flatten_scalar(_pascal(k), v, "new", payload)
        action_type = f"{slug}.backfill"
        action = Action.objects.create(
            type=action_type,
            payload=payload,
            idempotency_key=f"audit:backfill:{uuid.uuid4().hex}",
            request_hash=_hash_request_body(action_type, payload),
            entity_type=slug,
            entity_id=row.pk,
        )
        AuditEvent.objects.create(
            action=action, event=AuditEvent.EVENT_ACTION_CREATED
        )
