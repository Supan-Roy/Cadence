from rest_framework.permissions import BasePermission


class IsArtist(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ["artist", "admin"]
        )

class IsAppAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == "admin"
        )