from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIRequestFactory
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Genre
from .permissions import IsAppAdmin, IsArtist
from .serializers import TrackUploadSerializer


class RolePermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.artist_user = User.objects.create_user(
            email="artist@example.com",
            password="testpass123",
            role="artist",
        )
        self.listener_user = User.objects.create_user(
            email="listener@example.com",
            password="testpass123",
            role="listener",
        )
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="testpass123",
            role="admin",
        )

    def test_is_artist_allows_artist(self):
        request = self.factory.post("/api/music/upload/")
        request.user = self.artist_user

        self.assertTrue(IsArtist().has_permission(request, view=None))

    def test_is_artist_allows_admin_as_superset_role(self):
        request = self.factory.post("/api/music/upload/")
        request.user = self.admin_user

        self.assertTrue(IsArtist().has_permission(request, view=None))

    def test_is_artist_denies_listener(self):
        request = self.factory.post("/api/music/upload/")
        request.user = self.listener_user

        self.assertFalse(IsArtist().has_permission(request, view=None))

    def test_is_app_admin_allows_only_admin(self):
        request = self.factory.post("/api/music/moderation/pending/")
        request.user = self.admin_user
        self.assertTrue(IsAppAdmin().has_permission(request, view=None))

        request.user = self.artist_user
        self.assertFalse(IsAppAdmin().has_permission(request, view=None))

        request.user = self.listener_user
        self.assertFalse(IsAppAdmin().has_permission(request, view=None))


class GenreAndUploadValidationTests(APITestCase):
    def setUp(self):
        self.music_genre, _ = Genre.objects.get_or_create(
            name="Rock",
            defaults={"category": Genre.CATEGORY_MUSIC},
        )
        self.podcast_genre, _ = Genre.objects.get_or_create(
            name="Space",
            defaults={"category": Genre.CATEGORY_PODCAST},
        )
        if self.podcast_genre.category != Genre.CATEGORY_PODCAST:
            self.podcast_genre.category = Genre.CATEGORY_PODCAST
            self.podcast_genre.save(update_fields=["category"])

    def test_genres_endpoint_filters_podcast_genres(self):
        url = reverse("music:genre-list")
        response = self.client.get(url, {"is_podcast": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("results", response.data)
        names = [item["name"] for item in payload]
        self.assertIn("Space", names)
        self.assertNotIn("Rock", names)

    def test_upload_serializer_rejects_music_genre_for_podcast_track(self):
        serializer = TrackUploadSerializer()

        with self.assertRaises(serializers.ValidationError):
            serializer.validate({"genre": self.music_genre, "is_podcast": True})
