from django.urls import path

from apps.account.views import ApiLoginView, ApiRegisterView

app_name = "account"
urlpatterns = [
    path("login/", ApiLoginView.as_view(), name="login"),
    path("register/", ApiRegisterView.as_view(), name="register"),
]
