from django.conf.urls.static import static
from django.contrib import admin
from django.db.utils import settings
from django.shortcuts import render
from django.urls import include, path


def home(request):
    return render(request, "base.html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", home),
    path("chat/", include("apps.chat.urls", namespace="chat")),
    path("auth/", include("apps.account.urls", namespace="auth")),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
