from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.account.service import UserManager
from apps.chat.service import MessageService
from apps.chat.validators import InputFileValidator


@csrf_exempt
@require_http_methods(["POST"])
@login_required
def upload_file(request):
    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"error": "File not found"}, status=400)

    _is_valid, _msg = InputFileValidator().validate(file)
    if not _is_valid:
        return JsonResponse({"error": _msg}, status=413)

    sender = request.user
    receiver = request.POST.get("receiver")
    tmp_id = request.POST.get("tmpId")

    receiver_obj = UserManager().get_user(username=receiver)

    data = {"file_upload": file}
    msg, error = async_to_sync(MessageService().create_new_message)(
        sender, receiver_obj, data
    )
    if error:
        return JsonResponse({"success": False, "msg": error}, status=400)

    channel_layer = get_channel_layer()
    payload = {
        "type": "new_msg",
        "id": msg.id,
        "text": msg.text,
        "sender": sender.username,
        "receiver": receiver,
        "file": msg.file,
        "reply": None,
        "timestamp": msg.created.timestamp(),
        "is_read": msg.is_read,
        "reaction": None,
    }
    async_to_sync(channel_layer.group_send)(
        f"private_{receiver}", {"type": "ack_msg", "payload": payload}
    )
    return JsonResponse({"success": True, "url": msg.file, "id": tmp_id})
