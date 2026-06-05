function applyTheme(mode) {
    const chatLogs = document.querySelector(".chat-logs");
    if (!chatLogs) return;

    const sideBar = document.querySelector("#sidebar-chatList-container");
    const sideBarBtn = document.querySelector("#sidebar-action-btn");
    const header = document.querySelector(".chat-box-header");

    if (mode === "dark") {
        chatLogs.style.backgroundColor = "#bdcdffcc";
        sideBar.style.backgroundColor = "#120c28";
        sideBarBtn.style.backgroundColor = "#0b071a";
        chatLogs.classList.remove("backdrop-blur-sm");
    } else {
        chatLogs.style.backgroundColor = "#1f1f34d4";
        sideBar.style.backgroundColor = "#121221e8";
        sideBarBtn.style.backgroundColor = "#0d0e1a";
        header.style.backgroundColor = "#141429"
        chatLogs.classList.add("backdrop-blur-sm");
    }
}

function ChangeStyle(isCache) {
    const chatLogs = document.querySelector(".chat-logs");
    if (!chatLogs) return;

    const currentMode = sessionStorage.getItem("themeMode");

    if (isCache) {
        applyTheme(currentMode);
        return;
    } else {
        chatLogs.classList.add("transition-colors", "duration-700", "ease-in-out");
    }

    const newMode = currentMode === "dark" ? "light" : "dark";
    applyTheme(newMode);
    sessionStorage.setItem("themeMode", newMode);
}

document.addEventListener('DOMContentLoaded', () => {
    ChangeStyle(true);
});
