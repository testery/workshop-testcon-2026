from decimal import Decimal

import pytest

from app.models import Customer, CustomerProfile, Order, OrderItem, Product


@pytest.mark.django_db
def test_customer_profile_one_to_one():
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    profile = CustomerProfile.objects.create(
        customer=customer, phone="555-0100", address="1 Analytical Way"
    )
    assert customer.profile == profile
    assert profile.customer == customer


@pytest.mark.django_db
def test_customer_has_many_orders():
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    o1 = Order.objects.create(customer=customer)
    o2 = Order.objects.create(customer=customer)
    assert list(customer.orders.order_by("id")) == [o1, o2]


@pytest.mark.django_db
def test_order_products_many_to_many_through_order_item():
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    order = Order.objects.create(customer=customer)
    widget = Product.objects.create(name="Widget", price=Decimal("9.99"))
    gadget = Product.objects.create(name="Gadget", price=Decimal("19.50"))
    OrderItem.objects.create(order=order, product=widget, quantity=2, unit_price=Decimal("9.99"))
    OrderItem.objects.create(order=order, product=gadget, quantity=1, unit_price=Decimal("19.50"))
    assert set(order.products.all()) == {widget, gadget}
    assert order.total == Decimal("39.48")


@pytest.mark.django_db
def test_order_item_unique_per_product():
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    order = Order.objects.create(customer=customer)
    widget = Product.objects.create(name="Widget", price=Decimal("9.99"))
    OrderItem.objects.create(order=order, product=widget, quantity=1, unit_price=Decimal("9.99"))
    with pytest.raises(Exception):
        OrderItem.objects.create(order=order, product=widget, quantity=1, unit_price=Decimal("9.99"))


@pytest.mark.django_db
def test_deleting_customer_cascades_orders_and_profile():
    customer = Customer.objects.create(
        first_name="Ada", last_name="Lovelace", email="ada@example.com"
    )
    CustomerProfile.objects.create(customer=customer, phone="555")
    Order.objects.create(customer=customer)
    customer.delete()
    assert CustomerProfile.objects.count() == 0
    assert Order.objects.count() == 0
