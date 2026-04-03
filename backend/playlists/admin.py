from django.contrib import admin
from .models import Playlist


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
	list_display = ("name", "user", "created_at", "updated_at")
	search_fields = ("name", "user__email")
	list_filter = ("created_at", "updated_at")
	readonly_fields = ("created_at", "updated_at")
