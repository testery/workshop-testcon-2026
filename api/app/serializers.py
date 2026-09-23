from rest_framework import serializers

from .models import (
    Action,
    AuditEvent,
    Customer,
    CustomerProfile,
    Employee,
    Item,
    Order,
    OrderItem,
    Product,
)


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


class ActionCreateRequestSerializer(serializers.Serializer):
    type = serializers.CharField(max_length=100, allow_blank=False, trim_whitespace=True)
    payload = serializers.DictField()


class ActionCreateResponseSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="public_id", read_only=True)

    class Meta:
        model = Action
        fields = ["id", "status"]


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = ["event", "timestamp"]


class ActionDetailSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="public_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    entityType = serializers.CharField(source="entity_type", read_only=True)
    entityId = serializers.IntegerField(
        source="entity_id", read_only=True, allow_null=True
    )
    audit = AuditEventSerializer(many=True, read_only=True)

    class Meta:
        model = Action
        fields = [
            "id",
            "type",
            "payload",
            "status",
            "entityType",
            "entityId",
            "createdAt",
            "audit",
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "first_name",
            "last_name",
            "age",
            "supervisor",
            "supervisor_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "supervisor_name"]

    def get_supervisor_name(self, obj: Employee) -> str | None:
        if obj.supervisor_id is None:
            return None
        return f"{obj.supervisor.first_name} {obj.supervisor.last_name}"

    def validate(self, attrs):
        supervisor = attrs.get("supervisor")
        if supervisor and self.instance and supervisor.pk == self.instance.pk:
            raise serializers.ValidationError(
                {"supervisor": "An employee cannot be their own supervisor."}
            )
        return attrs


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["phone", "address"]


class CustomerSerializer(serializers.ModelSerializer):
    profile = CustomerProfileSerializer(required=False)

    class Meta:
        model = Customer
        fields = ["id", "first_name", "last_name", "email", "profile", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        customer = Customer.objects.create(**validated_data)
        if profile_data:
            CustomerProfile.objects.create(customer=customer, **profile_data)
        return customer

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data is not None:
            CustomerProfile.objects.update_or_create(
                customer=instance, defaults=profile_data
            )
        return instance


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price", "created_at"]
        read_only_fields = ["id", "created_at"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price"]
        read_only_fields = ["id", "product_name"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    customer_name = serializers.SerializerMethodField()
    total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Order
        fields = ["id", "customer", "customer_name", "items", "total", "created_at"]
        read_only_fields = ["id", "customer_name", "total", "created_at"]

    def get_customer_name(self, obj: Order) -> str:
        return f"{obj.customer.first_name} {obj.customer.last_name}"

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Order must have at least one item.")
        product_ids = [i["product"].id for i in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Duplicate products in order items.")
        return items

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = Order.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                OrderItem.objects.create(order=instance, **item)
        return instance
