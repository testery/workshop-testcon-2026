from django.contrib import admin
from django.urls import include, path

from .auth import demo_login, logout, me
from .health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/demo-login", demo_login),
    path("api/auth/logout", logout),
    path("api/auth/me", me),
    path("api/", include("app.urls")),
]
