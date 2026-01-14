from apps.chat.service import load_locale_msg_storage
from django.apps import AppConfig
from utils.load_env import CONFIG


class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.chat"

    if CONFIG.LOAD_SIMPLE_LOCALE_MSG_STORAGE:
        load_locale_msg_storage()
