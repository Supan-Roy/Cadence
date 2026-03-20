from django.urls import path

from .views import (
    ApproveTrackView,
    ApprovedTrackListView,
    PendingTrackListView,
    PopularTracksView,
    RecentlyPlayedView,
    RejectTrackView,
    TrackDetailView,
    TrackStreamView,
    TrackUploadView,
    TrendingTracksView,
    RecommendedTracksView,
)

app_name = "music"

urlpatterns = [
    path("upload/", TrackUploadView.as_view(), name="track-upload"),
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

]