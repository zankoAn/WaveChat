// import successfull from "./statics/success.mp3";

document.addEventListener('DOMContentLoaded', () => {
  // ==================== Constants ====================
  const UNREAD_KEY = 'chat_unread_count';
  const CHAT_ID_KEY = 'chat_id';

  // ==================== DOM Elements ====================
  const $ = {
    circle: document.getElementById('chat-circle'),
    box: document.getElementById('chat-box'),
    close: document.getElementById('close-btn'),
    send: document.getElementById('chat-submit'),
    input: document.getElementById('chat-input-text'),
    logs: document.getElementById('chat-logs'),
    body: document.querySelector('.chat-box-body'),
    badge: document.getElementById('notification-badge'),
    overlay: document.querySelector(".overlay")
  };

  // ==================== State ====================
  let isOpen = false;
  let eventSource = null;
  let isConnecting = false;
  let isConnected = false;
  let systemStatusMsg = null;
  let unreadCount = 0;
  let historyCache = [];
  let pendingFile = null;
  const newMsgNotifSound = new Audio("./static/success.mp3");
  newMsgNotifSound.volume = 0.3

  const createMessageEl = (text, sender, sendTime, tick) => {
    const msg = document.createElement('div');
    msg.className = 'msg';

    const metadata = document.createElement('div');
    metadata.className = 'metadata';

    const textMsg = document.createElement('span');
    textMsg.className = 'text';

    const processedText = escapeHtml(text);
    textMsg.innerHTML = processedText;

    setMsgDirection(textMsg, processedText);

    if (sender === "self") {
      metadata.appendChild(tick);
    }

    metadata.appendChild(sendTime);
    msg.appendChild(textMsg);
    msg.appendChild(metadata);
    return msg;
  };

  const createSystemMessageEl = (text, type = 'warning') => {
    const msg = document.createElement('div');
    msg.className = `message system-message ${type}`;

    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    textEl.textContent = text;

    const timeEl = document.createElement('span');
    timeEl.className = 'message-time';
    timeEl.textContent = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    msg.append(textEl, timeEl);
    return msg;
  };

  const addTickToMessage = (isRead) => {
    const tick = document.createElement('div');
    tick.className = 'message-tick';
    if (!isRead) {
      tick.classList.add('tick-single');
      tick.innerHTML = `
      <svg viewBox="0 0 16 15">
        <polyline points="2,8 6,11.5 14,3" />
      </svg>`;
    } else {
      tick.classList.add('tick-double');
      tick.innerHTML = `
      <svg viewBox="0 0 26 15">
        <polyline class="tick1" points="2,8 6,11.5 14,3" />
        <polyline class="tick2" points="11,8 15,11.5 24,3" />
      </svg>`;
    }
    return tick;
  };

  document.getElementById('file-upload').addEventListener('change', function (e) {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setSystemStatus('حجم فایل نباید بیشتر از 100 مگابایت باشد.', "error");
      e.target.value = '';
      return;
    }

    pendingFile = file;
    const reader = new FileReader();
    reader.onload = function () {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-msg self';

      const content = document.createElement('div');
      const loading = document.createElement('div');
      loading.className = 'file-loading';
      loading.innerHTML = `
      <span class="loading-spinner"></span>
      <span style="font-size: 12px; color: white; margin-right: 8px;">در حال ارسال...</span>
      `;
      content.appendChild(loading);
      wrapper.appendChild(content);
      $.logs.appendChild(wrapper);
      currentPendingWrapper = wrapper;

      // Immediate scroll (in case the image loads instantly from cache)
      $.body.scrollTo({ top: $.body.scrollHeight, behavior: 'smooth' });

      sendMessage();
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // ==================== Paste Image from Clipboard ====================
  document.addEventListener('paste', (e) => {
    if (!isOpen) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (!imageFile) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (imageFile.size > maxSize) {
      setSystemStatus('حجم فایل نباید بیشتر از 100 مگابایت باشد.', "error");
      return;
    }

    pendingFile = imageFile;
    const reader = new FileReader();

    reader.onload = function (ev) {
      const wrapper = document.createElement('div');
      wrapper.className = 'chat-msg self';

      const content = document.createElement('div');
      content.className = 'msg img';

      const imgContainer = document.createElement('div');
      imgContainer.style.position = 'relative';
      imgContainer.style.display = 'inline-block';

      const sendTime = addSendTimeToMsg(new Date().getTime());
      const tick = addTickToMessage(false);
      const img = createImgElement(ev.target.result, sendTime, tick)

      const removeBtn = document.createElement('div');
      removeBtn.innerHTML = '✕';
      removeBtn.style.position = 'absolute';
      removeBtn.style.top = '8px';
      removeBtn.style.right = '8px';
      removeBtn.style.background = 'rgba(0,0,0,0.7)';
      removeBtn.style.color = 'white';
      removeBtn.style.width = '28px';
      removeBtn.style.height = '28px';
      removeBtn.style.borderRadius = '50%';
      removeBtn.style.display = 'flex';
      removeBtn.style.alignItems = 'center';
      removeBtn.style.justifyContent = 'center';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.fontSize = '16px';

      const sendBtn = document.createElement('div');
      sendBtn.innerHTML = 'ارسال';
      sendBtn.style.position = 'absolute';
      sendBtn.style.bottom = '-30px';
      sendBtn.style.left = '8px';
      sendBtn.style.background = '#ff4300';
      sendBtn.style.color = 'white';
      sendBtn.style.padding = '1px 20px';
      sendBtn.style.borderRadius = '20px';
      sendBtn.style.fontSize = '14px';
      sendBtn.style.cursor = 'pointer';

      const loading = document.createElement('div');
      loading.className = 'file-loading';
      loading.style.display = 'none';
      loading.innerHTML = `
        <span class="loading-spinner"></span>
        <span style="font-size: 12px; color: white; margin-right: 8px;">در حال ارسال...</span>
      `;

      imgContainer.appendChild(img);
      imgContainer.appendChild(removeBtn);
      imgContainer.appendChild(sendBtn);
      imgContainer.appendChild(loading);

      content.appendChild(imgContainer);
      wrapper.appendChild(content);

      $.logs.appendChild(wrapper);
      currentPendingWrapper = wrapper;

      $.body.scrollTo({ top: $.body.scrollHeight, behavior: 'smooth' });
      img.onload = () => $.body.scrollTo({ top: $.body.scrollHeight, behavior: 'smooth' });

      removeBtn.onclick = () => {
        wrapper.remove();
        pendingFile = null;
        currentPendingWrapper = null;
      };

      sendBtn.onclick = () => {
        sendBtn.style.display = 'none';
        removeBtn.style.display = 'none';

        loading.style.display = 'block';
        loading.style.position = 'absolute';
        loading.style.bottom = '8px';
        loading.style.left = '8px';
        loading.style.background = 'rgba(0,0,0,0.7)';
        loading.style.padding = '6px 12px';
        loading.style.borderRadius = '20px';
        loading.style.display = 'flex';
        loading.style.alignItems = 'center';
        sendMessage();
        wrapper.remove();
      };

      e.preventDefault();
    };

    reader.readAsDataURL(imageFile);

    e.preventDefault();
  });

  const scrollToBottom = () => {
    $.body.scrollTop = $.body.scrollHeight;
  };

  // ==================== Unread Count & Badge ====================
  const updateBadge = () => {
    if (unreadCount <= 0) {
      $.badge.classList.remove('show', 'pulse');
      $.badge.textContent = '';
      $.circle.classList.remove('pulse');
    } else {
      $.badge.classList.add('show', 'pulse');
      $.badge.textContent = unreadCount > 10 ? '10+' : unreadCount;
      $.circle.classList.add('pulse');
    }
  };

  // ==================== System Status Messages ====================
  const setSystemStatus = (text, type = 'warning') => {
    if (!systemStatusMsg) {
      systemStatusMsg = createSystemMessageEl(text, type);
      $.logs.appendChild(systemStatusMsg);
    } else {
      systemStatusMsg.querySelector('.message-text').textContent = text;
      systemStatusMsg.classList.remove('success', 'warning', 'error');
      systemStatusMsg.classList.add(type);
      systemStatusMsg.querySelector('.message-time').textContent =
        new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    }
    scrollToBottom();
  };

  const clearSystemStatus = () => {
    if (systemStatusMsg?.parentNode) {
      systemStatusMsg.parentNode.removeChild(systemStatusMsg);
    }
    systemStatusMsg = null;
  };

  // ==================== Chat ID Management ====================
  const getOrCreateChatId = () => {
    let chatId = localStorage.getItem(CHAT_ID_KEY);

    if (!chatId) {
      chatId = 'user_' + Math.random().toString(36);
      localStorage.setItem(CHAT_ID_KEY, chatId);
      document.cookie = `chat_id=${chatId}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
    return chatId;
  };

  const addSendTimeToMsg = (timestamp) => {
    const sendTime = document.createElement('div');
    let time = new Date();
    time.setTime(parseInt(timestamp * 1000));
    sendTime.className = 'send-time';
    sendTime.textContent = time.toLocaleTimeString(
      'fa-IR', { hour: '2-digit', minute: '2-digit' }
    );
    return sendTime;
  }

  // ==================== Message Handling ====================
  const addMessage = (msgData) => {
    let text = msgData.text || '';
    let imgUrl = msgData.image || null;
    let sender = msgData.sender === getOrCreateChatId() ? 'self' : 'other';
    let isRead = msgData.is_read || true;
    let is_history = msgData.is_history || false;
    let timestamp = msgData.timestamp;

    const sendTime = addSendTimeToMsg(timestamp);
    const wrapper = document.createElement('div');
    const tick = addTickToMessage(isRead);
    wrapper.className = 'chat-msg ' + sender;
    let content = null;

    if (imgUrl) {
      content = createImgElement(imgUrl, sendTime, tick);
    } else if (text) {
      content = createMessageEl(text, sender, sendTime, tick);
      if (!isRead) {
        newMsgNotifSound.play();
      }
    }

    wrapper.appendChild(content);
    $.logs.appendChild(wrapper);

    scrollToBottom();
    historyCache.push({
      text: text,
      image: imgUrl,
      sender: sender,
      is_read: isRead,
      is_history: is_history,
      timestamp: timestamp,
    });
  };

  const showWelcomeMessage = () => {
    addMessage({
      text: 'پیامت بده من می‌گیرمش ها ها ها',
      type: 'other',
      isRead: true,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    });
  };

  // ==================== Server-Sent Events (SSE) ====================
  const connectSSE = () => {
    if (isConnecting || isConnected) return;

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    isConnecting = true;
    isConnected = false;
    eventSource = new EventSource(`/chat/`);
    eventSource.onopen = () => {
      isConnecting = false;
      isConnected = true;

      unlockInput();
      setSystemStatus('اتصال برقرار شد', 'success');
      setTimeout(() => isConnected && clearSystemStatus(), 3000);
      showWelcomeMessage();
    };

    eventSource.onmessage = (e) => {
      if (!e.data || e.data.trim() === '' || e.data.startsWith(':')) return;
      try {
        const data = JSON.parse(e.data);

        if (!data.text && !data.image) return;

        if (data.type === 'resend_history') {
          $.logs.innerHTML = '';
          return;
        }
        addMessage(data);
      } catch (err) {
        console.error('SSE JSON parse error:', err, e.data);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSource = null;
      isConnecting = false;
      isConnected = false;

      lockInputTemporarily();
      setSystemStatus('اتصال قطع شد. تلاش مجدد در ۵ ثانیه...', 'warning');

      setTimeout(connectSSE, 5000);
    };
  };

  // ==================== Input Lock/Unlock ====================
  const lockInputTemporarily = (seconds = 30, message = 'لطفاً صبر کنید...') => {
    $.input.style.pointerEvents = 'none';
    $.send.disabled = true;
    $.input.placeholder = message.replace('{s}', seconds);

    let remain = seconds;
    const timer = setInterval(() => {
      remain--;
      $.input.placeholder = message.replace('{s}', remain);

      if (remain <= 0) {
        clearInterval(timer);
        unlockInput();
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(timer);
      unlockInput();
    }, seconds * 1000);
  };

  const unlockInput = () => {
    $.send.disabled = false;
    $.input.placeholder = 'پیام خود را بنویسید...';
    $.input.style.pointerEvents = 'auto';
    $.input.focus();
  };

  // ==================== UI: Open / Close Chat ====================
  $.box.classList.add('open');
  $.circle.classList.remove('hide');
  isOpen = true;

  if ($.logs.children.length === 0) {
    if (historyCache.length > 0) {
      historyCache.forEach(msg => addMessage(msg));
    } else {
      fetch('/chat/resend/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: getOrCreateChatId() })
      }).catch(console.warn);
    }
  }

  scrollToBottom();
  $.input.focus();

  // ==================== Send Message ====================
  const sendMessage = () => {
    const text = $.input.value.trim();
    const file = pendingFile;

    if (!text && !file) return;

    $.input.value = '';
    $.input.style.height = 'auto';

    const formData = new FormData();
    if (text) formData.append('message', text);
    if (file) formData.append('image', file);

    fetch('/chat/', {
      method: 'POST',
      body: formData,
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 429) {
            lockInputTemporarily(30, 'لطفاً {s} ثانیه صبر کنید...');
            setSystemStatus('لطفاً کمی صبر کنید، زیاد پیام نفرستید!', 'error');
          } else {
            setSystemStatus('خطا در ارسال پیام.', 'error');
          }

          if (!text && file && currentPendingWrapper) {
            const loading = currentPendingWrapper.querySelector('.file-loading');
            if (loading) {
              loading.innerHTML = '<span style="color: #e74c3c; font-size: 12px;">✗ ارسال ناموفق</span>';
            }
          }

        } else {
          if (!text && file && currentPendingWrapper) {
            const loading = currentPendingWrapper.querySelector('.file-loading');
            if (loading) loading.remove();
            addTickToMessage(currentPendingWrapper);
          }
        }

        scrollToBottom();
        setTimeout(clearSystemStatus, 3000);
      })
      .catch(() => {
        setSystemStatus('اتصال به سرور قطع است!', 'error');
        setTimeout(clearSystemStatus, 3000);
        if (!text && file && currentPendingWrapper) {
          const loading = currentPendingWrapper.querySelector('.file-loading');
          if (loading) {
            loading.innerHTML = '<span style="color: #e74c3c; font-size: 12px;">✗ خطای اتصال</span>';
          }
        }
      })
      .finally(() => {
        pendingFile = null;
        currentPendingWrapper = null;
      });
  };

  // ==================== Event Listeners ====================
  // $.circle.addEventListener('click', openChat);
  $.send.addEventListener('click', sendMessage);
  $.overlay.addEventListener('click', closeImage);

  $.input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto resize textarea
  $.input.addEventListener('input', () => {
    $.input.style.height = 'auto';
    $.input.style.height = $.input.scrollHeight + 'px';
  });

  window.addEventListener('storage', e => {
    if (e.key === UNREAD_KEY && !isOpen) {
      const newCount = e.newValue ? parseInt(e.newValue, 10) : 0;
      if (newCount !== unreadCount) {
        unreadCount = newCount;
        updateBadge();
      }
    }
  });

  // ==================== Initialization ====================
  connectSSE();
});