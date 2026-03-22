import { addMessage } from "./MessageBubble.js";

// ────────────────────────────────────────────────
// User & Chat Partner
// ────────────────────────────────────────────────
export function getSenderUsername() {
  let user = localStorage.getItem("sender")?.toLowerCase()?.trim();

  if (!user) {
    user = localStorage.getItem("chat_id")?.toLowerCase()?.trim();
    if (user) {
      localStorage.setItem("sender", user);
      localStorage.removeItem("chat_id");
    }
  }

  const validPattern = /^[a-zA-Z0-9]+$/;
  if (!user || !validPattern.test(user) || user === "null") {
    document.getElementById("userModal")?.classList.replace("hidden", "flex");
    return null;
  }

  if (!localStorage.getItem("receiver")) {
    localStorage.setItem("receiver", user);
    document.cookie = `receiver=zanko; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  if (user === "par" || user === "ram") {
    document.querySelector(".chat-input-area")?.style.setProperty("padding-bottom", "180px");
  }

  return user;
}

export function getReceiverUsername() {
  return localStorage.getItem("receiver") || null;
}

export function setCurrentUser(username) {
  if (username) localStorage.setItem("sender", username.toLowerCase().trim());
}

export function setCurrentChatPartner(username) {
  if (username) localStorage.setItem("receiver", username.toLowerCase().trim());
}

// ────────────────────────────────────────────────
// Cache Helpers
// ────────────────────────────────────────────────

function getChatCacheKey(otherUser) {
  const me = getSenderUsername();
  if (!me || !otherUser) return null;
  const users = [me, otherUser.toLowerCase().trim()].sort();
  return `chat_messages_${users[0]}_${users[1]}`;
}

function setWithExpiry(key, value, ttlMinutes = 1440) {
  const item = {
    value,
    expiry: Date.now() + ttlMinutes * 60 * 1000,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

function getWithExpiry(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

// ────────────────────────────────────────────────
// Messages Cache
// ────────────────────────────────────────────────

export function saveMessagesToCacheToCache(otherUser, messages, ttlMinutes = 1440) {
  try {
    const key = getChatCacheKey(otherUser);
    if (!key) return;
    setWithExpiry(key, messages, ttlMinutes);
  } catch (err) {
    console.warn("Failed to save messages to cache", err);
  }
}

export function getMessagesFromCache(otherUser) {
  try {
    const key = getChatCacheKey(otherUser);
    if (!key) return [];
    return getWithExpiry(key) ?? [];
  } catch (err) {
    console.warn("Failed to read messages from cache", err);
    return [];
  }
}

export function addMessageToCache(otherUser, msgData) {
  const messages = getMessagesFromCache(otherUser);

  const isDuplicate = messages.some((m) => {
    if (msgData.id && m.id) return m.id === msgData.id;
    if (msgData.tmp_id && m.tmp_id) return m.tmp_id === msgData.tmp_id;
    return false;
  });

  if (isDuplicate) return;

  messages.push({ ...msgData });
  messages.sort((a, b) => a.timestamp - b.timestamp);

  saveMessagesToCacheToCache(otherUser, messages);
}

export function renderCachedMessagesIfOffline(chatPartner) {
  if (state.ws?.readyState === WebSocket.OPEN) return;

  const messages = getMessagesFromCache(chatPartner);
  if (messages.length === 0) return;

  $.logs.innerHTML = "";

  state.IsfromCache = true;
  try {
    messages.forEach((msg) => {
      const wrapper = addMessage(msg);
      if (wrapper) $.logs.appendChild(wrapper);
    });
  } finally {
    state.IsfromCache = false;
  }

  scrollToBottom?.();
}

// ────────────────────────────────────────────────
// Chat List
// ────────────────────────────────────────────────

function normalizeChatName(name) {
  return (name || "").trim().toLowerCase();
}

export function getChatList() {
  try {
    const data = localStorage.getItem(CHATS_KEY);
    if (!data) return [];

    let list = JSON.parse(data);
    if (!Array.isArray(list)) list = [];

    if (ROOT_CHAT && !list.some((c) => normalizeChatName(c.chat) === ROOT_CHAT)) {
      list.push({ chat: ROOT_CHAT });
      localStorage.setItem(CHATS_KEY, JSON.stringify(list));
    }

    return list;
  } catch (err) {
    console.warn("Failed to read chat list", err);
    return [];
  }
}

export function addToChatList(chatName) {
  const normalized = normalizeChatName(chatName);
  if (!normalized) return;

  try {
    const list = getChatList();
    if (list.some((c) => normalizeChatName(c.chat) === normalized)) return;

    list.push({ chat: normalized });
    localStorage.setItem(CHATS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Failed to add to chat list", err);
  }
}

export function deleteFromChatList(chatName) {
  const normalized = normalizeChatName(chatName);
  if (!normalized) return;

  try {
    let list = getChatList();
    list = list.filter((c) => normalizeChatName(c.chat) !== normalized);
    localStorage.setItem(CHATS_KEY, JSON.stringify(list));
    deleteChatFromOrder(chatName);
  } catch (err) {
    console.warn("Failed to delete from chat list", err);
  }
}

export function saveChatList(chats) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (err) {
    console.warn("Failed to save chat list", err);
  }
}

// ────────────────────────────────────────────────
// Pending Messages
// ────────────────────────────────────────────────

export function getPendingMessages() {
  const data = localStorage.getItem(PENDING_MSGS_KEY);

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Pending messages corrupted → clearing", err);
    localStorage.removeItem(PENDING_MSGS_KEY);
    return [];
  }
}

export function savePendingMessages(messages) {
  if (!Array.isArray(messages)) {
    console.warn("savePendingMessages: input is not array");
    return;
  }
  try {
    localStorage.setItem(PENDING_MSGS_KEY, JSON.stringify(messages));
  } catch (err) {
    console.error("Failed to save pending messages", err);
  }
}

export function clearPendingMessages() {
  localStorage.removeItem(PENDING_MSGS_KEY);
}

// ────────────────────────────────────────────────
// Chat Order
// ────────────────────────────────────────────────

export function saveChatOrder(order) {
  try {
    localStorage.setItem("chatOrder", JSON.stringify(order));
  } catch (err) {
    console.warn("Failed to save chat order", err);
  }
}

export function loadChatOrder() {
  try {
    const data = localStorage.getItem("chatOrder");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function deleteChatFromOrder(chat) {
  try {
    const currentOrder = loadChatOrder();

    if (!Array.isArray(currentOrder) || currentOrder.length === 0) {
      return false;
    }

    const newOrder = currentOrder.filter(name => name !== chat);
    if (newOrder.length === currentOrder.length) {
      return false;
    }

    saveChatOrder(newOrder);
    return true;

  } catch (err) {
    console.warn("Failed to delete chat from order", err);
    return false;
  }
}