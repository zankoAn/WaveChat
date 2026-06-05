import { sendWS, connectWS } from "./main.js";
import { loadLocalChats } from "./chatListManager.js"
import { addToChatList, setCurrentUser, getReceiverUsername } from "./cache.js"

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const authError = document.getElementById("auth-error");
const modal = document.getElementById("userModal");

const loginUsernameElem = document.getElementById("login-username");
const loginPasswordElem = document.getElementById("login-password");
const loginBtn = document.getElementById("loginBtn");

const registerUsernameElem = document.getElementById("register-username");
const registerPasswordElem = document.getElementById("reg-password");
const registerConfirmedPasswordElem = document.getElementById("reg-confirm-password");
const registerBtn = document.getElementById("registerBtn");

setTimeout(() => loginUsernameElem?.focus(), 0);

tabLogin.addEventListener("click", () => {
    formLogin.classList.remove("hidden");
    formRegister.classList.add("hidden");
    hideError();
    tabLogin.classList.add("text-teal-500", "border-teal-600");
    tabLogin.classList.remove("text-gray-400", "border-transparent");
    tabRegister.classList.remove("text-teal-500", "border-teal-600");
    tabRegister.classList.add("text-gray-400", "border-transparent");
    loginUsernameElem.focus();
});

tabRegister.addEventListener("click", () => {
    formRegister.classList.remove("hidden");
    formLogin.classList.add("hidden");
    hideError();
    tabRegister.classList.add("text-teal-500", "border-teal-600");
    tabRegister.classList.remove("text-gray-400", "border-transparent");
    tabLogin.classList.remove("text-teal-500", "border-teal-600");
    tabLogin.classList.add("text-gray-400", "border-transparent");
    registerUsernameElem.focus();
});

function showError(message) {
    authError.textContent = message;
    authError.classList.remove("hidden");
}

function hideError() {
    authError.textContent = "";
    authError.classList.add("hidden");

    [loginUsernameElem, registerUsernameElem].forEach(elem => {
        elem.classList.remove("border-red-500", "focus:border-red-500");
    });
}


async function handleAuthRequest(endpoint, payload) {
    const url = `${window.location.origin}/auth/${endpoint}/`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `خطای سرور: ${response.status}`);
        }
        return true;

    } catch (error) {
        showError(error.message);
        return false;
    }
}

function finalizeAuth(username) {
    modal.classList.replace("flex", "hidden");
    setCurrentUser(username);
    addToChatList(username);

    state.setActiveChat(getReceiverUsername(), true);
    state.setActiveChat(username, true);

    sendWS({ action: "initialize", chats: [{ chat: username }], receiver: username, sender: username });
    loadLocalChats();
    connectWS();
}

// forms and validation

async function processLogin() {
    hideError();
    const username = loginUsernameElem.value.trim();
    const password = loginPasswordElem.value.trim();

    if (!username || !password) {
        showError("لطفاً نام کاربری و رمز عبور را وارد کنید.");
        return;
    }

    const success = await handleAuthRequest("login", { username, password });
    if (success) {
        finalizeAuth(username);
    }
}

async function processRegister() {
    hideError();
    const username = registerUsernameElem.value.trim();
    const password = registerPasswordElem.value.trim();
    const confirmed_password = registerConfirmedPasswordElem.value.trim();

    const validPattern = /^[a-zA-Z0-9]+$/;

    if (!username || username.length < 3) {
        showError("طول یوزرنیم باید بیشتر از 3 کاراکتر باشد.");
        registerUsernameElem.classList.add("border-red-500", "focus:border-red-500");
        registerUsernameElem.focus();
        return;
    }

    if (!validPattern.test(username)) {
        showError("فقط حروف انگلیسی و عدد برای یوزرنیم مجاز است.");
        registerUsernameElem.classList.add("border-red-500", "focus:border-red-500");
        registerUsernameElem.focus();
        return;
    }

    if (!password || password.length < 6) {
        showError("رمز عبور باید حداقل 6 کاراکتر باشد.");
        registerPasswordElem.focus();
        return;
    }

    if (password !== confirmed_password) {
        showError("رمز عبور و تایید رمز عبور همخوانی ندارند.");
        registerPasswordElem.focus();
        return;
    }

    const payload = { username, password, confirmed_password };
    const success = await handleAuthRequest("register", payload);
    if (success) {
        finalizeAuth(username);
    }
}

// Event Listeners

loginBtn.onclick = () => { processLogin(); };
registerBtn.onclick = () => { processRegister(); };

[loginUsernameElem, loginPasswordElem].forEach(input => {
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            processLogin();
            e.preventDefault();
        }
    });
});

[registerUsernameElem, registerConfirmedPasswordElem, registerPasswordElem].forEach(input => {
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            processRegister();
            e.preventDefault();
        }
    });
});