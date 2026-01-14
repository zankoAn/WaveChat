
let IsImageOpen = false;
const $ = {
    logs: document.getElementById('chat-logs'),
};

// ==================== Close Image ====================
const closeImage = () => {
    if (!IsImageOpen) return

    const chatMsg = document.querySelector(".chat-msg.overlay");
    const overlay = chatMsg.offsetParent.querySelector(".overlay");
    const img = chatMsg.querySelector("img");
    const sendTime = chatMsg.querySelector(".send-time");
    const sender = chatMsg.classList[1]

    chatMsg.firstChild.style.boxShadow = "0 2px 8px #0000001a";
    chatMsg.firstChild.style.backgroundColor = sender === "other" ? "white" : "#5A5EB9"
    chatMsg.classList.toggle("overlay");
    overlay.classList.add("hidden");
    sendTime.style.display = "block";
    img.style.scale = 1;
    IsImageOpen = false;
}

const openImage = (e) => {
    const img = e.target;

    if (IsImageOpen) {
        if (img.style.scale >= 3) {
            closeImage();
        } else {
            if (img.style.scale) {
                img.style.scale = (parseInt(img.style.scale) + 1);
            } else {
                img.style.scale = 1.5;
            }
        }
        return
    };

    img.offsetParent.classList.toggle("overlay");
    img.offsetParent.querySelector(".message-tick").style.display = "none";
    img.offsetParent.querySelector(".send-time").style.display = "none";
    img.parentElement.style.boxShadow = "unset";
    img.parentElement.style.backgroundColor = "unset";

    IsImageOpen = true;
    document.querySelector(".overlay").classList.toggle("hidden");
    $.logs.style.scrollBehavior = "unset";
}


const createImgElement = (img_url, sendTime, tick) => {
    const content = document.createElement('div');
    content.className = 'msg img';

    const metadata = document.createElement('div');
    metadata.className = 'metadata';

    const img = document.createElement('img');
    img.src = img_url;
    img.addEventListener('click', openImage);

    content.appendChild(img);
    metadata.appendChild(tick);
    metadata.appendChild(sendTime);
    content.appendChild(metadata);
    return content;
}

const validateIsImageFile = (file, setSystemStatus) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        setSystemStatus('فقط فایل‌های تصویری (JPG, PNG, WebP) مجاز هستند.', "error");
        e.target.value = '';
        return false;
    }
    return true;
}


document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && IsImageOpen) {
        closeImage()
    };
});