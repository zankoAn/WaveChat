from django.contrib import admin

from apps.chat.models import Message, MessageReaction


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "is_read", "created", "_text")
    list_display_links = ("id", "sender", "receiver")
    search_fields = ("sender", "receiver")
    list_filter = ("is_read",)

    @staticmethod
    def _text(obj):
        return obj.text[:30]


@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ("id", "message__id", "user", "message", "emoji")
    list_display_links = ("id", "user", "message")
    search_fields = ("id", "user", "message")
