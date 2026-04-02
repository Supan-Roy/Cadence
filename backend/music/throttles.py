from rest_framework.throttling import UserRateThrottle


def _is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    return bool(
        getattr(user, "role", "") == "admin"
        or getattr(user, "is_staff", False)
        or getattr(user, "email", "") == "admin@supanroy.com"
    )


class AdminExemptUserRateThrottle(UserRateThrottle):
    def allow_request(self, request, view):
        if _is_admin_user(getattr(request, "user", None)):
            return True
        return super().allow_request(request, view)


class StreamThrottle(UserRateThrottle):
    scope = "stream"

    def allow_request(self, request, view):
        if _is_admin_user(getattr(request, "user", None)):
            return True
        return super().allow_request(request, view)