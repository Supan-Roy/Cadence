from django.urls import path

from .views import (
    ApproveTrackView,
    AlbumSuggestionView,
    ArtistSuggestionView,
    ApprovedTrackListView,
    CurrentTrackLyricsView,
    GenreListView,
    LatestReleaseNotificationsView,
    MyUploadsListView,
    MyUploadUpdateView,
    PendingTrackListView,
    PopularTracksView,
    RecentlyPlayedView,
    RejectTrackView,
    TrackDetailView,
    TrackStreamView,
    TrackUploadView,
    UploadMetadataPreviewView,
    TrendingTracksView,
    RecommendedTracksView,
    PodcastListView,
)

app_name = "music"

urlpatterns = [
    path("upload/", TrackUploadView.as_view(), name="track-upload"),
    path("upload/metadata/", UploadMetadataPreviewView.as_view(), name="track-upload-metadata"),
    path("my-uploads/", MyUploadsListView.as_view(), name="my-uploads"),
    path("my-uploads/<uuid:pk>/", MyUploadUpdateView.as_view(), name="my-upload-update"),
    path("artists/suggest/", ArtistSuggestionView.as_view(), name="artist-suggestions"),
    path("albums/suggest/", AlbumSuggestionView.as_view(), name="album-suggestions"),
    path("lyrics/current/", CurrentTrackLyricsView.as_view(), name="current-track-lyrics"),
    path("genres/", GenreListView.as_view(), name="genre-list"),
    path("notifications/releases/", LatestReleaseNotificationsView.as_view(), name="latest-release-notifications"),
    path("tracks/", ApprovedTrackListView.as_view(), name="approved-tracks"),
    path("tracks/popular/", PopularTracksView.as_view(), name="popular-tracks"),
    path("tracks/<uuid:pk>/", TrackDetailView.as_view(), name="track-detail"),
    path("tracks/<uuid:pk>/stream/", TrackStreamView.as_view(), name="track-stream"),
    path("recent/", RecentlyPlayedView.as_view(), name="recent-tracks"),
    path("moderation/pending/", PendingTrackListView.as_view(), name="pending-tracks"),
    path("moderation/<uuid:pk>/approve/", ApproveTrackView.as_view(), name="approve-track"),
    path("moderation/<uuid:pk>/reject/", RejectTrackView.as_view(), name="reject-track"),
    path("tracks/trending/", TrendingTracksView.as_view(), name="trending-tracks"),
    path("recommend/", RecommendedTracksView.as_view(), name="recommend-tracks"),
    path("podcasts/", PodcastListView.as_view(), name="podcasts"),
]