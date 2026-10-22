import pytest
from django.utils import timezone

from app.models import Action, AuditEvent, Customer, CustomerProfile, Employee, Item


@pytest.mark.django_db
def test_item_create_records_audit(api_client):
    response = api_client.post("/api/items/", {"name": "widget"}, format="json")
    assert response.status_code == 201

    action = Action.objects.get(type="item.created")
    assert action.payload == {"newName": "widget"}
    assert list(action.audit.values_list("event", flat=True)) == [
        AuditEvent.EVENT_ACTION_CREATED
    ]


@pytest.mark.django_db
def test_item_update_records_only_changed_fields(api_client):
    item = Item.objects.create(name="widget")

    response = api_client.patch(
        f"/api/items/{item.id}/", {"name": "gadget"}, format="json"
    )
    assert response.status_code == 200

    action = Action.objects.get(type="item.updated")
    assert action.payload == {"oldName": "widget", "newName": "gadget"}


@pytest.mark.django_db
def test_item_delete_records_old_state(api_client):
    item = Item.objects.create(name="widget")

    response = api_client.delete(f"/api/items/{item.id}/")
    assert response.status_code == 204

    action = Action.objects.get(type="item.deleted")
    assert action.payload == {"oldName": "widget"}


@pytest.mark.django_db
def test_no_op_update_does_not_record_audit(api_client):
    item = Item.objects.create(name="widget")
    before = Action.objects.filter(type="item.updated").count()

    response = api_client.patch(
        f"/api/items/{item.id}/", {"name": "widget"}, format="json"
    )
    assert response.status_code == 200
    assert Action.objects.filter(type="item.updated").count() == before


@pytest.mark.django_db
def test_employee_update_records_only_changed_fields(api_client):
    emp = Employee.objects.create(first_name="Ada", last_name="Lovelace", age=36)

    response = api_client.patch(
        f"/api/employees/{emp.id}/", {"age": 37}, format="json"
    )
    assert response.status_code == 200

    action = Action.objects.get(type="employee.updated")
    assert action.payload == {"oldAge": 36, "newAge": 37}


@pytest.mark.django_db
def test_employee_create_uses_camel_cased_keys(api_client):
    response = api_client.post(
        "/api/employees/",
        {"first_name": "Ada", "last_name": "Lovelace", "age": 36},
        format="json",
    )
    assert response.status_code == 201

    action = Action.objects.get(type="employee.created")
    assert action.payload == {
        "newFirstName": "Ada",
        "newLastName": "Lovelace",
        "newAge": 36,
        "newSupervisor": None,
        "newHireDate": timezone.localdate().isoformat(),
    }


@pytest.mark.django_db
def test_posting_to_actions_endpoint_does_not_cascade_audit(api_client):
    """Creating an Action via POST /api/actions/ must not itself generate another Action."""
    response = api_client.post(
        "/api/actions/",
        {"type": "USER_EMAIL_CHANGE", "payload": {"oldEmail": "a", "newEmail": "b"}},
        format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )
    assert response.status_code == 201
    assert Action.objects.count() == 1


@pytest.mark.django_db
def test_audit_actions_link_to_entity(api_client):
    item = Item.objects.create(name="widget")
    api_client.patch(
        f"/api/items/{item.id}/", {"name": "gadget"}, format="json"
    )

    action = Action.objects.get(type="item.updated")
    assert action.entity_type == "item"
    assert action.entity_id == item.id


@pytest.mark.django_db
def test_list_actions_filtered_by_entity(api_client):
    a = Item.objects.create(name="a")
    b = Item.objects.create(name="b")
    api_client.patch(f"/api/items/{a.id}/", {"name": "a2"}, format="json")
    api_client.patch(f"/api/items/{b.id}/", {"name": "b2"}, format="json")
    api_client.delete(f"/api/items/{a.id}/")

    response = api_client.get(
        f"/api/actions/?entity_type=item&entity_id={a.id}"
    )
    assert response.status_code == 200
    body = response.json()
    types = [row["type"] for row in body["results"]]
    assert set(types) == {"item.updated", "item.deleted"}
    assert all(row["id"].startswith("act_") for row in body["results"])


@pytest.mark.django_db
def test_list_actions_without_filters_returns_all(api_client):
    Item.objects.create(name="a")
    api_client.post("/api/items/", {"name": "b"}, format="json")

    response = api_client.get("/api/actions/")
    assert response.status_code == 200
    assert response.json()["count"] >= 1


@pytest.mark.django_db
def test_customer_create_flattens_nested_profile(api_client):
    response = api_client.post(
        "/api/customers/",
        {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "ada@example.com",
            "profile": {"phone": "555-0100", "address": "1 Analytical Way"},
        },
        format="json",
    )
    assert response.status_code == 201

    action = Action.objects.get(type="customer.created")
    assert action.payload == {
        "newFirstName": "Ada",
        "newLastName": "Lovelace",
        "newEmail": "ada@example.com",
        "newProfilePhone": "555-0100",
        "newProfileAddress": "1 Analytical Way",
    }


@pytest.mark.django_db
def test_customer_update_flattens_only_changed_nested_keys(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    CustomerProfile.objects.create(
        customer=customer, phone="555-0100", address="1 Analytical Way"
    )

    response = api_client.patch(
        f"/api/customers/{customer.id}/",
        {"profile": {"phone": "555-0200", "address": "1 Analytical Way"}},
        format="json",
    )
    assert response.status_code == 200

    action = Action.objects.get(type="customer.updated")
    # Only the phone changed; address is unchanged so it must not appear.
    assert action.payload == {
        "oldProfilePhone": "555-0100",
        "newProfilePhone": "555-0200",
    }


@pytest.mark.django_db
def test_customer_delete_flattens_nested_profile(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    CustomerProfile.objects.create(
        customer=customer, phone="555-0100", address="1 Analytical Way"
    )

    response = api_client.delete(f"/api/customers/{customer.id}/")
    assert response.status_code == 204

    action = Action.objects.get(type="customer.deleted")
    assert action.payload == {
        "oldFirstName": "Ada",
        "oldLastName": "Lovelace",
        "oldEmail": "ada@example.com",
        "oldProfilePhone": "555-0100",
        "oldProfileAddress": "1 Analytical Way",
    }
