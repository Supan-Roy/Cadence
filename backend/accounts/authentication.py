from django.utils import timezone
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import DeviceSession


class DeviceSessionJWTAuthentication(JWTAuthentication):
    """JWT auth that verifies the token belongs to an active device session."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        if getattr(user, "is_banned", False):
            raise exceptions.AuthenticationFailed(
                {"detail": "Sorry, your account has been blocked by admin.", "code": "user_banned"}
            )

        device_session_id = validated_token.get("device_session_id")
        if not device_session_id:
            return user

        session = DeviceSession.objects.filter(
            id=device_session_id,
            user=user,
            is_active=True,
        ).first()

        if not session:
            raise exceptions.AuthenticationFailed("This device session has been revoked.", code="device_revoked")

        DeviceSession.objects.filter(id=session.id).update(last_seen_at=timezone.now())
        return user
