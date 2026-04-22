from urllib.parse import quote_plus, urlencode

from authlib.integrations.django_client import OAuth
from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.views.decorators.http import require_GET
from rest_framework import authentication


oauth = OAuth()
oauth.register(
    "auth0",
    client_id=settings.AUTH0_CLIENT_ID,
    client_secret=settings.AUTH0_CLIENT_SECRET,
    client_kwargs={"scope": "openid profile email"},
    server_metadata_url=f"https://{settings.AUTH0_DOMAIN}/.well-known/openid-configuration",
)


class Auth0User:
    """Lightweight user object built from the Auth0 ID token claims stored in the session."""

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


class Auth0SessionAuthentication(authentication.BaseAuthentication):
    """Reads the user from the Django session populated by the /auth/callback view."""

    def authenticate(self, request):
        claims = request.session.get("auth0_user")
        if not claims:
            return None
        return (Auth0User(claims), None)


@require_GET
def login(request):
    redirect_uri = settings.AUTH0_CALLBACK_URL
    connection = request.GET.get("connection")
    kwargs = {}
    if connection:
        kwargs["connection"] = connection
    next_url = request.GET.get("next") or settings.POST_LOGOUT_REDIRECT
    request.session["post_login_redirect"] = next_url
    return oauth.auth0.authorize_redirect(request, redirect_uri, **kwargs)


@require_GET
def callback(request):
    token = oauth.auth0.authorize_access_token(request)
    userinfo = token.get("userinfo") or {}
    request.session["auth0_user"] = dict(userinfo)
    next_url = request.session.pop("post_login_redirect", settings.POST_LOGOUT_REDIRECT)
    return HttpResponseRedirect(next_url)


@require_GET
def logout(request):
    request.session.flush()
    params = urlencode(
        {
            "returnTo": settings.POST_LOGOUT_REDIRECT,
            "client_id": settings.AUTH0_CLIENT_ID,
        },
        quote_via=quote_plus,
    )
    return HttpResponseRedirect(f"https://{settings.AUTH0_DOMAIN}/v2/logout?{params}")


@require_GET
def dev_login(request):
    """Dev-only endpoint that seeds a session with a fake user. Enabled only when DEBUG=True."""
    if not settings.DEBUG:
        return JsonResponse({"detail": "Not found"}, status=404)
    request.session["auth0_user"] = {
        "sub": "auth0|dev-test-user",
        "email": "dev@example.com",
        "name": "Dev Test User",
    }
    return JsonResponse({"authenticated": True})


@require_GET
def me(request):
    claims = request.session.get("auth0_user")
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
