from datetime import date

import pytest
from django.utils import timezone

from app.models import Employee, Item


@pytest.mark.django_db
def test_list_items_empty(api_client):
    response = api_client.get("/api/items/")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 0
    assert body["results"] == []


@pytest.mark.django_db
def test_create_item(api_client):
    response = api_client.post("/api/items/", {"name": "widget"}, format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "widget"
    assert "id" in body
    assert Item.objects.count() == 1


@pytest.mark.django_db
def test_retrieve_item(api_client):
    item = Item.objects.create(name="gadget")
    response = api_client.get(f"/api/items/{item.id}/")
    assert response.status_code == 200
    assert response.json()["name"] == "gadget"


@pytest.mark.django_db
def test_delete_item(api_client):
    item = Item.objects.create(name="gadget")
    response = api_client.delete(f"/api/items/{item.id}/")
    assert response.status_code == 204
    assert Item.objects.count() == 0


@pytest.mark.django_db
def test_list_items_paginated(api_client):
    for i in range(15):
        Item.objects.create(name=f"item-{i:02d}")
    page1 = api_client.get("/api/items/").json()
    assert page1["count"] == 15
    assert len(page1["results"]) == 10
    assert page1["next"] is not None
    page2 = api_client.get("/api/items/?page=2").json()
    assert len(page2["results"]) == 5


@pytest.mark.django_db
def test_list_items_search_filter(api_client):
    Item.objects.create(name="widget")
    Item.objects.create(name="gadget")
    Item.objects.create(name="Wombat")
    body = api_client.get("/api/items/?search=w").json()
    names = {r["name"] for r in body["results"]}
    assert names == {"widget", "Wombat"}
    assert body["count"] == 2


@pytest.mark.django_db
def test_list_employees_empty(api_client):
    response = api_client.get("/api/employees/")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 0
    assert body["results"] == []


@pytest.mark.django_db
def test_create_employee(api_client):
    response = api_client.post(
        "/api/employees/",
        {"first_name": "Ada", "last_name": "Lovelace", "age": 36},
        format="json",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["first_name"] == "Ada"
    assert body["supervisor"] is None
    assert Employee.objects.count() == 1


@pytest.mark.django_db
def test_create_employee_defaults_hire_date_to_today(api_client):
    response = api_client.post(
        "/api/employees/",
        {"first_name": "Ada", "last_name": "Lovelace", "age": 36},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["hire_date"] == timezone.localdate().isoformat()


@pytest.mark.django_db
def test_create_employee_with_hire_date(api_client):
    response = api_client.post(
        "/api/employees/",
        {"first_name": "Ada", "last_name": "Lovelace", "age": 36, "hire_date": "2026-10-06"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["hire_date"] == "2026-10-06"
    assert Employee.objects.get().hire_date == date(2026, 10, 6)


@pytest.mark.django_db
def test_create_with_supervisor(api_client):
    boss = Employee.objects.create(first_name="Grace", last_name="Hopper", age=85)
    response = api_client.post(
        "/api/employees/",
        {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "age": 36,
            "supervisor": boss.id,
        },
        format="json",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["supervisor"] == boss.id
    assert body["supervisor_name"] == "Grace Hopper"


@pytest.mark.django_db
def test_cannot_self_supervise(api_client):
    emp = Employee.objects.create(first_name="Ada", last_name="Lovelace", age=36)
    response = api_client.patch(
        f"/api/employees/{emp.id}/",
        {"supervisor": emp.id},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_search_employees_by_name(api_client):
    Employee.objects.create(first_name="Ada", last_name="Lovelace", age=36)
    Employee.objects.create(first_name="Grace", last_name="Hopper", age=85)
    body = api_client.get("/api/employees/?search=hopper").json()
    assert body["count"] == 1
    assert body["results"][0]["last_name"] == "Hopper"
