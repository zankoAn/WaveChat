import functools

from apps.chat.redis_cli import redis_client
from django.http import JsonResponse

GLOBAL_ACTIVE_KEY = "sse:global:active_count"
GLOBAL_MAX_CONCURRENT = 50
PER_USER_MAX_CONCURRENT = 50
GLOBAL_COUNTER_TTL = 600
POST_MESSAGES_PER_MINUTE = 100


def sse_rate_limit(view_func):
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        chat_id = request.COOKIES.get("chat_id")
        if not chat_id:
            return JsonResponse({"error": "chat_id parameter required"}, status=400)

        if request.method == "GET":
            user_key = f"sse:user_active:{chat_id}"
            count = redis_client.incr(user_key)

            count = redis_client.incr(GLOBAL_ACTIVE_KEY)
            redis_client.expire(GLOBAL_ACTIVE_KEY, GLOBAL_COUNTER_TTL)
            if count > GLOBAL_MAX_CONCURRENT:
                redis_client.decr(GLOBAL_ACTIVE_KEY)
                return JsonResponse({"error": "Server is busy"}, status=429)

            return view_func(request, *args, **kwargs)

        if request.method == "POST":
            count = redis_client.incr(f"post_count:{chat_id}")
            if count == 1:
                redis_client.expire(f"post_count:{chat_id}", 60)

            if count > POST_MESSAGES_PER_MINUTE:
                return JsonResponse(
                    {"error": "Too many messages! Wait a minute."}, status=429
                )

            return view_func(request, *args, **kwargs)

    return wrapper


def sse_cleanup(identifier):
    user_key = f"sse:user_active:{identifier}"
    redis_client.delete(user_key)
    redis_client.decr(GLOBAL_ACTIVE_KEY)
