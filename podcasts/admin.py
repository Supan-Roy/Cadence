from django.contrib import admin

from music.models import Genre
from .models import PodcastTrack


@admin.register(PodcastTrack)
class PodcastTrackAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "genre", "status", "release_date")
    list_filter = ("status", "explicit", "genre")
    search_fields = ("title", "artist__email")

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.filter(is_podcast=True)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "genre":
            kwargs["queryset"] = Genre.objects.filter(category=Genre.CATEGORY_PODCAST)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        obj.is_podcast = True
        super().save_model(request, obj, form, change)
