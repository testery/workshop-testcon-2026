import secrets

from django.db import models

# The application schema is owned by Flyway (db/migrations). These models are `managed = False`:
# Django reads and writes the tables but never creates or alters them, so a schema change is a
# new SQL migration plus the matching model edit, never `makemigrations`.


def _make_action_public_id() -> str:
    return f"act_{secrets.token_hex(6)}"


class Item(models.Model):
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class Employee(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField()
    supervisor = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reports",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Customer(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"


class CustomerProfile(models.Model):
    customer = models.OneToOneField(
        Customer, on_delete=models.CASCADE, related_name="profile"
    )
    phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=255, blank=True)

    class Meta:
        managed = False

    def __str__(self) -> str:
        return f"Profile({self.customer})"


class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Order(models.Model):
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="orders"
    )
    products = models.ManyToManyField(Product, through="OrderItem", related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"Order #{self.pk}"

    @property
    def total(self):
        from decimal import Decimal
        return sum(
            (item.unit_price * item.quantity for item in self.items.all()),
            Decimal("0.00"),
        )


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = False
        unique_together = [("order", "product")]

    def __str__(self) -> str:
        return f"{self.quantity}x {self.product}"


class Action(models.Model):
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_CHOICES = [(STATUS_ACCEPTED, "Accepted")]

    public_id = models.CharField(
        max_length=32, unique=True, default=_make_action_public_id
    )
    type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict, blank=True)
    idempotency_key = models.CharField(max_length=255, unique=True)
    request_hash = models.CharField(max_length=64)
    status = models.CharField(
        max_length=32, choices=STATUS_CHOICES, default=STATUS_ACCEPTED
    )
    entity_type = models.CharField(max_length=50, blank=True, default="")
    entity_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["entity_type", "entity_id"])]

    def __str__(self) -> str:
        return f"Action({self.public_id} {self.type})"


class AuditEvent(models.Model):
    EVENT_ACTION_CREATED = "ACTION_CREATED"
    EVENT_IDEMPOTENCY_REPLAY = "IDEMPOTENCY_REPLAY"
    EVENT_IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"

    action = models.ForeignKey(
        Action, on_delete=models.PROTECT, related_name="audit"
    )
    event = models.CharField(max_length=64)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        ordering = ["timestamp", "id"]

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise RuntimeError("AuditEvent is append-only")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("AuditEvent is append-only")
