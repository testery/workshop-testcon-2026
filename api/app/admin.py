from django.contrib import admin

from .models import Agent, Employee, Item, Session

admin.site.register(Item)
admin.site.register(Employee)
admin.site.register(Agent)
admin.site.register(Session)
