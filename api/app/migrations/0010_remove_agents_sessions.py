from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0009_action_entity_type_entity_id"),
    ]

    operations = [
        migrations.DeleteModel(name="ChatMessage"),
        migrations.DeleteModel(name="Session"),
        migrations.DeleteModel(name="Agent"),
    ]
