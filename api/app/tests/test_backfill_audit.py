import pytest
from django.core.management import call_command

from app.models import Action, Customer, Item


@pytest.mark.django_db
def test_backfill_creates_synthetic_actions_for_preexisting_rows():
    # Simulate rows written before the audit mixin existed — direct ORM, no API.
    Item.objects.create(name="widget")
    Item.objects.create(name="gadget")
    Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    assert Action.objects.count() == 0

    call_command("backfill_audit")

    item_actions = Action.objects.filter(entity_type="item")
    customer_actions = Action.objects.filter(entity_type="customer")
    assert item_actions.count() == 2
    assert customer_actions.count() == 1
    assert all(a.type.endswith(".backfill") for a in item_actions)
    # Payload snapshots the current writable state
    widget_action = item_actions.get(entity_id=Item.objects.get(name="widget").id)
    assert widget_action.payload == {"newName": "widget"}


@pytest.mark.django_db
def test_backfill_is_idempotent():
    Item.objects.create(name="widget")
    call_command("backfill_audit")
    first_count = Action.objects.count()

    call_command("backfill_audit")
    assert Action.objects.count() == first_count


@pytest.mark.django_db
def test_backfill_skips_rows_with_existing_audit(api_client):
    # Row created via the API → mixin already recorded item.created
    api_client.post("/api/items/", {"name": "widget"}, format="json")
    assert Action.objects.filter(entity_type="item", type="item.created").count() == 1
    assert Action.objects.filter(type="item.backfill").count() == 0

    call_command("backfill_audit")

    # No new backfill row for this item — it already has audit history
    assert Action.objects.filter(type="item.backfill").count() == 0


@pytest.mark.django_db
def test_backfill_dry_run_does_not_write():
    Item.objects.create(name="widget")
    call_command("backfill_audit", "--dry-run")
    assert Action.objects.count() == 0
