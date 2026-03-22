import { addMessageToCache, getReceiverUsername, getSenderUsername } from "./cache.js"
import { createReactions } from "./reaction.js";
import { createGifElement } from "./emojis.js";
import { createFilePreviewClipboard } from "./fileUploader.js";
import { showReply, createReplyMsgElement } from "./replyManager.js";
import { detectTextDirection, escapeHtml, extractCodeContent } from "./normalize.js"


const TEXT_PART_CLASS = 'text-part whitespace-pre-line inline align-middle';
function createTextSpan(txt, extra = '') {
    const span = document.createElement('span');
    span.className = `${TEXT_PART_CLASS}${extra ? ' ' + extra : ''}`;
    span.textContent = txt;
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

    if (parsedParts !== null) {
        if (parsedParts && parsedParts.length > 0) {
            parsedParts.forEach(part => {
                if (part.type === 'text') {
                    const pEl = document.createElement('p');
                    pEl.textContent = part.content;
                    pEl.style.whiteSpace = 'pre-wrap';
                    containerEl.appendChild(pEl);
                } else if (part.type === 'code') {
                    const preEl = document.createElement('pre');
                    preEl.className = 'text-part bg-gray-900 text-green-400 text-sm p-2 rounded-lg overflow-x-auto border border-gray-700 shadow-inner whitespace-pre-wrap break-words';
                    preEl.classList.add(msgDirection);
                    preEl.textContent = part.content;
                    containerEl.appendChild(preEl);
                }
            });
        } else {
            const fallbackP = document.createElement('p');
            fallbackP.textContent = rawText;
            containerEl.appendChild(fallbackP);
        }
        return containerEl;
    }

    const safeHtml = escapeHtml(rawText);

    const temp = document.createElement('div');
    temp.innerHTML = safeHtml;

    containerEl.className =
        'message-text inline-flex flex-wrap items-center gap-x-1.5 ' +
        'text-base sm:text-lg leading-6 md:leading-7';
    containerEl.textContent = '';

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

function addTouchClearSelection(element) {
    element.addEventListener('touchstart', () => {
        document.getSelection()?.removeAllRanges();
    });
}

function addRightClickOptions(element, msgId, text) {
    const menu = document.createElement('div');
    menu.className = `
        menu
        absolute hidden
        bg-[#212936] text-white
        rounded-md shadow-lg
        min-w-[130px] p-1
        transition-all duration-200 ease-out
        opacity-0 scale-100
        right-5
        z-50
    `;
    menu.dataset.role = 'msg-menu';

    const makeBtn = (label, fn) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.className = `
            w-full text-base text-left px-2 py-1
            rounded-md
            hover:bg-[#1e2632]
            focus:outline-none
            transition-colors duration-150
        `;
        b.onclick = fn;
        return b;
    };

    const copy = async () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        }
        hideMenu(menu);
    };

    const replyF = () => {
        showReply(element);;
        hideMenu(menu);
    };

    const edit = () => console.log('edit', msgId);

    menu.append(
        makeBtn('Reply', replyF),
        makeBtn('Copy', copy),
        makeBtn('Edit', edit),
    );
    element.appendChild(menu);

    const showMenu = (msgEl) => {
        msgEl.preventDefault();
        const { left, top } = element.getBoundingClientRect();
        menu.style.left = `${msgEl.clientX - left}px`;
        menu.style.top = `${msgEl.clientY - top}px`;
        menu.classList.remove('hidden');

        requestAnimationFrame(() => {
            menu.classList.replace('opacity-0', 'opacity-100');
            menu.classList.replace('scale-95', 'scale-100');
        });
    }

    const hideMenu = (menu) => {
        menu.classList.replace('opacity-100', 'opacity-0');
        menu.classList.replace('scale-100', 'scale-95');
        setTimeout(() => menu.classList.add('hidden'), 200);
    };

    document.addEventListener('click', e => { if (!menu.contains(e.target)) hideMenu(menu); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(menu); });
    menu.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
    });
    element.addEventListener('contextmenu', msgEl => {
        const openMenus = document.getElementsByClassName('menu opacity-100');
        if (openMenus.length >= 1) {
            Array.from(openMenus).forEach(menu => {
                hideMenu(menu);
            });
        }
        showMenu(msgEl);
    });

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

    // ─── Style classes ────────────────────────────────
    const bubbleClass = isStartSide
        ? 'bg-gradient-to-bl from-[#2d3c44] to-[#252b3b] rounded-tr-2xl rounded-tl-2xl rounded-br-2xl  rounded-bl-2xl rounded-l-none'
        : 'bg-gradient-to-br from-[#33334f] to-[#1E1E2E] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl  rounded-br-2xl rounded-r-none';

    // ─── Root message container ───────────────────────
    const msgEl = document.createElement('div');
    msgEl.className = `msg relative ${bubbleClass} rtl text-white pb-0 pt-2.5 pr-3 pl-3 min-w-[8.75rem] max-w-xs md:max-w-120 shadow-sm hover:shadow-md transition-shadow wrap-anywhere`;
    msgEl.dataset.msgId = msgId;

    // ─── Reply (if exists) ────────────────────────────
    if (reply) {
        const replyEl = createReplyMsgElement(reply, isRightAligned);
        msgEl.appendChild(replyEl);
    }

    // ─── Message text ─────────────────────────────────
    const textEl = document.createElement('span');
    renderMessageText(textEl, text);

    // ─── Metadata row ─────────────────────────────────
    const metaEl = document.createElement('div');
    metaEl.className = 'metadata flex items-center gap-1 pb-1.5 mt-1 text-xs text-gray-400 opacity-80 justify-start';

    // ─── Reactions ────────────────────────────────────
    const [currentReactionsEl, quickReactEl, emojiPanelEl] = createReactions(msgEl, msgId, reactions, isRightAligned);

    // ─── Metadata ────────────────────────────
    if (isOwnMessage && loading) {
        metaEl.appendChild(loading);
    }

    metaEl.append(sendTime, createHiddenMsgId(msgId), tick);
    msgEl.append(textEl, emojiPanelEl, metaEl);
    metaEl.append(quickReactEl);
    metaEl.append(currentReactionsEl);

    addDoubleClickReply(msgEl);
    addTouchClearSelection(msgEl);
    addRightClickOptions(msgEl, msgId, text);
    return msgEl;
}

export function createTickIcon(isRead = false) {
    const tick = document.createElement('div');
    tick.className = 'message-tick hidden pb-[10px]';
    if (!isRead) {
        tick.innerHTML = `
      <svg id="single-tick" class="w-7 h-4 stroke-[#e8ffa3] stroke-2 fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 16 15">
        <polyline class="tick1" points="2,8 6,11.5 14,3" />
      </svg>
    `;
    } else {
        tick.innerHTML = `
      <svg id="dubble-tick" class="w-7 h-4 stroke-[#e8ffa3] stroke-2 fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 26 15">
        <polyline class="tick1" points="2,8 6,11.5 14,3" />
        <polyline class="tick2 -translate-x-1.5 animate-[appear_0.35s_ease-out_0.15s_forwards] " points="15,10 16,12 25,2" />
      </svg>
    `;
    }
    return tick;
};

export function createLoadingIcon() {
    const loading = Object.assign(document.createElement('span'), { className: "msg-loading hidden" });
    loading.innerHTML = `
    <svg class="w-7 h-4 stroke-[#e8ffa3] pb-[5px] stroke-2 fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" class="clock-bg" />
      <g class="clock-hand origin-[12px_12px] animate-spin">
        <line x1="12" y1="12" x2="12" y2="6" stroke-width="2"/>
        <line x1="12" y1="12" x2="16" y2="12" stroke-width="2"/>
      </g>
    </svg>
  `;
    return loading;
}

export function addSendTimeToMsg(timestamp, isRightAligned) {
    const sendTime = document.createElement('div');
    const msgDate = timestamp ? new Date(timestamp * 1000) : new Date();

    const h = msgDate.getHours();
    const m = msgDate.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const timeText = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    sendTime.textContent = timeText;

    const style = isRightAligned === 'start'
        ? 'text-[#6d87a8]'
        : 'text-[#9b8dde]';

    sendTime.className = `send-time ltr text-base ${style} pb-[4px] select-none`;
    const fullDate = msgDate.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        year: 'numeric',
    });

    const tooltip = document.createElement('div');
    tooltip.textContent = fullDate;
    tooltip.className = `
        absolute hidden
        rounded-md bg-[#212936]
        px-3 py-1 text-sm text-gray-800 dark:text-gray-200
        shadow-lg border-none
        whitespace-nowrap
        pointer-events-none
        z-1000
  `.trim().replace(/\s+/g, ' ');
    document.body.appendChild(tooltip);

    let timerId = null;
    const showTooltip = (e) => {
        const rect = sendTime.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width - 90}px`;
        tooltip.style.top = `${rect.top + 50}px`;
        tooltip.classList.remove('hidden');
        tooltip.classList.add('block');
        tooltip.style.transform = 'translate(-50%, -100%)';
    };

    const hideTooltip = () => {
        if (timerId) clearTimeout(timerId);
        tooltip.classList.remove('block');
        tooltip.classList.add('hidden');
    };

    sendTime.addEventListener('mouseenter', () => {
        timerId = setTimeout(showTooltip, 800);
    });
    sendTime.addEventListener('mouseleave', hideTooltip);

    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-flex';

    wrapper.appendChild(sendTime);

    return wrapper;
}

export function addMessage(msgData) {
    const currentReceiver = getReceiverUsername();
    if (currentReceiver) {
        addMessageToCache(currentReceiver, msgData);
    }

    const msgId = msgData.id || msgData.tmp_id;
    const text = msgData.text || '';
    const fileUrl = msgData.file || null;
    const sender = msgData.sender === getSenderUsername() ? 'self' : 'other';
    const isRead = msgData.is_read;
    const timestamp = msgData.timestamp;
    const reply = msgData.reply;
    const reactions = msgData.reactions || [];

    const isRightAligned = msgData.sender === getSenderUsername() ? 'end' : 'start'
    const sendTime = addSendTimeToMsg(timestamp, isRightAligned);
    const loading = createLoadingIcon();
    const wrapper = document.createElement('div');
    const tick = createTickIcon(isRead);

    wrapper.className = 'chat-msg flex relative justify-' + isRightAligned;
    let content = null;

    if (fileUrl?.trim()) {
        content = createFilePreviewClipboard(msgId, fileUrl, sendTime, tick);
    } else if (text) {
        content = createMessageElement(msgId, reply, text, sender, sendTime, tick, loading, reactions, isRightAligned);
    }

    if (content) wrapper.appendChild(content);

    const isValidTs = Number.isFinite(timestamp) && timestamp > 0;
    if (isValidTs) {
        state.beforeTs = timestamp;
    }

    return wrapper;
}