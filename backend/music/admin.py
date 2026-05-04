from django.contrib import admin

from .models import Genre, RadioBroadcastSession, RadioQueueItem, Track


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
	list_display = ("name", "category")
	list_filter = ("category",)
	search_fields = ("name",)


@admin.register(Track)
class MusicTrackAdmin(admin.ModelAdmin):
	list_display = ("title", "artist", "genre", "status", "release_date")
	list_filter = ("status", "explicit", "genre")
	search_fields = ("title", "artist__email")

	def get_queryset(self, request):
		queryset = super().get_queryset(request)
		return queryset.filter(is_podcast=False)

	def formfield_for_foreignkey(self, db_field, request, **kwargs):
		if db_field.name == "genre":
			kwargs["queryset"] = Genre.objects.filter(category=Genre.CATEGORY_MUSIC)
		return super().formfield_for_foreignkey(db_field, request, **kwargs)

	def save_model(self, request, obj, form, change):
		obj.is_podcast = False
		super().save_model(request, obj, form, change)


@admin.register(RadioQueueItem)
class RadioQueueItemAdmin(admin.ModelAdmin):
	list_display = ("position", "track", "added_by", "created_at")
	list_filter = ("created_at",)
	search_fields = ("track__title", "track__artist__email")
	ordering = ("position", "created_at")


@admin.register(RadioBroadcastSession)
class RadioBroadcastSessionAdmin(admin.ModelAdmin):
	list_display = ("id", "status", "started_by", "started_at", "stopped_by", "stopped_at", "ffmpeg_pid")
	list_filter = ("status", "created_at")
	search_fields = ("started_by__email", "stopped_by__email")
