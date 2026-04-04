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
from django.contrib.auth import get_user_model

User = get_user_model()
MAX_DEVICE_SESSIONS = 3


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
            raise serializers.ValidationError({'error': 'Invalid email or password'})
        
        if not user.check_password(password):
            raise serializers.ValidationError({'error': 'Invalid email or password'})
        
        if not user.is_active:
            raise serializers.ValidationError({'error': 'User account is disabled'})

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

        return data


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


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
