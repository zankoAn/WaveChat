import { sendWS } from "./main.js";
import { getSenderUsername, getReceiverUsername } from "./cache.js";

// Emoji shadow colors
const EMOJI_SHADOW = {
    "🤗": "#ff6b6b", "❤️": "#e63946", "💕": "#ff8fab", "💋": "#ff4d6d", "😐": "#ff5252",
    "😖": "#7b2cbf", "🫀": "#ff7f50", "🥴": "#6a4c93", "😍": "#ff9f1c", "🥰": "#ffb703",
    "💞": "#ff6f91", "💘": "#ff4c9a", "😘": "#ff7c7c", "😚": "#ff8a70",
    "😻": "#ffa0c9", "🥹": "#ffb3a7", "😊": "#ffd166", "☺️": "#ffe066", "🙈": "#c5e1a5",
    "🥺": "#f8bbd0", "😽": "#ffab91", "🥲": "#ffab40",
    "😜": "#ffb84d", "🤭": "#ffb3b3", "☹️": "#b0bec5",
    "🫶": "#ff4081",
    "💍": "#ffd700", "🌸": "#ff66b2",
    "🕊️": "#81d4fa", "🍓": "#ff1744", "🍒": "#d50000", "🍰": "#ffb84d",
    "🎀": "#ff80ab", "🫂": "#ff7043",
    "😂": "#ff5252", "👍": "#4caf50", "🔥": "#ff5722", "🥳": "#ff9800",
    "🤔": "#8e44ad", "🙌": "#27ae60", "😢": "#3498db", "🤪": "#e67e22"
};

const panelTrigerEmoji = "🫂";

let hidePanelTimer = null;
const UI = {
    HIDE_DELAY_MS: 180,
    QUICK_REACT_DELAY_MS: 150,
    COLORS: {
        panel: '#222b3f',
        activeReaction: '#cbfffcde'
    }
};

function isTouchDevice() {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
}

function getRealMessageId(tmpId) {
    const el = document.querySelector(`[data-tmp-id="${tmpId}"]`);
    return el?.id?.replace("id_", "") || tmpId;
}

function isMyReaction(element) {
    return element.classList.contains(getSenderUsername());
}

function sendReactionToServer(emoji, msgIdOrTmp, action = "add") {
    const payload = {
        action: "reaction",
        type: action,
        message_id: getRealMessageId(msgIdOrTmp),
        emoji,
        receiver: getReceiverUsername()
    };
    sendWS(payload);
}

export function updateReactionsBoxVisibility(reactionsBox) {
    let bg = "bg-[#dae7ff]"
    if (reactionsBox.classList.contains("start")) {
        bg = "bg-[#e5ffe8]"
    }
    if (!reactionsBox.children.length) {
        reactionsBox.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
        reactionsBox.classList.remove('opacity-100', 'scale-100', bg);
    } else {
        reactionsBox.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
        reactionsBox.classList.add('opacity-100', 'scale-100', bg);
    }
}

function hideEmojiPanel(emojiPanel) {
    hidePanelTimer = setTimeout(() => {
        emojiPanel.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
        emojiPanel.classList.add('opacity-0', 'pointer-events-none', 'scale-90');
    }, UI.HIDE_DELAY_MS);
}

export function showEmojiPanel(emojiPanel) {
    clearTimeout(hidePanelTimer);
    emojiPanel.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
    emojiPanel.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
}

export function createSingleReactionEmoji(emoji, msgId, reactionsContainer, senderUser = null) {
    const sender = senderUser ? senderUser : getSenderUsername();
    const span = document.createElement('span');
    span.className = `emoji ${sender} text-base cursor-pointer select-none transition-transform hover:scale-110 active:scale-90 text-lg hover:scale-125 hover:-rotate-6 hover:shadow-xl hover:filter hover:saturate-150`;
    span.textContent = emoji;
    span.style.filter = `drop-shadow(2px 4px 6px ${EMOJI_SHADOW[emoji]}`;
    span.dataset.emoji = emoji;

    span.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isMyReaction(span)) return;

        span.remove();
        sendReactionToServer(emoji, msgId, "del");
        updateReactionsBoxVisibility(reactionsContainer);
    });
    reactionsContainer.appendChild(span);
}

function createQuickReactionButton(msg, quickRPos, emojiPanel) {
    const quick = document.createElement('div');
    quick.className = `quick-react absolute ${quickRPos} -bottom-[5px] bg-[#222b3f] p-1 rounded-full z-20 opacity-0 pointer-events-none transition-all duration-200 scale-90`;

    const btn = document.createElement('span');
    btn.className = 'text-sm cursor-pointer transition-transform hover:scale-125 active:scale-110';
    btn.textContent = panelTrigerEmoji;
    btn.dataset.emoji = panelTrigerEmoji;
    quick.appendChild(btn);

    quick.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (emojiPanel.classList.contains('opacity-100')) {
            hideEmojiPanel(emojiPanel);
        } else {
            showEmojiPanel(emojiPanel);
        }
    });

    if (!isTouchDevice()) {
        quick.addEventListener('mouseenter', () => {
            showEmojiPanel(emojiPanel);
        });
    }
    quick.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!emojiPanel.matches(':hover')) {
                hideEmojiPanel(emojiPanel);
            }
        }, UI.QUICK_HIDE_DELAY);
    });

    msg.addEventListener('mouseenter', () => {
        quick.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
        quick.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
    });

    msg.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!quick.matches(':hover') && !emojiPanel.matches(':hover')) {
                quick.classList.add('opacity-0', 'pointer-events-none', 'scale-90');
                quick.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
            }
        }, UI.QUICK_HIDE_DELAY);
    });

    return quick;
}

export function createReactPanel(msgEl, msgId, panelPos) {
    const panel = document.createElement('div');
    panel.className = `emoji-panel absolute grid grid-col-1 ${panelPos} -bottom-[13px] bg-[#222b3f] p-2.5 z-[30] rounded-full backdrop-blur-md
        opacity-0 pointer-events-none scale-90 transition-all duration-200 max-h-44 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`;

    Object.entries(EMOJI_SHADOW).forEach(([emoji, _]) => {
        const span = document.createElement('span');
        span.className = 'text-base cursor-pointer select-none transition-transform hover:scale-110 active:scale-90';
        span.textContent = emoji;
        span.dataset.emoji = emoji;
        span.addEventListener('click', () => {
            toggleReaction(emoji, msgId, msgEl);
            hideEmojiPanel(panel);
        });
        panel.appendChild(span);
    });

    panel.addEventListener('mouseenter', () => {
        clearTimeout(hidePanelTimer, panel._hideTimer);
    });

    const handleMouseLeave = hideEmojiPanel.bind(null, panel);
    panel.addEventListener('mouseleave', handleMouseLeave);
    panel.addEventListener('mouseleave', () => {
        panel._hideTimer = setTimeout(() => hideEmojiPanel(panel), UI.HIDE_DELAY);
    });
    return panel;
}

function toggleReaction(emoji, msgId, msgEl) {
    const reactionsBox = msgEl.querySelector('.current-reactions');
    const existing = reactionsBox.querySelector(`[data-emoji="${emoji}"]`);

    if (existing && isMyReaction(existing)) {
        existing.remove();
        sendReactionToServer(emoji, msgId, "del");
    } else if (!existing) {
        createSingleReactionEmoji(emoji, msgId, reactionsBox);
        sendReactionToServer(emoji, msgId, "add");
    }

    updateReactionsBoxVisibility(reactionsBox);
}

export function createReactions(msgEl, msgId, initialReactions = [], isRightAligned) {
    const isRight = isRightAligned !== "start";
    const quickRPos = isRight ? "-left-[15px]" : "-right-[15px]";
    const panelPos = isRight ? "-left-[20px]" : "-right-[20px]";

    const reactionsBox = document.createElement('div');
    reactionsBox.className = `current-reactions z-10 flex gap-1.5 backdrop-blur-sm rounded-full px-2.5 py-[2px] shadow-md transition-opacity duration-200`;

    const emojiPanel = createReactPanel(msgEl, msgId, panelPos);
    const quickBtn = createQuickReactionButton(msgEl, quickRPos, emojiPanel);

    quickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showEmojiPanel(emojiPanel);
    });
    initialReactions.forEach(group => {
        group.emojis.forEach(emoji => {
            createSingleReactionEmoji(emoji, msgId, reactionsBox, group.sender);
        });
    });
    updateReactionsBoxVisibility(reactionsBox);
    return [reactionsBox, quickBtn, emojiPanel];
}

export function handleIncomingReaction(msg, receiver) {
    const messageEl = $.logs.querySelector(`#id_${msg.id}`)?.parentElement;
    if (!messageEl) return;

    const reactionsEl = messageEl.querySelector(".current-reactions");
    if (!reactionsEl) return;

    const emoji = msg.reaction.emoji;
    const emojiAlreadyExists = reactionsEl.querySelector(`[data-emoji="${emoji}"]`);

    if (msg.status === "add") {
        if (emojiAlreadyExists) return
        createSingleReactionEmoji(emoji, msg.id, reactionsEl, receiver)
        updateReactionsBoxVisibility(reactionsEl);
    }

    else if (msg.status === "del") {
        if (emojiAlreadyExists) {
            emojiAlreadyExists.remove();
            updateReactionsBoxVisibility(reactionsEl);
        }
    }
}
