from django.contrib import admin
from django.contrib import messages
from django.utils import timezone
from .models import User, DeviceSession


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "role", "is_active", "is_banned")
    list_filter = ("role", "is_active", "is_banned")
    search_fields = ("email", "name")
    actions = ("ban_selected_users", "unban_selected_users")

    fieldsets = (
        ("Account", {"fields": ("email", "password", "name", "role")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser", "is_banned", "ban_reason")}),
        ("Profile", {"fields": ("profile_image",)}),
        ("Important dates", {"fields": ("last_login", "date_joined", "created_at")}),
    )
    readonly_fields = ("last_login", "date_joined", "created_at")

    def save_model(self, request, obj, form, change):
        was_banned = False
        if change and obj.pk:
            previous = User.objects.filter(pk=obj.pk).values("is_banned").first()
            was_banned = bool(previous and previous["is_banned"])

        super().save_model(request, obj, form, change)

        if obj.is_banned and not was_banned:
            DeviceSession.objects.filter(user=obj, is_active=True).update(is_active=False, revoked_at=timezone.now())

    @admin.action(description="Ban selected users")
    def ban_selected_users(self, request, queryset):
        target_qs = queryset.exclude(is_banned=True)
        user_ids = list(target_qs.values_list("id", flat=True))
        updated = target_qs.update(is_banned=True)

        if user_ids:
            DeviceSession.objects.filter(user_id__in=user_ids, is_active=True).update(
                is_active=False,
                revoked_at=timezone.now(),
            )

        self.message_user(
            request,
            f"{updated} user(s) banned and active sessions revoked.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Unban selected users")
    def unban_selected_users(self, request, queryset):
        updated = queryset.filter(is_banned=True).update(is_banned=False, ban_reason="")
        self.message_user(
            request,
            f"{updated} user(s) unbanned.",
            level=messages.SUCCESS,
        )
