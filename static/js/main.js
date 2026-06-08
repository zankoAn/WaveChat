import { closeReply } from "./replyManager.js";
import { handleIncomingReaction } from "./reaction.js";
import { uploadFileFromClipboard, uploadFileFromLocal } from "./fileUploader.js";
import {
  getChatList,
  getReceiverUsername,
  getSenderUsername,
  getPendingMessages,
  savePendingMessages,
  clearPendingMessages,
  renderCachedMessagesIfOffline,
} from "./cache.js"
import {
  clickOnChat,
  addChatNameToSideBar,
  updateChatUndreadCount,
  UpdateChatMetadata
} from "./chatListManager.js";
import {
  addMessage,
  createMessageTimeElement,
  createTickIcon,
  createMessageLoadingElement,
  updateMessageStatus,
} from "./MessageBubble.js";
import { enableLinkifyOnInput } from "./normalize.js";


const setSystemStatus = (text, type = 'warning') => {
  const types = {
    success: {
      text: 'text-emerald-300',
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-500/40',
      shadow: 'shadow-emerald-500/20',
      icon: '💚'
    },
    warning: {
      text: 'text-amber-300',
      bg: 'bg-amber-950/30',
      border: 'border-amber-500/40',
      shadow: 'shadow-amber-500/20',
      icon: '⚠'
    },
    error: {
      text: 'text-rose-300',
      bg: 'bg-rose-950/30',
      border: 'border-rose-500/40',
      shadow: 'shadow-rose-500/20',
      icon: '❌'
    },
    info: {
      text: 'text-cyan-300',
      bg: 'bg-cyan-950/30',
      border: 'border-cyan-500/40',
      shadow: 'shadow-cyan-500/20',
      icon: 'ℹ'
    }
  };

  const style = types[type] || types.warning;

  if (!state.systemStatusMsg) {
    const msg = document.createElement('div');
    msg.className = `
      system-status 
      flex items-center gap-3 
      justify-self-center
      px-4 py-3 my-2 mx-3 
      rounded-2xl
      backdrop-blur-xl 
      ${style.bg} 
      border ${style.border} 
      ${style.text} font-medium text-sm
      shadow-lg ${style.shadow}
      transition-all duration-400 ease-out
      animate-in fade-in slide-in-from-bottom-4
    `;

    msg.innerHTML = `
      <span class="text-xl opacity-90">${style.icon}</span>
      <span class="message-text flex-1">${text}</span>
      <span class="message-time text-xs opacity-70">
        ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    `;

    $.logs.appendChild(msg);
    state.systemStatusMsg = msg;
  } else {
    const msg = state.systemStatusMsg;
    msg.className = `
      system-status
      flex items-center gap-3 
      justify-self-center
      px-4 py-3 my-2 mx-3 
      rounded-2xl 
      backdrop-blur-xl 
      ${style.bg} 
      border ${style.border} 
      ${style.text} font-medium text-sm
      shadow-lg ${style.shadow}
      transition-all duration-400 ease-out
    `;

    msg.querySelector('.message-text').textContent = text;
    msg.querySelector('.message-time').textContent =
      new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: "2-digit" });
  }

  if (state.systemStatusMsg instanceof Element) {
    state.systemStatusMsg.style.opacity = '0.4';
    setTimeout(() => {
      if (state.systemStatusMsg instanceof Element) {
        state.systemStatusMsg.style.opacity = '1';
      }
    }, 80);
  }

  scrollToBottom();
};

const clearSystemStatus = () => {
  if (state.systemStatusMsg?.parentNode) {
    state.systemStatusMsg.parentNode.removeChild(state.systemStatusMsg);
  }
  state.systemStatusMsg = null;
};

const sentinel = document.getElementById('sentinel');

const observer = new IntersectionObserver((entries) => {
  if (document.getElementsByClassName("msg").length < 5) return;

  const entry = entries[0];

  if (!entry.isIntersecting) return;

  if (state.isLoading || !state.beforeTs) {
    return;
  }
  loadMore();
}, {
  root: null,
  rootMargin: "0px 0px 1000px 0px",
  threshold: 0
});

observer.observe(sentinel);

async function loadMore() {
  if (state.isLoading) return;
  state.isLoading = true;

  const loading = document.getElementById('loading-more');
  loading?.classList.remove('hidden');

  try {
    sendWS({ action: "load_more_history", beforeTs: state.beforeTs });
  } catch (e) {
  } finally {
    state.isLoading = false;
    loading?.classList.add('hidden');
  }
}

// ==================== WebSocket ====================
export const connectWS = () => {
  const url = `ws://${window.location.host}/ws/`;
  let attempts = 0;
  const maxAttempts = 15;
  let isFirstConnectionAttempt = true;

  const init = () => {
    const sender = getSenderUsername();
    const receiver = getReceiverUsername();
    if (!sender || !receiver) return;

    let activeChat = receiver !== sender ? document.querySelector(`.${receiver}`) : null;

    state.ws = new WebSocket(url);

    state.ws.onopen = () => {
      isFirstConnectionAttempt = false;
      attempts = 0;

      sendWS({ action: 'initialize', receiver: receiver });

      setSystemStatus('اتصال برقرار شد', 'success');
      setTimeout(clearSystemStatus, 1000);
      sendPending();
      if (activeChat) clickOnChat(activeChat);
    };

    state.ws.onmessage = async e => {
      try {
        const msg = JSON.parse(e.data);
        msg.receiver = msg.receiver?.toLowerCase()
        msg.sender = msg.sender?.toLowerCase()

        if (msg.type === "history_msg" || msg.type === "new_msg") {
          if (!msg.text?.trim() && !msg.file?.trim()) return;

          if (msg.type === "new_msg") {
            UpdateChatMetadata(msg.sender, msg.text, msg.timestamp);
          }

          let wrapper = null;
          const local = getSenderUsername();
          const scrollHeightBefore = $.logs.scrollHeight;
          const scrollTopBefore = $.logs.scrollTop;
          const { sender, receiver } = msg;

          if (local !== sender && !msg.is_read) {
            await onNewMessage(msg.text);

            if (!state.chatIsActive(sender)) {
              const cnt = state.getUnreadCount(sender);
              state.setunreadCount(sender, cnt + 1);
              updateChatUndreadCount(sender);
            }

            if (!state.isUserActive) {
              wrapper = addMessage(msg);
            }
          }

          const isRelevantToCurrentChat = state.chatIsActive(sender) || (sender === local && state.chatIsActive(receiver));
          if (!isRelevantToCurrentChat) return;

          wrapper = addMessage(msg);
          if (wrapper) {
            if (msg.type === 'history_msg') {
              $.logs.children[0].after(wrapper);
            } else {
              $.logs.appendChild(wrapper);
              scrollToBottom();
            }
          }

          if (sender === local) {
            const metadata = $.logs.querySelector(`#id_${msg.id}`)?.parentNode;
            metadata?.querySelector(".message-tick")?.classList?.replace("hidden", "inline-block");
          }

          const scrollHeightAfter = $.logs.scrollHeight;
          const addedHeight = scrollHeightAfter - scrollHeightBefore;
          $.logs.scrollTop = scrollTopBefore + addedHeight;
        }

        if (msg.type === "initialize_msg") {
          const local = getSenderUsername();
          if (msg.sender === local) {
            UpdateChatMetadata(msg.receiver, msg.text, msg.timestamp);
          } else {
            UpdateChatMetadata(msg.sender, msg.text, msg.timestamp);
          }
        }

        if (msg.type === "ack") {
          let tmpMsg = $.logs.querySelector(`#id_${msg.tmp_id}`);
          if (tmpMsg) {
            tmpMsg.id = `id_${msg.id}`;
            tmpMsg.dataset.tmpId = msg.tmp_id;

            const metadata = tmpMsg?.parentElement;
            metadata?.querySelector(".msg-loading")?.classList.replace("inline-block", "hidden");
            metadata?.querySelector(".message-tick")?.classList.replace("hidden", "inline-block");
            scrollToBottom();
          }
          removeFromPending(msg.tmp_id);
        }

        if (msg.type === "seen_chat") {
          $.logs.querySelectorAll('#single-tick').forEach(el => el.replaceWith(createTickIcon(true).childNodes[1]));
        }

        if (msg.type === "reaction_update") {
          handleIncomingReaction(msg, receiver);
        }

        if (msg.type === "unread_chats") {
          for (const [user, cnt] of Object.entries(msg.chats)) {
            state.setunreadCount(user, cnt);
            updateChatUndreadCount(user);
          }
        }

        if (msg.type === "end_msgs") {
          if (msg.scroll_type === 'end_msgs') {
            setTimeout(() => { scrollToBottom(); }, 100)
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    state.ws.onerror = () => {
      state.ws?.close();
    };

    state.ws.onclose = () => {
      setSystemStatus('اتصال قطع شد. تلاش مجدد...', 'warning');
      if (isFirstConnectionAttempt) {
        renderCachedMessagesIfOffline(receiver);
      }
      scheduleReconnect();
    };
  };

  function getDelay(attempt) {
    const base = 1000; // 1s
    let delay = base * Math.pow(2, attempt - 1);   // 1s → 2s → 4s → 8s → 16s ...
    delay += Math.random() * 500;
    return Math.min(delay, 30000);
  }

  function scheduleReconnect() {
    if (attempts >= maxAttempts) {
      console.warn('WebSocket: reconnect limit reached');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      return;
    }

    const delay = getDelay(attempts);
    attempts++;
    setTimeout(init, delay);
  }

  init();
};

async function onNewMessage(newMsg) {
  if (document.hidden) {
    const orig = document.title;
    document.title = '🔔 پیام جدید!';
    setTimeout(() => document.title = orig, 3000);

    if (Notification.permission === 'granted') {
      new Notification('Private Chat New Msg', {
        body: (await newMsg),
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}

function addPending(msgObj) {
  let list = getPendingMessages() || [];

  const isExist = list.some(str => {
    try {
      return JSON.parse(str).tmp_id === msgObj.tmp_id;
    } catch { return false; }
  });

  if (isExist) return;
  list.push(JSON.stringify(msgObj));
  savePendingMessages(list);
}

function removeFromPending(tmpId) {
  let list = getPendingMessages() || [];
  const filtered = list.filter(str => {
    try {
      return JSON.parse(str).tmp_id !== tmpId;
    } catch { return true; }
  });
  savePendingMessages(filtered);
}

function sendPending() {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

  const msgs = getPendingMessages() || [];
  if (msgs.length === 0) return;

  msgs.forEach(msgStr => {
    try {
      const msgObj = JSON.parse(msgStr);

      const fullPayload = {
        receiver: getReceiverUsername(),
        chats: getChatList(),
        ...msgObj
      };

      state.ws.send(JSON.stringify(fullPayload));
    } catch (e) {
      console.warn("Invalid pending message format skipped", e, msgStr);
    }
  });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ==================== Send Message ====================
export const sendWS = (payload = {}, options = {}) => {
  const { skipFixed = false } = options;

  const fixedFields = {
    receiver: getReceiverUsername(),
    chats: getChatList(),
  };
  if (!fixedFields.receiver) {
    console.warn("Cannot send WS: receiver missing", payload);
    return false;
  }

  const fullPayload = skipFixed ? payload : { ...fixedFields, ...payload };

  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(fullPayload));
    return true;
  } else if (payload.action === "new_msg") {
    addPending(payload);
  }

  return false;
};

async function compressFile(file) {
  if (file.type.startsWith('image/')) {
    const options = { maxSizeMB: 1, maxWidthOrHeight: 800, initialQuality: 0.4, useWebWorker: true };
    try {
      const compressedBlob = await imageCompression(file, options);
      return new File([compressedBlob], file.name, { type: compressedBlob.type });
    } catch (error) {
      console.log(error);
    }
  }
  return file;
}

async function uploadLargeFile(file, tmpId) {
  if (!file || file.size === 0) return;

  if (state.isUploading) return;
  state.isUploading = true;

  try {
    const compressed = await compressFile(file);
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('receiver', getReceiverUsername());
    formData.append('tmpId', tmpId);

    const res = await fetch('/chat/upload/', { method: 'POST', body: formData });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Server error:', txt);
      throw new Error(`Upload failed: ${res.status} - ${txt}`);
    }
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('Upload cancelled');
    } else {
      console.error('Fetch error:', e);
    }
  } finally {
    state.isUploading = false;
  }
}

const sendMessage = async () => {
  const text = $.input.value.trim();
  const file = state.pendingFile;

  if (!text && !file) return;

  $.input.value = '';
  $.input.style.height = 'auto';

  const tmpId = uuid();

  const msgObj = {
    action: "new_msg",
    text,
    reply_id: state.replyId,
    tmp_id: tmpId,
    receiver: getReceiverUsername(),
    timestamp: Math.floor(Date.now() / 1000)
  };

  if (state.replyId) {
    const replyEl = document.querySelector(`#id_${state.replyId}`);
    const preview =
      replyEl?.parentNode?.parentElement
        ?.querySelector(".text-part")
        ?.textContent
        ?.trim() || "";

    msgObj.reply = {
      id: state.replyId,
      preview: preview.slice(0, 30) + (preview.length > 30 ? "…" : "")
    };
    closeReply();
  }

  const wrapper = addMessage(msgObj);
  wrapper.className = "chat-msg flex relative justify-end";
  $.logs.appendChild(wrapper);
  scrollToBottom();
  UpdateChatMetadata(msgObj.receiver, msgObj.text);


  if (!file) {
    const sent = sendWS(msgObj, { skipFixed: true });
    if (!sent) {
      console.log("Message queued locally. Offline mode.");
    }
    return;
  }

  try {
    const uploadRes = await uploadLargeFile(file, tmpId);
    if (uploadRes && uploadRes.url) {
      msgObj.file = uploadRes.url;
      msgObj.name = file.name;

      const updatedWrapper = addMessage(msgObj);
      updatedWrapper.className = "chat-msg flex relative justify-end";
      $.logs.lastChild.replaceWith(updatedWrapper);
      scrollToBottom();
      state.pendingFile = null;

      sendWS(msgObj);
    }
  } catch (err) {
    console.error("Upload failed layout broken:", err);
  }

};

// ==================== Event Listeners ====================
$.send.addEventListener('click', sendMessage);
$.input.addEventListener('keydown', async e => {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (e.key === 'Enter' && !e.shiftKey) {
    if (isTouchDevice) return;

    e.preventDefault();
    await sendMessage();
  }
});

const clipboardDeps = {
  setSystemStatus,
  createMessageTimeElement,
  createTickIcon,
  createMessageLoadingElement,
  sendMessage,
};

$.fileUpload.addEventListener('change', e => { uploadFileFromLocal(e, clipboardDeps) })
document.addEventListener('paste', e => { uploadFileFromClipboard(e, clipboardDeps) })

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state.replyId) closeReply();
  };
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    state.isUserActive = true;
  } else {
    state.isUserActive = false;
  }
});

window.addEventListener('focus', () => {
  state.isUserActive = true;
});

window.addEventListener('blure', () => {
  state.isUserActive = false;
});

const sidebar = document.getElementById('sidebar');
const openBtn = document.getElementById('open-sidebar');
const clsoeBtn = document.getElementById('close-sidebar');

export function closeSideBar() {
  sidebar.classList.remove('translate-x-0');
  sidebar.classList.add('-translate-x-full');
}

clsoeBtn?.addEventListener('click', () => {
  closeSideBar();
});

openBtn?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('active');
  if (sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
  } else {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
  }
});

const textarea = document.getElementById('chat-input-text');
enableLinkifyOnInput(textarea);

window.addEventListener('online', () => {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    sendPending();
  } else {
    connectWS();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const sender = getSenderUsername();
  if (sender) {
    state.setActiveChat(getReceiverUsername(), true);
    state.setActiveChat(sender, true);
    connectWS();
  }
});