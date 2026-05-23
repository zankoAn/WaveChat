import uuid
from datetime import datetime, timezone
from pathlib import Path

from asgiref.sync import sync_to_async
from django.core.files.base import ContentFile
from django.db.models import Case, F, Q, When, Window
from django.db.models.fields.files import default_storage
from django.db.models.functions import RowNumber

from apps.chat.models import Message
from apps.chat.validators import InputFileValidator


class MessageService:
    def __init__(self):
        self._store_file_sync = sync_to_async(self._store_file)

    @staticmethod
    def _store_file(file_bytes: bytes, original_filename: str) -> str:
        """
        file name: random_prefix + "_" + sanitized_original_name
        """
        if not original_filename:
            original_filename = "file"

        path = Path(original_filename)
        stem = path.stem
        ext = path.suffix.lower()
        # random_prefix = uuid.uuid4().hex[:6]
        # final_name = f"{random_prefix}_{stem}{ext}"
        final_name = f"{stem}{ext}"
        saved_path = default_storage.save(final_name, ContentFile(file_bytes))
        return default_storage.url(saved_path)

    @staticmethod
    async def amark_messages_as_read(sender, receiver) -> int:
        updated_count = await Message.objects.filter(
            receiver=receiver, sender=sender, is_read=False
        ).aupdate(is_read=True)
        return updated_count

    @staticmethod
    async def aget_message_by_id(msg_id: int) -> Message | None:
        try:
            return await Message.objects.select_related(
                "reply_to_message_id", "receiver", "sender"
            ).aget(id=msg_id)
        except Message.DoesNotExist:
            return None

    @staticmethod
    async def aget_last_messages_per_chat(
        current_user, chats, limit_per_chat: int = 1, chats_limit: int = 50
    ):
        qs = (
            Message.objects.filter(
                Q(sender__username=current_user) & Q(receiver__username__in=chats)
                | Q(receiver__username=current_user) & Q(sender__username__in=chats)
            )
            .select_related("reply_to_message_id", "receiver", "sender")
            .annotate(
                other_person=Case(
                    When(
                        sender__username=current_user,
                        then=F("receiver__username"),
                    ),
                    default=F("sender__username"),
                )
            )
            .annotate(
                rn=Window(
                    expression=RowNumber(),
                    partition_by="other_person",
                    order_by=F("created").desc(),
                )
            )
            .filter(rn__lte=limit_per_chat)
            .order_by("-created")[:chats_limit]
        )
        return qs.filter()

    @staticmethod
    async def aget_chat_history(
        sender,
        receiver,
        limit: int = 50,
        before_ts: int | None = None,
    ):
        qs = (
            Message.objects.select_related("reply_to_message_id", "receiver", "sender")
            .filter(
                Q(sender=sender, receiver=receiver)
                | Q(sender=receiver, receiver=sender)
            )
            .order_by("-created")
        )

        if before_ts:
            dt = datetime.fromtimestamp(float(before_ts), tz=timezone.utc)
            qs = qs.filter(created__lt=dt)

        qs = qs[:limit]

        messages = qs.filter()
        return messages

    @staticmethod
    async def aget_unread_count(current_user, chat):
        m = (
            await Message.objects.select_related("receiver", "sender")
            .filter(receiver=current_user, sender__username__iexact=chat, is_read=False)
            .filter(is_read=False)
            .acount()
        )
        return m

    async def create_new_message(
        self, sender, receiver, data: dict
    ) -> tuple[Message | None, str | None]:
        file_path = ""
        if file_upload := data.get("file_upload"):
            is_valid, error_msg = InputFileValidator().validate(file_upload)
            if not is_valid:
                return None, error_msg

            file_name = data["file_upload"].name.replace(" ", "_")
            file_bytes = file_upload.read()
            file_path = await self._store_file_sync(file_bytes, file_name)

        reply_to = None
        if reply_id := data.get("reply_id"):
            try:
                reply_to = await Message.objects.select_related(
                    "receiver", "sender"
                ).aget(id=int(reply_id))
            except Message.DoesNotExist:
                pass

        msg = await Message.objects.acreate(
            text=data.get("text", ""),
            file=file_path,
            sender=sender,
            receiver=receiver,
            reply_to_message_id=reply_to,
            is_read=False,
        )
        return msg, None
