import json
import os
import random
import string
import time

from apps.chat.redis_cli import redis_client


USER_MESSAGES_KEY = "chat:user_messages:{}"
UNREAD_MESSAGES_KEY = "chat:unread_msgs:{}"
MESSAGES_TTL = 60 * 60 * 24 * 1


def save_user_message(
    sender: str,
    chat_id: str,
    text: str = "",
    input_file=None,
    msg_id=0,
    timestamp=0,
    save_storage=True,
    image_base64=False,
):
    msg_id = msg_id if msg_id else int(time.time() * 1000000)
    payload_data = {
        "timestamp": timestamp if timestamp else time.time(),
        "is_read": True,
        "msg_id": msg_id,
        "chat_id": chat_id,
        "sender": sender,
    }
    if text:
        payload_data["text"] = text

    if image_base64:
        payload_data["image"] = image_base64
        payload_data["type"] = "image"

    if input_file:
        input_file.seek(0)
        if "image" in input_file.name:
            file_name = "".join(random.choices(string.ascii_letters, k=20)) + ".jpg"
        else:
            file_name = input_file.name

        # TODO: May adjust it to cover more local storage method
        with open(f"media/{file_name}", "wb") as output:
            file_bytes = input_file.read()
            output.write(file_bytes)

        payload_data["image"] = f"/media/{file_name}"
        payload_data["type"] = "image"

    if text and input_file:
        payload_data["type"] = "mixed"

    payload = json.dumps(payload_data, ensure_ascii=False)
    pipe = redis_client.pipeline()

    if sender:
        key = USER_MESSAGES_KEY.format(sender)
        pipe.rpush(key, payload)
        pipe.expire(key, MESSAGES_TTL)
        channel = f"chat:{sender}"
        pipe.publish(channel, payload)
        pipe.execute()

    if chat_id and chat_id != "None":
        key = USER_MESSAGES_KEY.format(chat_id)
        pipe = redis_client.pipeline()
        pipe.rpush(key, payload)
        pipe.expire(key, MESSAGES_TTL)
        channel = f"chat:{chat_id}"
        pipe.publish(channel, payload)
        pipe.execute()

    if save_storage:
        save_locale_storage_msg(payload)


def get_chat_history(chat_id: str):
    user_key = USER_MESSAGES_KEY.format(chat_id)
    unread_key = UNREAD_MESSAGES_KEY.format(chat_id)

    unread_ids = redis_client.smembers(unread_key)
    user_msgs = redis_client.lrange(user_key, 0, -1)

    all_messages = []
    for msg_bytes in user_msgs:
        try:
            msg = (
                msg_bytes.decode("utf-8") if isinstance(msg_bytes, bytes) else msg_bytes
            )
            data = json.loads(msg)
            if str(data.get("msg_id")) in unread_ids:
                data["is_read"] = False
            else:
                data["is_read"] = True

            data["is_history"] = True
            all_messages.append(data)
        except:
            continue

    all_messages.sort(key=lambda x: x["timestamp"])
    return [json.dumps(msg) for msg in all_messages]


def mark_all_as_read(chat_id: str):
    unread_key = UNREAD_MESSAGES_KEY.format(chat_id)
    redis_client.delete(unread_key)
    return True


# TODO: May adjust it to cover more local storage method
def save_locale_storage_msg(payload):
    with open("msgs.json", "a") as _file:
        _file.write(payload + "\n")


# TODO: May adjust it to cover more local storage method
def load_locale_msg_storage():
    if os.path.exists("msgs.json"):
        with open("msgs.json") as _file:
            msgs = _file.readlines()
            for msg in msgs:
                msg = json.loads(msg)
                save_user_message(
                    msg["sender"],
                    msg["chat_id"],
                    msg.get("text"),
                    timestamp=msg["timestamp"],
                    save_storage=False,
                    image_base64=msg.get("image"),
                )
