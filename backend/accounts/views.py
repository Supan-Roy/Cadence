from django.shortcuts import render

# Create your views here.
from rest_framework import generics, serializers
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, ProfileSerializer, DeviceSessionSerializer
from .models import DeviceSession
from .device_utils import get_friendly_device_name
from .utils import (
    send_verification_email,
    send_password_reset_email,
    send_account_deletion_email,
    generate_password_reset_token,
)
from django.contrib.auth import get_user_model
import secrets
import requests
import logging
from django.conf import settings
from urllib.parse import urlencode
import json

User = get_user_model()
MAX_DEVICE_SESSIONS = 3
logger = logging.getLogger(__name__)


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


def _get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _get_device_name(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    if not user_agent:
        return "Unknown device"
    return get_friendly_device_name(user_agent)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom serializer that accepts email instead of username"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove the 'username' field if it exists
        if 'username' in self.fields:
            del self.fields['username']
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        request = self.context.get("request")
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {
                    'detail': 'Account does not exist.',
                    'code': 'account_not_found',
                }
            )
        
        if not user.check_password(password):
            raise serializers.ValidationError({'error': 'Invalid email or password'})
        
        if not user.is_active:
            raise serializers.ValidationError({'error': 'User account is disabled'})
        if user.is_banned:
            raise serializers.ValidationError(
                {
                    "detail": "Sorry, your account has been blocked by admin.",
                    "code": "user_banned",
                }
            )

        active_sessions = DeviceSession.objects.filter(user=user, is_active=True).order_by("created_at")
        excess_count = max(0, active_sessions.count() - (MAX_DEVICE_SESSIONS - 1))
        if excess_count > 0:
            now = timezone.now()
            old_session_ids = list(active_sessions.values_list("id", flat=True)[:excess_count])
            DeviceSession.objects.filter(id__in=old_session_ids).update(is_active=False, revoked_at=now)

        device_session = DeviceSession.objects.create(
            user=user,
            device_name=_get_device_name(request) if request else "Unknown device",
            user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
            ip_address=_get_client_ip(request) if request else None,
            is_active=True,
        )
        
        refresh = RefreshToken.for_user(user)
        refresh["device_session_id"] = str(device_session.id)
        
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'device_session_id': str(device_session.id),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': user.role,
                'name': user.name,
                'is_banned': user.is_banned,
                'ban_reason': user.ban_reason or "",
            },
        }
    
    def to_representation(self, instance):
        return instance


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom view that uses email for authentication"""
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        device_session_id = refresh.get("device_session_id")
        user_id = refresh.get("user_id")

        if not device_session_id or not user_id:
            raise serializers.ValidationError({"detail": "Invalid refresh token for device session."})

        is_active = DeviceSession.objects.filter(
            id=device_session_id,
            user_id=user_id,
            is_active=True,
        ).exists()
        if not is_active:
            raise serializers.ValidationError({"detail": "This device session has been logged out."})

        data = super().validate(attrs)
        session = DeviceSession.objects.filter(id=device_session_id, user_id=user_id).first()
        if session:
            session.last_seen_at = timezone.now()
            session.save(update_fields=["last_seen_at"])

        user = User.objects.filter(id=user_id).first()
        if user and user.is_banned:
            raise serializers.ValidationError(
                {
                    "detail": "Sorry, your account has been blocked by admin.",
                    "code": "user_banned",
                }
            )

        return data


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        # Save the user
        user = serializer.save()
        
        # Send verification email asynchronously
        try:
            send_verification_email(user, async_send=True)
        except Exception as e:
            # Log error but don't fail user creation
            logger.error(f"Failed to send verification email to {user.email}: {str(e)}")


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        serializer.save()
        cache.delete("popular_tracks")
        cache.delete("trending_tracks")


class DeviceSessionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DeviceSessionSerializer

    def get_queryset(self):
        return DeviceSession.objects.filter(user=self.request.user, is_active=True)


class DeviceSessionLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, device_id):
        device = DeviceSession.objects.filter(user=request.user, id=device_id, is_active=True).first()
        if not device:
            return Response({"detail": "Device session not found."}, status=status.HTTP_404_NOT_FOUND)

        current_session_id = request.auth.get("device_session_id") if request.auth else None
        is_current = str(device.id) == str(current_session_id)

        device.is_active = False
        device.revoked_at = timezone.now()
        device.save(update_fields=["is_active", "revoked_at"])

        return Response(
            {
                "detail": "Device logged out successfully.",
                "revoked_current": is_current,
            },
            status=status.HTTP_200_OK,
        )


class GoogleOAuthView(APIView):
    """
    GET endpoint to initiate Google OAuth flow.
    Returns Google auth URL and state.
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        client_secret = settings.GOOGLE_OAUTH2_CLIENT_SECRET

        if not client_id or not client_secret:
            return Response(
                {"detail": "Google OAuth is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Generate state
        state = secrets.token_urlsafe(32)

        # Store state in session with expiry
        request.session['oauth_state'] = state
        request.session.set_expiry(settings.GOOGLE_OAUTH_STATE_TIMEOUT)

        # Build Google OAuth URL
        redirect_uri = f"{settings.FRONTEND_URL}/auth/google/callback"
        query = urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "offline",
                "prompt": "consent",
            }
        )
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

        return Response(
            {"auth_url": auth_url, "state": state},
            status=status.HTTP_200_OK,
        )


class GoogleOAuthCallbackView(APIView):
    """
    POST endpoint to exchange Google auth code for tokens.
    Input: { "code": "...", "state": "..." }
    Returns JWT access/refresh tokens and user info.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        client_secret = settings.GOOGLE_OAUTH2_CLIENT_SECRET

        if not client_id or not client_secret:
            return Response(
                {"detail": "Google OAuth is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        code = request.data.get("code")
        state = request.data.get("state")

        # Validate required fields
        if not code:
            return Response(
                {"detail": "Authorization code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not state:
            return Response(
                {"detail": "State parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate state against session when session state exists
        session_state = request.session.get("oauth_state")
        if session_state and session_state != state:
            return Response(
                {"detail": "Invalid state parameter. Session mismatch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Remove state from session
        if "oauth_state" in request.session:
            del request.session["oauth_state"]
            request.session.modified = True

        # Exchange code for access token
        try:
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": f"{settings.FRONTEND_URL}/auth/google/callback",
                "grant_type": "authorization_code",
            }
            token_response = requests.post(token_url, data=token_data, timeout=10)
            token_response.raise_for_status()
            tokens = token_response.json()
        except requests.RequestException as e:
            return Response(
                {"detail": f"Error communicating with Google: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch user profile from Google
        try:
            access_token = tokens.get("access_token")
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            profile_response = requests.get(userinfo_url, headers=headers, timeout=10)
            profile_response.raise_for_status()
            profile = profile_response.json()
        except requests.RequestException as e:
            return Response(
                {"detail": f"Error fetching user profile from Google: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract user info
        email = profile.get("email")
        given_name = profile.get("given_name", "")
        family_name = profile.get("family_name", "")

        if not email:
            return Response(
                {"detail": "Email not provided by Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get or create user
        full_name = f"{given_name} {family_name}".strip() or "User"
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "name": full_name,
                "is_active": True,
            },
        )

        # Update name and mark email as verified if this is an existing user
        if not created:
            if given_name or family_name:
                user.name = full_name
                user.save(update_fields=["name"])
        if user.is_banned:
            return Response(
                {"detail": "Sorry, your account has been blocked by admin.", "code": "user_banned"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Create device session
        device_session = DeviceSession.objects.create(
            user=user,
            device_name=_get_device_name(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=_get_client_ip(request),
            is_active=True,
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        refresh["device_session_id"] = str(device_session.id)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "name": user.name,
                    "profile_image": user.profile_image.url if user.profile_image else "",
                    "is_banned": user.is_banned,
                    "ban_reason": user.ban_reason or "",
                },
            },
            status=status.HTTP_200_OK,
        )


class VerifyEmailView(APIView):
    """Verify email with OTP"""

    def post(self, request):
        email = request.data.get("email", "").strip()
        otp = request.data.get("otp", "").strip()

        if not email or not otp:
            return Response(
                {"detail": "Email and OTP are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if email already verified
        if user.email_verified:
            return Response(
                {"detail": "Email already verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_banned:
            return Response(
                {"detail": "Sorry, your account has been blocked by admin.", "code": "user_banned"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if OTP matches
        if user.email_verification_token != otp:
            return Response(
                {"detail": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if OTP expired (10 minutes)
        if user.email_verification_sent_at is None:
            return Response(
                {"detail": "OTP expired"}, status=status.HTTP_400_BAD_REQUEST
            )

        minutes_elapsed = (
            timezone.now() - user.email_verification_sent_at
        ).total_seconds() / 60
        if minutes_elapsed > settings.EMAIL_VERIFICATION_TOKEN_EXPIRY / 60:
            return Response(
                {"detail": "OTP expired"}, status=status.HTTP_403_FORBIDDEN
            )

        # Mark email as verified
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        user.save()

        # Auto-login user after successful email verification
        active_sessions = DeviceSession.objects.filter(user=user, is_active=True).order_by("created_at")
        excess_count = max(0, active_sessions.count() - (MAX_DEVICE_SESSIONS - 1))
        if excess_count > 0:
            now = timezone.now()
            old_session_ids = list(active_sessions.values_list("id", flat=True)[:excess_count])
            DeviceSession.objects.filter(id__in=old_session_ids).update(is_active=False, revoked_at=now)

        device_session = DeviceSession.objects.create(
            user=user,
            device_name=_get_device_name(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=_get_client_ip(request),
            is_active=True,
        )

        refresh = RefreshToken.for_user(user)
        refresh["device_session_id"] = str(device_session.id)

        return Response(
            {
                "detail": "Email verified successfully",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "name": user.name,
                    "profile_image": user.profile_image.url if user.profile_image else "",
                    "is_banned": user.is_banned,
                    "ban_reason": user.ban_reason or "",
                },
            },
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(APIView):
    """Resend verification email"""

    def post(self, request):
        email = request.data.get("email", "").strip()

        if not email:
            return Response(
                {"detail": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            return Response(
                {"detail": "Verification email sent if account exists"},
                status=status.HTTP_200_OK,
            )

        # Check if email already verified
        if user.email_verified:
            return Response(
                {"detail": "Email already verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit: check if email was sent in last 2 minutes
        if user.email_verification_sent_at and not _is_localhost_request(request):
            seconds_elapsed = (
                timezone.now() - user.email_verification_sent_at
            ).total_seconds()
            if seconds_elapsed < 120:
                return Response(
                    {
                        "detail": f"Please wait {int(120 - seconds_elapsed)} seconds before requesting another code"
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Send verification email
        send_verification_email(user, async_send=True)

        return Response(
            {"detail": "Verification email sent"},
            status=status.HTTP_200_OK,
        )


class PasswordResetView(APIView):
    """Request password reset email"""

    def post(self, request):
        email = request.data.get("email", "").strip()

        if not email:
            return Response(
                {"detail": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            return Response(
                {"detail": "If account exists, password reset email will be sent"},
                status=status.HTTP_200_OK,
            )

        # Rate limit: check if email was sent in last 2 minutes
        if user.password_reset_sent_at and not _is_localhost_request(request):
            seconds_elapsed = (
                timezone.now() - user.password_reset_sent_at
            ).total_seconds()
            if seconds_elapsed < 120:
                return Response(
                    {
                        "detail": f"Please wait {int(120 - seconds_elapsed)} seconds before requesting another link"
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Generate and save reset token
        reset_token = generate_password_reset_token()
        user.password_reset_token = reset_token
        user.password_reset_sent_at = timezone.now()
        user.save()

        # Send password reset email
        send_password_reset_email(user, reset_token, async_send=True)

        return Response(
            {
                "detail": "Password reset email sent",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token and new password"""

    def post(self, request):
        token = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "")

        if not token or not new_password:
            return Response(
                {"detail": "Token and new password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid reset token"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if token expired (1 hour)
        if user.password_reset_sent_at is None:
            return Response(
                {"detail": "Reset token expired"}, status=status.HTTP_400_BAD_REQUEST
            )

        hours_elapsed = (
            timezone.now() - user.password_reset_sent_at
        ).total_seconds() / 3600
        if hours_elapsed > settings.PASSWORD_RESET_TOKEN_EXPIRY / 3600:
            return Response(
                {"detail": "Reset token expired"}, status=status.HTTP_403_FORBIDDEN
            )

        # Validate password strength (at least 8 characters)
        if len(new_password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Set new password
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_sent_at = None
        user.save()

        return Response(
            {"detail": "Password reset successfully"},
            status=status.HTTP_200_OK,
        )


class DeleteAccountView(APIView):
    """Request account deletion"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        deletion_reasons = request.data.get("deletion_reasons", "")

        # Rate limit: check if email was sent in last 2 minutes
        user = request.user
        if user.account_deletion_sent_at and not _is_localhost_request(request):
            seconds_elapsed = (
                timezone.now() - user.account_deletion_sent_at
            ).total_seconds()
            if seconds_elapsed < 120:
                return Response(
                    {
                        "detail": f"Please wait {int(120 - seconds_elapsed)} seconds before requesting another confirmation"
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Generate and save deletion token
        deletion_token = generate_password_reset_token()
        user.account_deletion_token = deletion_token
        user.account_deletion_sent_at = timezone.now()
        user.account_deletion_reasons = deletion_reasons or None
        user.save()

        # Send deletion confirmation email
        send_account_deletion_email(
            user, deletion_token, deletion_reasons, async_send=True
        )

        return Response(
            {
                "detail": "Account deletion confirmation email sent",
            },
            status=status.HTTP_200_OK,
        )


class DeleteAccountConfirmView(APIView):
    """Confirm account deletion with token"""

    def post(self, request):
        token = request.data.get("token", "").strip()

        if not token:
            return Response(
                {"detail": "Token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(account_deletion_token=token)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid deletion token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if token expired (24 hours)
        if user.account_deletion_sent_at is None:
            return Response(
                {"detail": "Deletion token expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hours_elapsed = (
            timezone.now() - user.account_deletion_sent_at
        ).total_seconds() / 3600
        if hours_elapsed > settings.ACCOUNT_DELETION_TOKEN_EXPIRY / 3600:
            return Response(
                {"detail": "Deletion token expired"}, status=status.HTTP_403_FORBIDDEN
            )

        # Delete user account
        user_id = user.id
        user.delete()

        return Response(
            {"detail": "Account deleted successfully"},
            status=status.HTTP_200_OK,
        )
