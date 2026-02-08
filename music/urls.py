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
