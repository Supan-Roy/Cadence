from django.shortcuts import render

# Create your views here.
from rest_framework import generics, serializers
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


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
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'error': 'Invalid email or password'})
        
        if not user.check_password(password):
            raise serializers.ValidationError({'error': 'Invalid email or password'})
        
        if not user.is_active:
            raise serializers.ValidationError({'error': 'User account is disabled'})
        
        refresh = RefreshToken.for_user(user)
        
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    
    def to_representation(self, instance):
        return instance


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom view that uses email for authentication"""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
