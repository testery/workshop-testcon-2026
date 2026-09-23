from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from app.models import Customer, CustomerProfile, Employee, Order, OrderItem, Product

EMPLOYEES = [
    ("Ada", "Lovelace", 36, None),
    ("Grace", "Hopper", 45, "Ada Lovelace"),
    ("Linus", "Torvalds", 41, "Ada Lovelace"),
    ("Margaret", "Hamilton", 39, "Grace Hopper"),
    ("Ken", "Thompson", 52, "Grace Hopper"),
]

CUSTOMERS = [
    ("Tomas", "Petrauskas", "tomas@example.com", "+370 600 00001", "Gedimino pr. 1, Vilnius"),
    ("Ieva", "Kazlauskiene", "ieva@example.com", "+370 600 00002", "Laisves al. 10, Kaunas"),
    ("Jonas", "Jankauskas", "jonas@example.com", "", "Taikos pr. 5, Klaipeda"),
]

PRODUCTS = [
    ("Ephemeral Environment Starter Kit", "49.00"),
    ("Flaky Test Repellent", "19.99"),
    ("Green Build Coffee Mug", "14.50"),
    ("Merge Confidence (1 year)", "199.00"),
]

ORDERS = [
    ("tomas@example.com", [("Ephemeral Environment Starter Kit", 1), ("Green Build Coffee Mug", 2)]),
    ("ieva@example.com", [("Merge Confidence (1 year)", 1)]),
]


class Command(BaseCommand):
    help = "Seed a small, deterministic demo data set. Safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        by_name = {}
        for first, last, age, supervisor in EMPLOYEES:
            emp, _ = Employee.objects.update_or_create(
                first_name=first, last_name=last, defaults={"age": age}
            )
            by_name[f"{first} {last}"] = emp
        for first, last, _, supervisor in EMPLOYEES:
            if supervisor:
                emp = by_name[f"{first} {last}"]
                emp.supervisor = by_name[supervisor]
                emp.save(update_fields=["supervisor"])

        for first, last, email, phone, address in CUSTOMERS:
            customer, _ = Customer.objects.update_or_create(
                email=email, defaults={"first_name": first, "last_name": last}
            )
            CustomerProfile.objects.update_or_create(
                customer=customer, defaults={"phone": phone, "address": address}
            )

        products = {}
        for name, price in PRODUCTS:
            products[name], _ = Product.objects.update_or_create(
                name=name, defaults={"price": Decimal(price)}
            )

        for email, lines in ORDERS:
            customer = Customer.objects.get(email=email)
            wanted = {products[name] for name, _ in lines}
            order = next(
                (o for o in customer.orders.all() if set(o.products.all()) == wanted), None
            )
            if order is None:
                order = Order.objects.create(customer=customer)
            for name, qty in lines:
                product = products[name]
                OrderItem.objects.update_or_create(
                    order=order, product=product,
                    defaults={"quantity": qty, "unit_price": product.price},
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {Employee.objects.count()} employees, {Customer.objects.count()} customers, "
                f"{Product.objects.count()} products, {Order.objects.count()} orders"
            )
        )
