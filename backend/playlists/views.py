from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from music.models import Track
from .models import Playlist
from .serializers import PlaylistSerializer, PlaylistDetailSerializer


class PlaylistListCreateView(generics.ListCreateAPIView):
	serializer_class = PlaylistSerializer
	permission_classes = [IsAuthenticated]
	throttle_classes = []
	parser_classes = [JSONParser, MultiPartParser, FormParser]

	def get_queryset(self):
		return Playlist.objects.filter(user=self.request.user).prefetch_related("tracks")

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context["track_id"] = self.request.query_params.get("track_id")
		return context

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)


class PlaylistDetailView(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = [IsAuthenticated]
	throttle_classes = []
	parser_classes = [JSONParser, MultiPartParser, FormParser]

	def get_queryset(self):
		return Playlist.objects.filter(user=self.request.user).prefetch_related("tracks")

	def get_serializer_class(self):
		if self.request.method == "GET":
			return PlaylistDetailSerializer
		return PlaylistSerializer

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context["track_id"] = self.request.query_params.get("track_id")
		return context


class PlaylistAddTrackView(APIView):
	permission_classes = [IsAuthenticated]
	throttle_classes = []

	def post(self, request, pk):
		track_id = request.data.get("track_id")
		if not track_id:
			return Response({"track_id": "track_id is required."}, status=status.HTTP_400_BAD_REQUEST)

		try:
			playlist = Playlist.objects.get(pk=pk, user=request.user)
		except Playlist.DoesNotExist:
			return Response({"detail": "Playlist not found."}, status=status.HTTP_404_NOT_FOUND)

		try:
			track = Track.objects.get(pk=track_id, status="approved")
		except Track.DoesNotExist:
			return Response({"detail": "Track not found."}, status=status.HTTP_404_NOT_FOUND)

		if getattr(track, "is_podcast", False):
			return Response({"detail": "Podcasts cannot be added to playlists."}, status=status.HTTP_400_BAD_REQUEST)

		already_exists = playlist.tracks.filter(id=track.id).exists()
		if not already_exists:
			playlist.tracks.add(track)

		serializer = PlaylistSerializer(playlist, context={"track_id": str(track.id)})
		return Response(
			{
				"detail": "Track added to playlist." if not already_exists else "Track already exists in playlist.",
				"already_exists": already_exists,
				"playlist": serializer.data,
			},
			status=status.HTTP_200_OK,
		)


class PlaylistRemoveTrackView(APIView):
	permission_classes = [IsAuthenticated]
	throttle_classes = []

	def post(self, request, pk):
		track_id = request.data.get("track_id")
		if not track_id:
			return Response({"track_id": "track_id is required."}, status=status.HTTP_400_BAD_REQUEST)

		try:
			playlist = Playlist.objects.get(pk=pk, user=request.user)
		except Playlist.DoesNotExist:
			return Response({"detail": "Playlist not found."}, status=status.HTTP_404_NOT_FOUND)

		try:
			track = Track.objects.get(pk=track_id)
		except Track.DoesNotExist:
			return Response({"detail": "Track not found."}, status=status.HTTP_404_NOT_FOUND)

		if playlist.tracks.filter(id=track.id).exists():
			playlist.tracks.remove(track)

		serializer = PlaylistSerializer(playlist, context={"track_id": str(track.id)})
		return Response(
			{
				"detail": "Track removed from playlist.",
				"playlist": serializer.data,
			},
			status=status.HTTP_200_OK,
		)
