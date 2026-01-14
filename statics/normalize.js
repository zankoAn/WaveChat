// ==================== Security & Helpers ====================
const escapeHtml = (text) => {
    let processedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    processedText = linkify(processedText);
    processedText = processedText.replace(/\n/g, '<br>');
    return processedText
}

const linkify = (text) => {
    const urlRegex = /((https?:\/\/)|(www\.)|(t\.me))[^\s]+/g;

    return text.replace(urlRegex, (url) => {
        let href = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            href = 'http://' + url;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
};

const setMsgDirection = (msg, text) => {
    let counter = 0;
    for (const chr of text) {
        const UnicodeCode = chr.charCodeAt();
        if (UnicodeCode >= 33 & UnicodeCode <= 122) {
            counter += 1
        }
    }
    if (counter > text.length / 2) {
        msg.style.direction = "ltr"
    }
}