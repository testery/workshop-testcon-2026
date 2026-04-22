import pytest

from app.models import Employee, Item


@pytest.mark.django_db
def test_item_str_returns_name():
    item = Item.objects.create(name="widget")
    assert str(item) == "widget"


@pytest.mark.django_db
def test_item_created_at_autoset():
    item = Item.objects.create(name="widget")
    assert item.created_at is not None


@pytest.mark.django_db
def test_employee_str_returns_full_name():
    emp = Employee.objects.create(first_name="Ada", last_name="Lovelace", age=36)
    assert str(emp) == "Ada Lovelace"


@pytest.mark.django_db
def test_supervisor_self_reference():
    boss = Employee.objects.create(first_name="Grace", last_name="Hopper", age=85)
    report = Employee.objects.create(
        first_name="Ada", last_name="Lovelace", age=36, supervisor=boss
    )
    assert report.supervisor == boss
    assert list(boss.reports.all()) == [report]


@pytest.mark.django_db
def test_supervisor_set_null_on_delete():
    boss = Employee.objects.create(first_name="Grace", last_name="Hopper", age=85)
    report = Employee.objects.create(
        first_name="Ada", last_name="Lovelace", age=36, supervisor=boss
    )
    boss.delete()
    report.refresh_from_db()
    assert report.supervisor is None
