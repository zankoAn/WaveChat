from django.contrib import admin
from apps.account.models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "last_seen")
    list_display_links = ("id", "user")
    search_fields = ("user",)
    list_filter = ("status",)
