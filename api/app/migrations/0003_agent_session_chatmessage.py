import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_customer_product_customerprofile_order_orderitem_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Agent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["name", "id"]},
        ),
        migrations.CreateModel(
            name="Session",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("container_id", models.CharField(blank=True, max_length=128)),
                ("container_url", models.CharField(blank=True, max_length=255)),
                (
                    "container_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("failed", "Failed"),
                            ("stopped", "Stopped"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "agent",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="sessions",
                        to="app.agent",
                    ),
                ),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[("user", "User"), ("assistant", "Assistant")],
                        max_length=16,
                    ),
                ),
                ("content", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="app.session",
                    ),
                ),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
    ]
