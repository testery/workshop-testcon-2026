from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0007_action_public_id_status_request_hash"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditEvent",
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
                ("event", models.CharField(max_length=64)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                (
                    "action",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="audit",
                        to="app.action",
                    ),
                ),
            ],
            options={"ordering": ["timestamp", "id"]},
        ),
    ]
