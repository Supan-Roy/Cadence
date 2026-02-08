from django.shortcuts import render

# Create your views here.
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Track
from .serializers import TrackUploadSerializer
from .permissions import IsArtist


class TrackUploadView(generics.CreateAPIView):
    queryset = Track.objects.all()
    serializer_class = TrackUploadSerializer
    permission_classes = [IsAuthenticated, IsArtist]


from rest_framework import generics
from rest_framework.permissions import AllowAny
from .serializers import TrackListSerializer, TrackDetailSerializer


class ApprovedTrackListView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Track.objects.filter(status="approved").select_related("artist", "genre")

class TrackDetailView(generics.RetrieveAPIView):
    serializer_class = TrackDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Track.objects.filter(status="approved").select_related("artist", "genre")

from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

class TrackStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            track = Track.objects.get(pk=pk, status="approved")
        except Track.DoesNotExist:
            raise Http404("Track not found")

        response = FileResponse(track.audio_file.open("rb"), content_type="audio/mpeg")
        response["Content-Disposition"] = f'inline; filename="{track.title}.mp3"'
        return response
