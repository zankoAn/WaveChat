import { sendWS, closeSideBar } from "./main.js";
import {
    getSenderUsername,
    addToChatList,
    saveChatList,
    deleteFromChatList,
    setCurrentChatPartner,
    getChatList
} from "./cache.js";


const addBtn = document.getElementById('sidebar-addBtn');
const promptDiv = document.getElementById('sidebar-prompt');
const saveBtn = document.getElementById('sidebar-saveBtn');
const chatNameInput = document.getElementById('sidebar-chatName');
const chatList = document.getElementById('sidebar-chatList');

addBtn.onclick = () => {
    promptDiv.style.display = 'flex';
    chatNameInput.focus();
}

chatNameInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        promptDiv.style.display = "none";
    }

    if (e.key === 'Enter') {
        const chatName = chatNameInput.value.trim();
        if (!chatName) return;
        const validPattern = /^[a-zA-Z0-9]+$/;
        if (!validPattern.test(chatName)) {
            chatNameInput.classList.replace("focus:border-teal-600", "focus:border-red-500");
            chatNameInput.focus();
            chatNameInput.select();
            return;
        };
        addToChatList(chatName);
        addChatNameToSideBar(chatName);
        sendWS({ action: "initialize", chats: [{ chat: chatName }], receiver: chatName, sender: getSenderUsername() });
    }
})

saveBtn.onclick = () => {
    const chatName = chatNameInput.value.trim();
    if (!chatName) return;
    const validPattern = /^[a-zA-Z0-9]+$/;
    if (!validPattern.test(chatName)) {
        chatNameInput.classList.replace("focus:border-teal-600", "focus:border-red-500");
        chatNameInput.focus();
        chatNameInput.select();
        return;
    };
    addToChatList(chatName);
    addChatNameToSideBar(chatName);
    sendWS({ action: "initialize", chats: [{ chat: chatName }], receiver: chatName, sender: getSenderUsername() });
};

export function addChatNameToSideBar(chatName) {
    const chatExists = [...document.querySelectorAll("li")].some(el => el.dataset['value'] === chatName);
    if (chatExists) return;

    const chat = createChatItem(chatName);
    chatList.appendChild(chat);

    chatList.addEventListener('dragover', e => {
        const isLi = e.target.closest('li');
        if (isLi) e.preventDefault();
    });

    chatNameInput.value = '';
    promptDiv.style.display = 'none';
    state.setunreadCount(chatName, 0)
}

export function loadLocalChats() {
    const chats = getChatList();
    chats.forEach(chat => {
        addChatNameToSideBar(chat.chat.toLowerCase());
    })
    return chats;
}

export function clickOnChat(target) {
    closeSideBar();

    document.querySelectorAll('.chat').forEach(chat => {
        chat.removeAttribute('data-active');
    });
    target.setAttribute('data-active', 'true');
    document.querySelector("#chat-input-text")?.focus();
    target.querySelector('.chat-unread-badge').textContent = '';
    target.querySelector('.chat-unread-badge').classList.add("hidden");
    const chatName = target.dataset.value;

    setCurrentChatPartner(chatName);
    state.setActiveChat(chatName, true);

    const first = $.logs.firstElementChild;
    $.logs.innerHTML = '';
    $.logs.appendChild(first);
    state.clearUnreadChat(chatName);
    sendWS({ action: "get_history", chat: chatName });
    scrollToBottom();
}

function syncChatsWithOrder() {
    const order = [...document.querySelectorAll('li[data-value]')].map(el => el.dataset.value);
    const chats = getChatList();
    const orderMap = new Map();
    order.forEach((name, idx) => orderMap.set(name, idx));
    chats.sort((a, b) => {
        const aIdx = orderMap.has(a.chat) ? orderMap.get(a.chat) : Infinity;
        const bIdx = orderMap.has(b.chat) ? orderMap.get(b.chat) : Infinity;
        return aIdx - bIdx;
    });
    saveChatList(chats);
}

export function createChatItem(chatName) {
    const li = document.createElement('li')
    li.dataset.value = chatName;
    li.draggable = true;
    li.className = `chat ${chatName} group relative flex items-center justify-between gap-4 px-6 py-6
        bg-transparent hover:bg-[#2e384991] active:bg-[#616d81]
        border-b border-gray-800/30 last:border-none
        before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
        before:h-0 before:w-1.5 before:bg-emerald-500/60
        before:transition-all before:duration-200
        hover:before:h-[12%]
        group-hover:before:h-[24%]
        data-[active]:before:h-[70%]
        data-[active]:before:bg-emerald-500 
        data-[active]:bg-[#52617b85]
        cursor-pointer overflow-hidden select-none`;

    li.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', chatName);
        li.classList.add('opacity-50');
    });

    li.addEventListener('dragend', () => li.classList.remove('opacity-50'));

    li.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        li.classList.add('bg-[#2e3849]/30');
    });

    li.addEventListener('dragleave', () => li.classList.remove('bg-[#2e3849]/30'));

    li.addEventListener('drop', e => {
        e.preventDefault();
        li.classList.remove('bg-[#2e3849]/30');

        const draggedName = e.dataTransfer.getData('text/plain');
        const draggedEl = document.querySelector(`li[data-value="${draggedName}"]`);
        if (!draggedEl || draggedEl === li) return;

        const rect = li.getBoundingClientRect();
        const after = (e.clientY - rect.top) > (rect.height / 2);
        if (after) {
            li.after(draggedEl);
        } else {
            li.before(draggedEl);
        };
        syncChatsWithOrder();
    });


    const content = document.createElement('div');
    content.className = 'flex-1 min-w-0 flex flex-col gap-y-2.5';

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'relative flex-shrink-0';

    const avatar = document.createElement('div');
    avatar.className = 'w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-600/40 flex items-center justify-center text-white font-medium text-xl select-none ring-1 ring-gray-700/50';

    avatarContainer.appendChild(avatar);
    avatar.innerHTML = `<img src="/static/profile.jpg" alt="" class="w-full h-full object-cover rounded-full">`;

    li.appendChild(avatarContainer);

    const name = document.createElement('div');
    name.className = 'chat-name font-medium text-[17px] truncate leading-tight';
    if (getSenderUsername() === chatName) {
        name.textContent = "Saved Messages";
    } else {
        name.textContent = chatName;
    }
    content.appendChild(name);

    const msg = document.createElement('div');
    msg.className = 'chat-last-msg-text text-base text-gray-300 truncate leading-tight';
    content.appendChild(msg);

    li.appendChild(content);

    const right = document.createElement('div');
    right.className = 'flex flex-col items-end gap-1.5 shrink-0';

    const time = document.createElement('span');
    time.className = 'chat-last-msg-time text-[14px] text-gray-400 font-normal transition-all duration-200 ease-out group-hover:opacity-0';
    right.appendChild(time);

    const badge = document.createElement('span');
    badge.className = 'chat-unread-badge hidden flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-[#d45252] text-white text-[13px] font-medium leading-none px-1.5';
    right.appendChild(badge);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', 'Del Chat');

    deleteBtn.innerHTML = `
        <svg class="w-[25px] h-[25px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
        </svg>
    `;
    deleteBtn.className = `
        absolute right-[25px] top-[50px] -translate-y-1/2
        opacity-0 group-hover:opacity-100
        scale-90 group-hover:scale-100
        transition-all duration-200 ease-out
        text-gray-400 hover:text-red-400 active:text-red-500
        hover:bg-red-500/15 hover: cursor-pointer active:bg-red-500/25
        rounded-full
        focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-1 focus:ring-offset-gray-900
        z-10
    `;
    right.appendChild(deleteBtn);

    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        li.remove();
        deleteFromChatList(chatName);
    })
    li.appendChild(right);

    li.addEventListener("click", e => { clickOnChat(e.currentTarget); closeSideBar() });
    return li;
}

function updateChatLastMsgTime(targetChat, timestamp) {
    const chat = document.querySelector(`.chat.${targetChat}`);
    if (!chat) return;

    let dateObj = new Date();
    if (timestamp) {
        dateObj = new Date(timestamp * 1000);
    }

    const now = new Date();
    const diffMs = now - dateObj;
    const diffHours = diffMs / (1000 * 60 * 60);

    let timeText;
    if (diffHours < 24) {
        timeText = dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    } else {
        timeText = dateObj.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit'
        });
    }
    chat.querySelector(".chat-last-msg-time").textContent = timeText;
}

function updateChatLastMsgTxt(targetChat, lastTextMsg) {
    const chat = document.querySelector(`.chat.${targetChat}`);
    if (!chat) return;

    if (lastTextMsg) {
        chat.querySelector(".chat-last-msg-text").textContent = lastTextMsg;
    }
}

export function updateChatUndreadCount(targetChat) {
    const chat = document.querySelector(`.chat.${targetChat}`);
    if (!chat) return;

    const unreadCount = state.getUnreadCount(targetChat);
    const badge = chat.querySelector(".chat-unread-badge");
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

export function UpdateChatMetadata(targetChat, lastTextMsg, timestamp = 0) {
    updateChatLastMsgTime(targetChat, timestamp);
    updateChatLastMsgTxt(targetChat, lastTextMsg);
}

loadLocalChats()
