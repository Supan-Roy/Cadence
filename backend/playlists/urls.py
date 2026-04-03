from django.urls import path

from .views import PlaylistAddTrackView, PlaylistDetailView, PlaylistListCreateView, PlaylistRemoveTrackView

app_name = "playlists"

urlpatterns = [
    path("", PlaylistListCreateView.as_view(), name="playlist-list-create"),
    path("<uuid:pk>/", PlaylistDetailView.as_view(), name="playlist-detail"),
    path("<uuid:pk>/add-track/", PlaylistAddTrackView.as_view(), name="playlist-add-track"),
    path("<uuid:pk>/remove-track/", PlaylistRemoveTrackView.as_view(), name="playlist-remove-track"),
]
