from django.urls import path
from .views import TrackUploadView

urlpatterns = [
    path("upload/", TrackUploadView.as_view(), name="track-upload"),
]

from .views import ApprovedTrackListView

urlpatterns = [
    path("upload/", TrackUploadView.as_view(), name="track-upload"),
    path("tracks/", ApprovedTrackListView.as_view(), name="approved-tracks"),
]

from .views import TrackDetailView

urlpatterns = [
    path("upload/", TrackUploadView.as_view(), name="track-upload"),
    path("tracks/", ApprovedTrackListView.as_view(), name="approved-tracks"),
    path("tracks/<uuid:pk>/", TrackDetailView.as_view(), name="track-detail"),
]

from .views import TrackStreamView

urlpatterns = [
    path("upload/", TrackUploadView.as_view(), name="track-upload"),
    path("tracks/", ApprovedTrackListView.as_view(), name="approved-tracks"),
    path("tracks/<uuid:pk>/", TrackDetailView.as_view(), name="track-detail"),
    path("tracks/<uuid:pk>/stream/", TrackStreamView.as_view(), name="track-stream"),
]

from .views import (
    PendingTrackListView,
    ApproveTrackView,
    RejectTrackView,
)

urlpatterns = [
    path("upload/", TrackUploadView.as_view()),
    path("tracks/", ApprovedTrackListView.as_view()),
    path("tracks/<uuid:pk>/", TrackDetailView.as_view()),
    path("tracks/<uuid:pk>/stream/", TrackStreamView.as_view()),

    # Moderation
    path("moderation/pending/", PendingTrackListView.as_view()),
    path("moderation/<uuid:pk>/approve/", ApproveTrackView.as_view()),
    path("moderation/<uuid:pk>/reject/", RejectTrackView.as_view()),
]
