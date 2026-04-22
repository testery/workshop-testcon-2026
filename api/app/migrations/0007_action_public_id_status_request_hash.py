from django.db import migrations, models

import app.models


def backfill_public_ids(apps, schema_editor):
    Action = apps.get_model("app", "Action")
    for row in Action.objects.filter(public_id=""):
        row.public_id = app.models._make_action_public_id()
        row.save(update_fields=["public_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0006_alter_action_idempotency_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="action",
            name="public_id",
            field=models.CharField(default="", max_length=32),
        ),
        migrations.AddField(
            model_name="action",
            name="request_hash",
            field=models.CharField(default="", max_length=64),
        ),
        migrations.AddField(
            model_name="action",
            name="status",
            field=models.CharField(
                choices=[("ACCEPTED", "Accepted")],
                default="ACCEPTED",
                max_length=32,
            ),
        ),
        migrations.RunPython(backfill_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="action",
            name="public_id",
            field=models.CharField(
                default=app.models._make_action_public_id,
                max_length=32,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="action",
            name="request_hash",
            field=models.CharField(max_length=64),
        ),
    ]
