from django.shortcuts import render

# Create your views here.
from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.cache import cache
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, ProfileSerializer
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
