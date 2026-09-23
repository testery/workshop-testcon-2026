from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.http import require_GET
from rest_framework import authentication

DEMO_USER = {"sub": "demo|workshop", "email": "demo@example.com", "name": "Demo User"}


class SessionUser:
    """Lightweight user object built from the claims stored in the Django session."""

    def __init__(self, claims: dict):
        self._claims = claims
        self.sub = claims.get("sub", "")
        self.email = claims.get("email", "")
        self.name = claims.get("name", self.email)
        self.picture = claims.get("picture", "")

    @property
    def is_authenticated(self) -> bool:
        return bool(self.sub)

    @property
    def is_anonymous(self) -> bool:
        return not self.is_authenticated

    def __str__(self) -> str:
        return self.name or self.email or self.sub


class SessionAuthentication(authentication.BaseAuthentication):
    """Reads the user from the Django session populated by /api/auth/demo-login."""

    def authenticate(self, request):
        claims = request.session.get("user")
        if not claims:
            return None
        return (SessionUser(claims), None)


@require_GET
def demo_login(request):
    """Signs the browser in as the built-in demo user. Controlled by DEMO_LOGIN_ENABLED (default on)."""
    if not settings.DEMO_LOGIN_ENABLED:
        return JsonResponse({"detail": "Not found"}, status=404)
    request.session["user"] = dict(DEMO_USER)
    return JsonResponse({"authenticated": True, "user": DEMO_USER})


@require_GET
def logout(request):
    request.session.flush()
    return HttpResponseRedirect("/")


@require_GET
def me(request):
    claims = request.session.get("user")
    if not claims:
        return JsonResponse({"authenticated": False}, status=200)
    return JsonResponse(
        {
            "authenticated": True,
            "user": {
                "sub": claims.get("sub"),
                "email": claims.get("email"),
                "name": claims.get("name"),
                "picture": claims.get("picture"),
            },
        }
    )
