from django.contrib import admin
from django.urls import include, path

from .auth import callback, dev_login, login, logout, me
from .health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/login", login),
    path("api/auth/callback", callback),
    path("api/auth/logout", logout),
    path("api/auth/me", me),
    path("api/auth/dev-login", dev_login),
    path("api/", include("app.urls")),
]
