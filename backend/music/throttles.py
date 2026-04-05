from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.contrib.auth import get_user_model
from django.conf import settings

try:
    from rest_framework_simplejwt.tokens import AccessToken
except Exception:  # pragma: no cover
    AccessToken = None


User = get_user_model()


def _is_localhost_request(request):
    if not getattr(settings, "DISABLE_RATE_LIMIT_ON_LOCALHOST", False):
        return False

    localhost_values = {"localhost", "127.0.0.1", "::1"}

    host = ""
    try:
        host = request.get_host().split(":", 1)[0].strip().lower()
    except Exception:
        host = ""

    remote_addr = (request.META.get("REMOTE_ADDR") or "").strip().lower()
    forwarded_for = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip().lower()

    return (
        host in localhost_values
        or remote_addr in localhost_values
        or forwarded_for in localhost_values
    )


def _get_user_from_stream_token(request):
    if AccessToken is None:
        return None

    token = request.query_params.get("access_token") if hasattr(request, "query_params") else None
    if not token:
        return None

    try:
        payload = AccessToken(token)
        user_id = payload.get("user_id")
        if not user_id:
            return None
        return User.objects.filter(id=user_id).only("id", "role", "email", "is_staff").first()
    except Exception:
        return None


def _is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    return bool(
        getattr(user, "role", "") == "admin"
        or getattr(user, "is_staff", False)
        or getattr(user, "email", "") == "admin@supanroy.com"
    )


class AdminExemptUserRateThrottle(UserRateThrottle):
    def get_cache_key(self, request, view):
        if _is_localhost_request(request):
            return None
        if _is_admin_user(getattr(request, "user", None)):
            return None
        return super().get_cache_key(request, view)

    def allow_request(self, request, view):
        if _is_localhost_request(request):
            return True
        if _is_admin_user(getattr(request, "user", None)):
            return True
        return super().allow_request(request, view)


class AdminExemptAnonRateThrottle(AnonRateThrottle):
    def get_cache_key(self, request, view):
        if _is_localhost_request(request):
            return None
        if _is_admin_user(getattr(request, "user", None)):
            return None
        return super().get_cache_key(request, view)

    def allow_request(self, request, view):
        if _is_localhost_request(request):
            return True
        if _is_admin_user(getattr(request, "user", None)):
            return True
        return super().allow_request(request, view)


class StreamThrottle(UserRateThrottle):
    scope = "stream"

    def _resolve_request_user(self, request):
        request_user = getattr(request, "user", None)
        if _is_admin_user(request_user):
            return request_user
        return _get_user_from_stream_token(request)

    def get_cache_key(self, request, view):
        if _is_localhost_request(request):
            return None
        if _is_admin_user(self._resolve_request_user(request)):
            return None
        return super().get_cache_key(request, view)

    def allow_request(self, request, view):
        if _is_localhost_request(request):
            return True
        if _is_admin_user(self._resolve_request_user(request)):
            return True
        return super().allow_request(request, view)