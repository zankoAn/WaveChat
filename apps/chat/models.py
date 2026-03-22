import time
from datetime import datetime
from datetime import timezone as tz

from django.conf import settings
from django.db import models
from django.utils import timezone


def from_msg_id():
    ts = int(time.time() * 1_000_000)
    return datetime.fromtimestamp(ts / 1_000_000, tz=tz.utc)


class Message(models.Model):
    text = models.TextField()
    file = models.CharField(max_length=400, null=True, blank=True)
    is_read = models.BooleanField(default=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="smessages"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rmessages"
    )
    created = models.DateTimeField(default=from_msg_id, editable=True)
    reply_to_message_id = models.ForeignKey(
        "self", on_delete=models.CASCADE, related_name="replies", null=True, blank=True
    )

    class Meta:
        indexes = [
            models.Index(fields=["sender", "receiver", "created"]),
            models.Index(fields=["receiver", "sender", "created"]),
            models.Index(fields=["receiver", "sender", "is_read"]),
        ]

    def __str__(self) -> str:
        return f"{self.text[:40]}"


class MessageReaction(models.Model):
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="reactions"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reactions",
    )
    emoji = models.CharField(max_length=10)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ["message", "user", "emoji"]

    def __str__(self):
        return f"{self.user} → {self.emoji} on {self.message}"
