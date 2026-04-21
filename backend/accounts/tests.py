from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken


User = get_user_model()


class BannedUserAuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="banned@example.com",
            password="StrongPass123!",
            is_banned=True,
            is_active=True,
        )

    def test_banned_user_cannot_obtain_token(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user_banned", str(response.data.get("code")))

    def test_banned_user_with_legacy_token_cannot_access_profile(self):
        # Simulate old access tokens minted before device_session_id was introduced.
        access = str(AccessToken.for_user(self.user))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.get(reverse("accounts:profile"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
