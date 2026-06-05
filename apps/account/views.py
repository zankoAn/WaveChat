import json

from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.account.service import UserManager


@method_decorator(csrf_exempt, name="dispatch")
class ApiRegisterView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")
            if not username or not password:
                return JsonResponse(
                    {"error": "Username and Password required"}, status=400
                )

            user = UserManager().register_new_user(username, password)
            if not user:
                return JsonResponse({"error": "Username allready exists."}, status=400)

            login(request, user)

            return JsonResponse(
                {"message": "New user successfully created"}, status=201
            )

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid data."}, status=400)


@method_decorator(csrf_exempt, name="dispatch")
class ApiLoginView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")
            if not username or not password:
                return JsonResponse(
                    {"error": "Username and Password required"}, status=400
                )

            user = authenticate(request, username=username, password=password)
            if user is not None:
                if user.is_active:
                    login(request, user)
                    return JsonResponse(
                        {
                            "message": "Login successfull.",
                            "username": user.username,
                        },
                        status=200,
                    )

            return JsonResponse({"error": "User not found or deactivated."}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid data."}, status=400)
