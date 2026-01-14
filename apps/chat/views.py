import json
import time

from apps.chat.decorator import sse_cleanup, sse_rate_limit
from apps.chat.redis_cli import redis_client
from apps.chat.service import (
    get_chat_history,
    mark_all_as_read,
    save_user_message,
)
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from utils.load_env import CONFIG

default_reciver_id = CONFIG.DEFAULT_RECIVER_ID


def sse_chat_room(chat_id):
    channel = f"chat:{chat_id}"

    def event_stream():
        pubsub = redis_client.pubsub()
        pubsub.subscribe(channel)

        for msg in get_chat_history(chat_id):
            yield f"data: {msg}\n\n"
            time.sleep(0.01)

        yield ": connection established\n\n"

        last_heartbeat = time.time()

        try:
            for message in pubsub.listen():
                if time.time() - last_heartbeat > 15:
                    yield ": heartbeat\n\n"
                    last_heartbeat = time.time()

                if not message or message["type"] != "message":
                    continue

                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")

                yield f"data: {data}\n\n"
                last_heartbeat = time.time()

        except GeneratorExit:
            sse_cleanup(chat_id)
        finally:
            try:
                pubsub.unsubscribe(channel)
                pubsub.close()
            except:
                pass

    response = StreamingHttpResponse(
        event_stream(), content_type="text/event-stream; charset=utf-8"
    )
    response["Cache-Control"] = "no-cache, no-store"
    response["X-Accel-Buffering"] = "no"
    return response


@csrf_exempt
@require_http_methods(["GET", "POST"])
@sse_rate_limit
def chat_stream(request):
    """
    Single endpoint for both SSE connection and sending messages.
    - GET  ?chat_id=xxx   → opens SSE stream (private room)
    - POST {message: "..."} → sends message to user's own stream + Telegram
    """
    sender = request.COOKIES.get("chat_id")
    if sender != default_reciver_id:
        redis_client.set("reciver", sender)

    if request.method == "GET":
        return sse_chat_room(sender)

    elif request.method == "POST":
        if request.content_type == "application/json":
            try:
                data = json.loads(request.body)
                text = data.get("message", "").strip()
                input_file = None
            except json.JSONDecodeError:
                return JsonResponse({"error": "invalid json"}, status=400)
        else:
            input_file = request.FILES.get("image")
            text = request.POST.get("message", "").strip()

        if not text and not input_file:
            return JsonResponse({"error": "empty message or image"}, status=400)

        if sender != default_reciver_id:
            save_user_message(sender, default_reciver_id, text, input_file)
        else:
            reciver = redis_client.get("reciver")
            save_user_message(default_reciver_id, reciver, text, input_file)

        resp = JsonResponse({"status": "sent"})
        return resp


@csrf_exempt
@require_http_methods(["POST"])
def trigger_history_resend(request):
    data = json.loads(request.body)
    chat_id = data.get("chat_id")
    if chat_id:
        redis_client.publish(f"chat:{chat_id}", json.dumps({"type": "resend_history"}))
        for msg in get_chat_history(chat_id):
            redis_client.publish(f"chat:{chat_id}", msg)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def mark_as_read(request: dict):
    chat_id = request.COOKIES.get("chat_id")
    if not chat_id:
        return JsonResponse({"error": "chat_id parameter required"}, status=400)

    mark_all_as_read(chat_id)
    return JsonResponse({"status": "ok"})
