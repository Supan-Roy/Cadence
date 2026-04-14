from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import DeviceSession
from .device_utils import get_friendly_device_name, is_probably_raw_user_agent

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(required=False, default="listener")
    name = serializers.CharField(required=True, allow_blank=False, max_length=25)

    class Meta:
        model = User
        fields = ["email", "password", "role", "name"]

    def validate_role(self, value):
        if value == "admin":
            raise serializers.ValidationError("Cannot assign admin role.")
        return value

    def validate_name(self, value):
        cleaned = str(value).strip()
        if not cleaned:
            raise serializers.ValidationError("Name is required.")
        return cleaned

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def to_representation(self, instance):
        refresh = RefreshToken.for_user(instance)

        return {
            "user": {
                "id": str(instance.id),
                "email": instance.email,
                "role": instance.role,
                "name": instance.name,
                "profile_image": instance.profile_image.url if instance.profile_image else "",
                "is_banned": instance.is_banned,
                "ban_reason": instance.ban_reason or "",
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class ProfileSerializer(serializers.ModelSerializer):
    remove_profile_image = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = ["id", "email", "role", "name", "profile_image", "remove_profile_image", "is_banned", "ban_reason"]
        read_only_fields = ["id", "email", "role", "is_banned", "ban_reason"]

    def validate_name(self, value):
        if len(str(value).strip()) > 25:
            raise serializers.ValidationError("Display name cannot exceed 25 characters.")
        return value

    def update(self, instance, validated_data):
        remove_profile_image = validated_data.pop("remove_profile_image", False)

        if remove_profile_image and instance.profile_image:
            instance.profile_image.delete(save=False)
            instance.profile_image = None

        return super().update(instance, validated_data)


class DeviceSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = DeviceSession
        fields = [
            "id",
            "device_name",
            "display_name",
            "user_agent",
            "ip_address",
            "is_active",
            "created_at",
            "last_seen_at",
            "is_current",
        ]

    def get_display_name(self, obj):
        name = (obj.device_name or "").strip()
        if name and not is_probably_raw_user_agent(name):
            return name
        source_ua = (obj.user_agent or obj.device_name or "").strip()
        return get_friendly_device_name(source_ua)

    def get_is_current(self, obj):
        request = self.context.get("request")
        if not request or not request.auth:
            return False
        current_session_id = request.auth.get("device_session_id")
        return str(obj.id) == str(current_session_id)
