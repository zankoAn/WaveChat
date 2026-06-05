// ==================== DOM Elements ====================
const $ = {
    input: document.getElementById('chat-input-text'),
    logs: document.getElementById('chat-logs'),
    overlay: document.getElementById("sidebar-overlay"),
    fileUpload: document.getElementById('file-upload'),
    send: document.getElementById('chat-submit'),

};
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CHATS_KEY = "chats";
const PENDING_MSGS_KEY = "ws_pending";

