from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(required=False, default="listener")

    class Meta:
        model = User
        fields = ["email", "password", "role"]

    def validate_role(self, value):
        if value == "admin":
            raise serializers.ValidationError("Cannot assign admin role.")
        return value

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
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
