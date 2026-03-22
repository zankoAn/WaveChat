from django.urls import path

from apps.chat.views import upload_file

app_name = "chat"
urlpatterns = [
    path("upload/", upload_file, name="upload-file"),
]
