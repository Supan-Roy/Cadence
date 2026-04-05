from django.urls import path

from .views import (
    DeviceSessionListView,
    DeviceSessionLogoutView,
    ProfileView,
    RegisterView,
    GoogleOAuthView,
    GoogleOAuthCallbackView,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetView,
    PasswordResetConfirmView,
    DeleteAccountView,
    DeleteAccountConfirmView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("devices/", DeviceSessionListView.as_view(), name="device-session-list"),
    path("devices/<uuid:device_id>/logout/", DeviceSessionLogoutView.as_view(), name="device-session-logout"),
    path("google/", GoogleOAuthView.as_view(), name="google_oauth"),
    path("google/callback/", GoogleOAuthCallbackView.as_view(), name="google_oauth_callback"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("password-reset/", PasswordResetView.as_view(), name="password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("delete-account/", DeleteAccountView.as_view(), name="delete-account"),
    path("delete-account-confirm/", DeleteAccountConfirmView.as_view(), name="delete-account-confirm"),
]
