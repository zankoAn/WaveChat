import { getReceiverUsername } from "./cache.js";


export function showReply(msgEl) {
    const rp = document.getElementById('reply-preview');
    document.getElementById('reply-from').textContent = 'پاسخ به ' + getReceiverUsername();
    document.getElementById('reply-text').textContent = msgEl.querySelector(".text-part").textContent.trim();
    rp.dataset.parentId = msgEl.dataset.id;
    rp.classList.remove('hidden');
    document.getElementById('chat-input-text').focus();
    state.replyId = msgEl.querySelector(".msgId").id.replace("id_", "")
}

const scrollToRyplidMessage = (msgId) => {
    const targetMsg = document.getElementById('id_' + msgId);
    if (targetMsg) {
        const parentElm = targetMsg.parentNode?.parentNode?.parentNode
        parentElm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        parentElm.classList.add(
            'bg-[#21293633]',
            'transition-all',
            'duration-100',
            'ease-out',
            'py-1'
        );
        setTimeout(() => {
            parentElm.classList.remove('bg-[#21293633]', 'py-1');
        }, 1200);
    }
};

export function createReplyMsgElement(reply, dynamicJustify) {
    const replyEl = document.createElement('div');
    const color = dynamicJustify === 'start'
        ? 'bg-[#5b759df0] before:bg-indigo-200'
        : 'bg-[#494e71] before:bg-indigo-200'

    replyEl.className = `reply relative reply text-sm rounded-e-md ${color} mb-1 p-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[4px] before:rounded-tl-[4px] cursor-pointer`;
    replyEl.style.cursor = 'pointer';
    replyEl.textContent = reply.preview.slice(0, 30) + (reply.preview.length > 30 ? "…" : "");
    replyEl.addEventListener('click', (e) => {
        e.stopPropagation();
        scrollToRyplidMessage(reply.id);
    });
    return replyEl;
}

export function closeReply() {
    document.getElementById('reply-preview').classList.add('hidden');
    delete document.getElementById('reply-preview').dataset.parentId;
    state.replyId = 0;
}

document.getElementById('reply-cancel').onclick = () => { closeReply() };
