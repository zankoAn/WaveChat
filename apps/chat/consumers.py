import hashlib
from dataclasses import dataclass

from channels.generic.websocket import (
    AsyncJsonWebsocketConsumer,
)
from django.contrib.auth import get_user_model
from django.utils import timezone as dj_tz

from apps.account.models import Profile
from apps.account.service import UserManager
from apps.chat.models import MessageReaction
from apps.chat.service import MessageService
from utils.custom_logger import BaseLogger

User = get_user_model()
logger = BaseLogger(__name__)


@dataclass
class ChatParticipant:
    username: str = ""
    profile: Profile = None
    user: "User" = None


class ChatConsumer(AsyncJsonWebsocketConsumer, UserManager):
    def __init__(self):
        super().__init__()
        self.chats = []
        self.msg_service = MessageService()
        self.group_name = None
        self.msg_type = ""
        self.sender = ChatParticipant()
        self.receiver = ChatParticipant()
        self.active_groups = set()

    async def connect(self):
        if not self.scope["user"].is_authenticated:
            await self.close()
            return

        await self.accept()

    async def disconnect(self, code):
        await self.remove_all_groups()

        if self.sender.profile:
            await self.update_user_profile(
                self.sender.profile,
                status=Profile.Status.OFFLINE,
                last_seen=dj_tz.now(),
            )

    @staticmethod
    def build_group_name(u1: str, u2: str) -> str:
        if u1 > u2:
            u1, u2 = u2, u1

        combined = f"{u1}:{u2}"
        hash_val = hashlib.sha256(combined.encode()).hexdigest()[:16]
        return f"chat_priv_{hash_val}"

    async def add_to_group(self, group_name):
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.active_groups.add(group_name)

    async def remove_all_groups(self):
        for group in list(self.active_groups):
            await self.channel_layer.group_discard(group, self.channel_name)

        self.active_groups.clear()

    async def remove_chat_groups(self):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            self.active_groups.discard(self.group_name)

    async def initialize(self, content):
        self.chats = content.get("chats", [])
        sender = self.scope["user"]
        receiver_username = content.get("receiver").lower()
        if not sender.is_active or not receiver_username:
            await self.safe_send_json(
                {"error": "The sender or receiver has not been sent"}
            )
            await self.close()
            return False

        if not self.sender.username or self.sender.username != sender.username:
            sender_profile = await self.get_user_profile(sender.username)
            if not sender_profile:
                return False

            self.sender = ChatParticipant(
                sender.username, sender_profile, sender_profile.user
            )
            await self.add_to_group(f"private_{sender.username}")

        if not self.receiver.username or self.receiver.username != receiver_username:
            receiver_profile = await self.get_user_profile(receiver_username)
            if not receiver_profile:
                await self.safe_send_json({"error": "Receiver not found"})
                return False

            await self.remove_chat_groups()

            self.receiver = ChatParticipant(
                receiver_username, receiver_profile, receiver_profile.user
            )
            self.group_name = self.build_group_name(sender.username, receiver_username)
            await self.add_to_group(self.group_name)
            await self.update_user_profile(
                profile=self.sender.profile,
                status=Profile.Status.ONLINE,
                active_chat=receiver_profile.user,
                last_seen=dj_tz.now(),
            )

        return True

    async def receive_json(self, content):
        action = content.get("action")
        scroll_type = "end_msgs"
        self.msg_type = "history_msg"

        if not await self.initialize(content):
            return

        if action == "initialize":
            self.msg_type = "initialize_msg"
            await self.handle_initialize()
            await self.channel_layer.group_send(
                f"private_{self.sender.username}", {"type": "unread_count_per_chat"}
            )

        if action == "get_history":
            await self.get_chat_history()

        if action == "load_more_history":
            before_ts = content.get("beforeTs", 0)
            await self.get_chat_history(before_ts=before_ts)
            return

        if action == "new_msg":
            self.msg_type = "new_msg"
            await self.save_new_msg(content)
            return

        if action == "reaction":
            await self.manage_msg_reaction(content)
            return

        await self.safe_send_json({"type": "end_msgs", "scroll_type": scroll_type})

    async def handle_initialize(self, limit=1):
        chats = [item["chat"].lower() for item in self.chats]
        msgs = await self.msg_service.aget_last_messages_per_chat(
            self.sender.username, chats, limit
        )
        async for msg in msgs:
            serialized_data = await self.serializer(msg)
            await self.safe_send_json(serialized_data)

    async def serializer(self, msg):
        payload = {
            "type": self.msg_type,
            "id": msg.id,
            "text": msg.text,
            "sender": msg.sender.username,
            "receiver": msg.receiver.username,
            "file": msg.file,
            "reply": None,
            "timestamp": msg.created.timestamp(),
            "is_read": msg.is_read,
            "reactions": None,
            "unread_count": 0,
        }
        if await msg.reactions.aexists():
            reactions_by_user = {}
            async for reaction in msg.reactions.all().select_related("user"):
                username = reaction.user.username
                if reactions_by_user.get(username):
                    reactions_by_user[username].append(reaction.emoji)
                else:
                    reactions_by_user[username] = [reaction.emoji]

            payload["reactions"] = [
                {"sender": u, "emojis": e} for u, e in reactions_by_user.items()
            ]

        if msg.reply_to_message_id:
            reply_msg = msg.reply_to_message_id
            payload["reply"] = {
                "id": reply_msg.id,
                "preview": reply_msg.text[:50]
                if reply_msg.text
                else "هنوز لود نشده...",
            }

        return payload

    async def mark_messages_as_seen(self):
        has_incoming = await self.msg_service.amark_messages_as_read(
            sender=self.receiver.profile.user_id, receiver=self.sender.profile.user_id
        )
        if has_incoming:
            await self.channel_layer.group_send(
                f"private_{self.receiver.username}", {"type": "seen_chat"}
            )

        if (
            self.receiver.profile.status == Profile.Status.ONLINE
            and self.receiver.profile.active_chat == self.sender.profile.user_id
        ):
            has_outgoing = await self.msg_service.amark_messages_as_read(
                sender=self.sender.profile.user_id,
                receiver=self.receiver.profile.user_id,
            )
            if has_outgoing:
                await self.channel_layer.group_send(
                    f"private_{self.sender.username}", {"type": "seen_chat"}
                )

    async def get_chat_history(self, before_ts=0, limit=10):
        await self.mark_messages_as_seen()
        messages = await self.msg_service.aget_chat_history(
            self.sender.username, self.receiver.username, limit, before_ts
        )
        async for msg in messages:
            serialized_data = await self.serializer(msg)
            await self.safe_send_json(serialized_data)

    async def manage_msg_reaction(self, content):
        msg_id = content.get("message_id")
        emoji = content.get("emoji")
        action_type = content.get("type")
        data = {
            "type": "ack_msg",
            "payload": {
                "type": "reaction_update",
                "reaction": {"sender": self.sender.username, "emoji": emoji},
                "status": action_type,
                "id": msg_id,
            },
        }
        if action_type == "add":
            msg = await self.msg_service.aget_message_by_id(int(msg_id))
            if msg:
                await MessageReaction.objects.acreate(
                    message=msg, user=self.sender.user, emoji=emoji
                )
            await self.channel_layer.group_send(
                f"private_{self.receiver.username}", data
            )

        if action_type == "del":
            await MessageReaction.objects.filter(
                message__id=msg_id, emoji=emoji
            ).adelete()
            await self.channel_layer.group_send(
                f"private_{self.receiver.username}", data
            )

    async def save_new_msg(self, data):
        msg, error = await self.msg_service.create_new_message(
            self.sender.user, self.receiver.user, data
        )
        if error:
            await self.send_json({"type": "error", "message": msg})
            return

        serialized_data = await self.serializer(msg)

        await self.channel_layer.group_send(
            f"private_{self.sender.username}",
            {
                "type": "ack_msg",
                "payload": {
                    "type": "ack",
                    "id": msg.pk,
                    "tmp_id": data.get("tmp_id"),
                    "url": msg.file.url if msg.file else None,
                },
            },
        )
        await self.channel_layer.group_send(
            f"private_{self.receiver.username}",
            {"type": "ack_msg", "payload": serialized_data},
        )
        await self.mark_messages_as_seen()

    # ==========================
    async def safe_send_json(self, content):
        try:
            await self.send_json(content)
        except RuntimeError as exc:
            if "websocket" in str(exc) and (
                "close" in str(exc) or "closed" in str(exc)
            ):
                logger.error(f"Safe ignore: send after close → {exc}")
                return
            raise

    async def seen_chat(self, _):
        data = {"type": "seen_chat", "is_seen": True}
        await self.safe_send_json(data)

    async def profile_status(self, event):
        data = {
            "type": "user_status",
            "status": event["status"],
            "user": self.receiver.username,
        }
        await self.safe_send_json(data)

    async def ack_msg(self, event):
        await self.safe_send_json(event["payload"])

    async def unread_count_per_chat(self, _):
        data = {"type": "unread_chats", "chats": {}}
        chats = [item["chat"].lower() for item in self.chats]
        for chat in chats:
            data["chats"][chat] = await self.msg_service.aget_unread_count(
                self.sender.profile.user_id, chat
            )
        await self.safe_send_json(data)
