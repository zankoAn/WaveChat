import { addMessageToCache, getReceiverUsername, getSenderUsername } from "./cache.js"
import { createReactions } from "./reaction.js";
import { createGifElement } from "./emojis.js";
import { createFilePreviewClipboard } from "./fileUploader.js";
import { showReply, createReplyMsgElement } from "./replyManager.js";
import { detectTextDirection, escapeHtml, extractCodeContent } from "./normalize.js"

const TEXT_PART_CLASS = 'text-part whitespace-pre-line inline align-middle';

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all inline-block z-10 relative cursor-pointer">${url}</a>`;
    });
}

function createTextSpan(txt, extra = '') {
    const span = document.createElement('span');
    span.className = `${TEXT_PART_CLASS}${extra ? ' ' + extra : ''}`;
    span.innerHTML = linkify(escapeHtml(txt));
    return span;
}

function createEmojiImg(key) {
    const img = createGifElement(`:${key}:`);
    if (!img) return null;
    img.classList.add(
        'inline-block', 'align-middle',
        'w-7', 'h-7', 'sm:w-8', 'sm:h-8',
        'object-contain', 'flex-shrink-0', 'mx-0.5', 'select-none'
    );
    return img;
}

function renderMessageText(containerEl, rawText) {
    const parsedParts = extractCodeContent(rawText);
    const msgDirection = detectTextDirection(rawText);

    containerEl.className = 'message-text block text-base sm:text-lg leading-6 md:leading-7';
    containerEl.textContent = '';

    if (parsedParts !== null) {
        if (parsedParts && parsedParts.length > 0) {
            parsedParts.forEach(part => {
                if (part.type === 'text') {
                    const pEl = document.createElement('p');
                    pEl.innerHTML = linkify(escapeHtml(part.content));
                    pEl.style.whiteSpace = 'pre-wrap';
                    containerEl.appendChild(pEl);
                } else if (part.type === 'code') {
                    const preEl = document.createElement('pre');
                    preEl.className = 'text-part bg-gray-900 text-green-400 text-sm p-3 rounded-lg overflow-x-auto border border-gray-700 shadow-inner whitespace-pre-wrap break-words my-2 text-left';
                    preEl.textContent = part.content;
                    containerEl.appendChild(preEl);
                }
            });
        } else {
            const fallbackP = document.createElement('p');
            fallbackP.innerHTML = linkify(escapeHtml(rawText));
            containerEl.appendChild(fallbackP);
        }
        return containerEl;
    }

    const safeHtml = escapeHtml(rawText);
    const temp = document.createElement('div');
    temp.innerHTML = safeHtml;

    const frag = document.createDocumentFragment();
    const colonRe = /:([a-z0-9_-]+):/gi;
    const unicodeRe = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

    const processTextNode = (textNode) => {
        const raw = textNode.nodeValue;
        let lastIdx = 0;
        const matches = [];
        let m;

        while ((m = colonRe.exec(raw)) !== null) matches.push({ type: 'colon', match: m, index: m.index });
        while ((m = unicodeRe.exec(raw)) !== null) matches.push({ type: 'unicode', match: m, index: m.index });
        matches.sort((a, b) => a.index - b.index);

        for (const item of matches) {
            const start = item.index;
            if (start > lastIdx) {
                const slice = raw.slice(lastIdx, start);
                frag.appendChild(slice.trim() ? createTextSpan(slice, msgDirection) : document.createTextNode(slice));
            }

            if (item.type === 'colon') {
                const key = item.match[1];
                const img = createEmojiImg(key);
                if (img) frag.appendChild(img);
            } else {
                const emojiChar = item.match[0];
                const span = createTextSpan(emojiChar);
                span.classList.add('text-2xl');
                frag.appendChild(span);
            }
            lastIdx = start + item.match[0].length;
        }

        if (lastIdx < raw.length) {
            const tail = raw.slice(lastIdx);
            frag.appendChild(tail.trim() ? createTextSpan(tail, msgDirection) : document.createTextNode(tail));
        }
    };

    const walk = (node) => {
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                processTextNode(child);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                frag.appendChild(child.cloneNode(true));
            }
        });
    };

    walk(temp);
    containerEl.appendChild(frag);
    return containerEl;
}

function createHiddenMsgId(msgId) {
    const el = document.createElement('div');
    el.className = 'msgId hidden';
    el.id = `id_${msgId}`;
    el.textContent = msgId;
    return el;
}

function addDoubleClickReply(element) {
    let lastClickTime = 0;
    const DOUBLE_CLICK_DELAY = 300;

    element.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') return;

        if (window.getSelection().toString().trim().length > 0) {
            lastClickTime = 0;
            return;
        }
        const currentTime = Date.now();
        if (currentTime - lastClickTime <= DOUBLE_CLICK_DELAY) {
            showReply(element);
            lastClickTime = 0;
        } else {
            lastClickTime = currentTime;
        }
    });
}

function addRightClickAndLongPressOptions(element, msgId, text) {
    const menu = document.createElement('div');
    menu.className = `
        menu absolute hidden
        bg-[#1e2530] text-gray-200
        rounded-xl shadow-2xl border border-gray-700/50
        min-w-[150px] p-1.5
        transition-all duration-200 ease-out
        opacity-0 scale-95
        z-50 select-none
    `;
    menu.dataset.role = 'msg-menu';

    const makeBtn = (label, iconSvg, fn) => {
        const b = document.createElement('button');
        b.className = `
            w-full flex items-center justify-between px-3 py-2 rounded-lg
            hover:bg-gray-700/50 active:bg-gray-700 text-sm font-medium
            transition-colors text-right dir-rtl gap-4
        `;
        b.innerHTML = `<span>${label}</span>${iconSvg}`;
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            fn(e);
            hideMenu();
        });
        return b;
    };

    const copy = async () => {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (err) { console.error(err); }
        }
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    };

    const replyF = () => { hideMenu(); showReply(element) };
    const edit = () => console.log('edit', msgId);

    const replyIcon = `<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`;
    const copyIcon = `<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>`;
    const editIcon = `<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;

    menu.append(
        makeBtn('پاسخ', replyIcon, replyF),
        makeBtn('کپی متن', copyIcon, copy),
        makeBtn('ویرایش', editIcon, edit),
    );

    element.appendChild(menu);
    let isOpen = false;

    const showMenu = (clientX, clientY) => {
        document.querySelectorAll('.menu').forEach(m => {
            if (m !== menu) m.classList.add('hidden');
        });

        menu.classList.remove('hidden');
        isOpen = true;

        requestAnimationFrame(() => {
            const menuRect = menu.getBoundingClientRect();
            const parentRect = element.getBoundingClientRect();

            let x = clientX - parentRect.left;
            let y = clientY - parentRect.top;
            const padding = 12;

            if (clientX + menuRect.width + padding > window.innerWidth) {
                x = parentRect.width - menuRect.width - padding;
            }
            if (clientY + menuRect.height + padding > window.innerHeight) {
                y = parentRect.height - menuRect.height - padding;
            }

            if (x < padding) x = padding;
            if (y < padding) y = padding;

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;

            requestAnimationFrame(() => {
                menu.classList.replace('opacity-0', 'opacity-100');
                menu.classList.replace('scale-95', 'scale-100');
            });
        });
    };

    const hideMenu = () => {
        if (!isOpen) return;
        menu.classList.replace('opacity-100', 'opacity-0');
        menu.classList.replace('scale-100', 'scale-95');
        setTimeout(() => menu.classList.add('hidden'), 150);
        isOpen = false;
    };

    element.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'A') return;
        e.preventDefault();
        showMenu(e.clientX, e.clientY);
    });

    let touchTimeout;
    element.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'A') return;
        const touch = e.touches[0];
        touchTimeout = setTimeout(() => {
            e.preventDefault();
            showMenu(touch.clientX, touch.clientY);
        }, 600);
    }, { passive: true });

    element.addEventListener('touchmove', () => clearTimeout(touchTimeout));
    element.addEventListener('touchend', () => clearTimeout(touchTimeout));

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !element.contains(e.target)) {
            hideMenu();
        }
    });

    window.addEventListener('scroll', hideMenu, true);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideMenu();
    });
    menu.addEventListener('contextmenu', e => e.preventDefault());
}

export function createTickIcon(isRead = false) {
    const tick = document.createElement('div');
    tick.className = 'message-tick flex items-center select-none';

    if (!isRead) {
        tick.innerHTML = `
            <svg id="single-tick" class="
            w-[18px] h-[15px] stroke-[#e8ffa3] stroke-[2.5] fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 26 15">
                <polyline class="tick1" points="2,8 6,11.5 14,3" />
            </svg>   
        `;
    } else {
        tick.innerHTML = `
          <svg id="double-tick" class="w-[18px] h-[15px] stroke-[#4cff76] stroke-[2.5] fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 26 15">
            <polyline points="2,8 6,11.5 14,3" />
            <polyline class="-translate-x-1.5" points="15,10 16,12 25,2" />
          </svg>
        `;
    }
    return tick;
}

export function createMessageLoadingElement() {
    const loading = Object.assign(document.createElement('span'), {
        className: "msg-loading flex items-center"
    });
    loading.innerHTML = `
        <svg class="w-4 h-4 stroke-gray-400 pb-[1px] stroke-2 fill-none animate-spin" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="16"/>
        </svg>
    `;
    return loading;
}

export function createMessageTimeElement(timestamp, isRightAligned) {
    const sendTime = document.createElement('div');
    const msgDate = timestamp ? new Date(timestamp * 1000) : new Date();

    const h = msgDate.getHours();
    const m = msgDate.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;

    sendTime.textContent = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    sendTime.className = `send-time ltr text-[11px] text-gray-400/80 pb-[2px] select-none font-mono`;

    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-flex items-center';
    wrapper.appendChild(sendTime);
    return wrapper;
}

export function createMessageElement(
    msgId,
    reply = null,
    text,
    sender,
    sendTime,
    tick,
    loading = null,
    reactions = [],
    isRightAligned = false,
) {
    const isOwnMessage = sender === 'self';
    const isStartSide = isRightAligned === 'start';

    const bubbleClass = isStartSide
        ? 'bg-gradient-to-bl from-[#2d3c44] to-[#252b3b] rounded-tr-2xl rounded-tl-2xl rounded-br-2xl  rounded-bl-2xl rounded-l-none'
        : 'bg-gradient-to-br from-[#33334f] to-[#1E1E2E] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl  rounded-br-2xl rounded-r-none';

    const msgEl = document.createElement('div');
    msgEl.className = `msg relative ${bubbleClass} rtl text-[15px] sm:text-[16px] text-gray-100/95 pb-1.5 pt-2 px-4 min-w-[110px] max-w-[85%] sm:max-w-[70%] md:max-w-[480px] transition-all duration-200 break-words select-text`;
    msgEl.dataset.msgId = msgId;

    if (reply) {
        const replyEl = createReplyMsgElement(reply, isRightAligned);
        msgEl.appendChild(replyEl);
    }

    const textEl = document.createElement('div');
    textEl.className = 'relative z-10 font-normal leading-relaxed tracking-wide';
    renderMessageText(textEl, text);

    const metaEl = document.createElement('div');
    const metaColor = isOwnMessage ? 'text-white/40' : 'text-gray-500/60';
    metaEl.className = 'metadata flex items-center gap-1 pb-1.5 mt-1 text-xs text-gray-400 opacity-80 justify-start';

    metaEl.append(sendTime, createHiddenMsgId(msgId));

    if (isOwnMessage) {
        const isPending = String(msgId).startsWith('tmp_');
        if (isPending && loading) {
            metaEl.appendChild(loading);
        } else if (tick) {
            metaEl.appendChild(tick);
        }
    }

    const clearFix = document.createElement('div');
    clearFix.className = 'clear-both';

    const [currentReactionsEl, quickReactEl, emojiPanelEl] = createReactions(msgEl, msgId, reactions, isRightAligned);

    msgEl.append(textEl, clearFix, emojiPanelEl, metaEl);
    metaEl.append(quickReactEl, currentReactionsEl);

    addDoubleClickReply(msgEl);
    addRightClickAndLongPressOptions(msgEl, msgId, text);

    return msgEl;
}

export function updateMessageStatus(tmpId, realId, isRead = false) {
    const msgEl = document.querySelector(`[data-msg-id="${tmpId}"]`);
    if (!msgEl) return;

    msgEl.dataset.msgId = realId;
    const hiddenIdEl = msgEl.querySelector(`#id_${tmpId}`);
    if (hiddenIdEl) {
        hiddenIdEl.id = `id_${realId}`;
        hiddenIdEl.textContent = realId;
    }

    const metaEl = msgEl.querySelector('.metadata');
    if (metaEl) {
        const loadingEl = metaEl.querySelector('.msg-loading');
        if (loadingEl) {
            loadingEl.remove();
        }

        const oldTick = metaEl.querySelector('.message-tick');
        if (oldTick) {
            oldTick.remove();
        }

        const newTick = createTickIcon(isRead);
        metaEl.appendChild(newTick);
    }
}

export function addMessage(msgData) {
    const currentReceiver = getReceiverUsername();
    if (currentReceiver) {
        addMessageToCache(currentReceiver, msgData);
    }

    const msgId = msgData.id || msgData.tmp_id;
    const text = msgData.text || '';
    const fileUrl = msgData.file || null;
    const isRead = msgData.is_read;
    const timestamp = msgData.timestamp;
    const reply = msgData.reply;
    const reactions = msgData.reactions || [];

    const isRightAligned = msgData.receiver === getReceiverUsername() ? 'end' : 'start';
    const sender = msgData.receiver === getReceiverUsername() ? 'self' : 'other';

    const sendTime = createMessageTimeElement(timestamp, isRightAligned);
    const loading = createMessageLoadingElement();
    const tick = createTickIcon(isRead);

    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg w-full flex mb-2.5 px-2 ${isRightAligned === 'end' ? 'justify-end' : 'justify-start'}`;

    let content = null;
    if (fileUrl?.trim()) {
        content = createFilePreviewClipboard(msgId, fileUrl, sendTime, tick);
    } else if (text) {
        content = createMessageElement(msgId, reply, text, sender, sendTime, tick, loading, reactions, isRightAligned);
    }

    if (content) wrapper.appendChild(content);

    const isValidTs = Number.isFinite(timestamp) && timestamp > 0;
    if (isValidTs && typeof state !== 'undefined') {
        state.beforeTs = timestamp;
    }

    return wrapper;
}