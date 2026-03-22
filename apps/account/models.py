from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Profile(models.Model):
    class Status(models.TextChoices):
        ONLINE = "online", "Online"
        OFFLINE = "offline", "Offline"
        BUSY = "busy", "Busy"
        LASTSEEN = "LastSeen", "lastSeen"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.OFFLINE
    )
    last_seen = models.DateTimeField(null=True, blank=True, default=timezone.now)
    active_chat = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_chat",
    )
