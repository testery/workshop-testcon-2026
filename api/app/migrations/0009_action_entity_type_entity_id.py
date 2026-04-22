from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0008_auditevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="action",
            name="entity_type",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="action",
            name="entity_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="action",
            index=models.Index(
                fields=["entity_type", "entity_id"],
                name="app_action_entity__0c4bde_idx",
            ),
        ),
    ]
