from decimal import Decimal

import pytest

from app.models import Customer, Order, Product


@pytest.mark.django_db
def test_create_customer_with_profile(api_client):
    payload = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada@example.com",
        "profile": {"phone": "555-0100", "address": "1 Analytical Way"},
    }
    response = api_client.post("/api/customers/", payload, format="json")
    assert response.status_code == 201, response.content
    body = response.json()
    assert body["profile"] == {"phone": "555-0100", "address": "1 Analytical Way"}
    assert Customer.objects.count() == 1


@pytest.mark.django_db
def test_create_customer_with_notes(api_client):
    payload = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada@example.com",
        "notes": "Prefers email contact",
    }
    response = api_client.post("/api/customers/", payload, format="json")
    assert response.status_code == 201, response.content
    assert response.json()["notes"] == "Prefers email contact"
    assert Customer.objects.get().notes == "Prefers email contact"


@pytest.mark.django_db
def test_customer_notes_are_optional_and_editable(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    assert customer.notes == ""
    response = api_client.patch(
        f"/api/customers/{customer.id}/", {"notes": "VIP"}, format="json"
    )
    assert response.status_code == 200, response.content
    assert response.json()["notes"] == "VIP"


@pytest.mark.django_db
def test_update_customer_profile(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    response = api_client.patch(
        f"/api/customers/{customer.id}/",
        {"profile": {"phone": "555-0200", "address": "New"}},
        format="json",
    )
    assert response.status_code == 200, response.content
    assert response.json()["profile"]["phone"] == "555-0200"


@pytest.mark.django_db
def test_search_customers(api_client):
    Customer.objects.create(first_name="Ada", last_name="Lovelace", email="ada@example.com")
    Customer.objects.create(first_name="Grace", last_name="Hopper", email="grace@example.com")
    body = api_client.get("/api/customers/?search=hopper").json()
    assert body["count"] == 1


@pytest.mark.django_db
def test_create_product(api_client):
    response = api_client.post(
        "/api/products/", {"name": "Widget", "price": "9.99"}, format="json"
    )
    assert response.status_code == 201
    assert Product.objects.count() == 1


@pytest.mark.django_db
def test_create_order_with_items(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    widget = Product.objects.create(name="Widget", price=Decimal("9.99"))
    gadget = Product.objects.create(name="Gadget", price=Decimal("19.50"))
    payload = {
        "customer": customer.id,
        "items": [
            {"product": widget.id, "quantity": 2, "unit_price": "9.99"},
            {"product": gadget.id, "quantity": 1, "unit_price": "19.50"},
        ],
    }
    response = api_client.post("/api/orders/", payload, format="json")
    assert response.status_code == 201, response.content
    body = response.json()
    assert body["customer_name"] == "Ada Lovelace"
    assert Decimal(body["total"]) == Decimal("39.48")
    assert len(body["items"]) == 2
    assert Order.objects.count() == 1


@pytest.mark.django_db
def test_order_requires_items(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    response = api_client.post(
        "/api/orders/", {"customer": customer.id, "items": []}, format="json"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_order_rejects_duplicate_products(api_client):
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    widget = Product.objects.create(name="Widget", price=Decimal("9.99"))
    payload = {
        "customer": customer.id,
        "items": [
            {"product": widget.id, "quantity": 1, "unit_price": "9.99"},
            {"product": widget.id, "quantity": 2, "unit_price": "9.99"},
        ],
    }
    response = api_client.post("/api/orders/", payload, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_filter_orders_by_customer(api_client):
    c1 = Customer.objects.create(first_name="A", last_name="A", email="a@example.com")
    c2 = Customer.objects.create(first_name="B", last_name="B", email="b@example.com")
    widget = Product.objects.create(name="Widget", price=Decimal("1.00"))
    for c in (c1, c2):
        api_client.post(
            "/api/orders/",
            {"customer": c.id, "items": [{"product": widget.id, "quantity": 1, "unit_price": "1.00"}]},
            format="json",
        )
    body = api_client.get(f"/api/orders/?customer={c1.id}").json()
    assert body["count"] == 1
    assert body["results"][0]["customer"] == c1.id
