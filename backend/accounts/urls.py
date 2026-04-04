from django.urls import path

from .views import DeviceSessionListView, DeviceSessionLogoutView, ProfileView, RegisterView

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("devices/", DeviceSessionListView.as_view(), name="device-session-list"),
    path("devices/<uuid:device_id>/logout/", DeviceSessionLogoutView.as_view(), name="device-session-logout"),
]
