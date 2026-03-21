import django_filters
from .models import Track


class TrackFilter(django_filters.FilterSet):
    genre = django_filters.CharFilter(
        field_name="genre__name",
        lookup_expr="iexact"
    )

    language = django_filters.CharFilter(
        field_name="language",
        lookup_expr="iexact"
    )

    explicit = django_filters.BooleanFilter()

    class Meta:
        model = Track
        fields = ["genre", "language", "explicit"]
