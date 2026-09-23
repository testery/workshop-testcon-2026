from django.contrib import admin

from .models import Customer, Employee, Item, Order, Product

admin.site.register(Item)
admin.site.register(Employee)
admin.site.register(Customer)
admin.site.register(Product)
admin.site.register(Order)
