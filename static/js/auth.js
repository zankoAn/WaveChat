import { sendWS, connectWS } from "./main.js";
import { loadLocalChats } from "./chatListManager.js"
import { addToChatList, setCurrentUser, getReceiverUsername } from "./cache.js"

function saveSenderUsername() {
    const input = document.getElementById("sender_username");
    const sender = input.value.trim();
    const errorElement = document.getElementById("username-error");
    const modal = document.getElementById("userModal");

    const validPattern = /^[a-zA-Z0-9]+$/;

    input.classList.remove("border-red-500", "focus:border-red-500");

    if (!sender || sender.length < 3) {
        errorElement.textContent = "لطفاً یوزرنیم را وارد کنید / طول یوزرنیم بیشتر از 3 کاراکتر باشد.";
        errorElement.classList.replace("hidden", "flex");
        input.classList.add("border-red-500", "focus:border-red-500");
        input.focus();
        return;
    }

    if (!validPattern.test(sender)) {
        errorElement.textContent = "فقط حروف انگلیسی و عدد مجاز است (بدون فاصله و کاراکتر خاص)";
        errorElement.classList.replace("hidden", "flex");
        input.classList.add("border-red-500", "focus:border-red-500");
        input.focus();
        input.select();
        return;
    }

    setCurrentUser(sender);
    modal.classList.replace("flex", "hidden");
    addToChatList(sender);

    state.setActiveChat(getReceiverUsername(), true);
    state.setActiveChat(sender, true);
    sendWS({ action: "initialize", chats: [{ chat: sender }], receiver: sender, sender: sender });
    loadLocalChats();
    connectWS();
}

const saveBtnNewUsername = document.getElementById('saveBtn');
const senderInput = document.getElementById('sender_username');
setTimeout(() => senderInput.focus(), 0)

saveBtnNewUsername.onclick = () => { saveSenderUsername() }

senderInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        saveSenderUsername();
        e.preventDefault();
    }
});
