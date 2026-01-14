from django.urls import path
from . import views

app_name = "chat"
urlpatterns = [
    path("", views.chat_stream, name="stream"),
    path("resend/", views.trigger_history_resend, name="resend-chat"),
    path("mark_as_read/", views.mark_as_read, name="mark-read"),
]
