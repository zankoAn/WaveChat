// ==================== Helpers ====================
export const escapeHtml = (text) => {
    let safe = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    safe = linkify(safe);
    return safe.replace(/\n/g, "<br>");
};

function cleanUrl(rawUrl) {
    try {
        const parts = rawUrl.split("?");
        if (parts.length > 1) {
            const [base, query] = parts;
            const decoded = query
                .split("&")
                .map(p => {
                    const [k, v] = p.split("=");
                    return `${k}=${decodeURIComponent(v)}`;
                })
                .join("&");
            return `${base}?${decoded}`;
        }
        return decodeURIComponent(rawUrl);
    } catch {
        return rawUrl;
    }
}

const linkify = (text) => {
    const urlRegex = /((https?:\/\/)|(www\.)|(t\.me))[^\s]+/gi;

    return text.replace(urlRegex, (rawUrl) => {
        const href = rawUrl.startsWith("http")
            ? rawUrl
            : "http://" + rawUrl;

        let display = cleanUrl(rawUrl);
        const classes = "text-blue-300 hover:text-blue-200 visited:text-purple-300";

        return `<a href="${href}" class="${classes}" target="_blank" rel="noopener noreferrer">${display}</a>`;
    });
};

export function enableLinkifyOnInput(inputEl) {
    inputEl.addEventListener('paste', e => {
        const pasted = e.clipboardData.getData('text');
        if (!pasted) return;

        const urlRegex = /^((https?:\/\/)|(www\.)|(t\.me))[^\s]+$/i;
        if (!urlRegex.test(pasted)) return;

        e.preventDefault();
        const cleaned = cleanUrl(pasted.trim());
        const finalValue = cleaned.startsWith('http')
            ? cleaned
            : 'http://' + cleaned;

        const start = inputEl.selectionStart;
        const end = inputEl.selectionEnd;
        const current = inputEl.value;
        inputEl.value = current.slice(0, start) + finalValue + current.slice(end);
        const newPos = start + finalValue.length;
        inputEl.setSelectionRange(newPos, newPos);
    });
}

export function extractCodeContent(text) {
    if (!text || typeof text !== 'string') return null;

    const matches = text.match(/`/g);
    if (matches.length < 6) {
        return null;
    }

    const result = [];
    let lastIndex = 0;
    const codeBlockRegex = /(`{3,})\s*([\s\S]*?)\1/g;
    let match;
    try {
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const fullMatch = match[0];
            const codeContent = match[2];
            const matchIndex = match.index;

            if (matchIndex > lastIndex) {
                const plainText = text.substring(lastIndex, matchIndex).trim();
                if (plainText) {
                    result.push({ type: 'text', content: plainText });
                }
            }

            if (codeContent.trim()) {
                result.push({ type: 'code', content: codeContent.trim() });
            }

            lastIndex = matchIndex + fullMatch.length;
        }

        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex).trim();
            if (remainingText) {
                result.push({ type: 'text', content: remainingText });
            }
        }
    } catch (e) {
        return [{ type: 'text', content: text }];
    }

    if (result.length === 0 && text.trim()) {
        return [{ type: 'text', content: text }];
    }

    return result;
}

export function detectTextDirection(text) {
    if (!text || typeof text !== 'string') return 'ltr';

    const rtlChars = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const ltrChars = /[a-zA-Z0-9\s]/g;

    const matchRtl = text.match(rtlChars);
    const matchLtr = text.match(ltrChars);

    const countRtl = matchRtl ? matchRtl.length : 0;
    const countLtr = matchLtr ? matchLtr.length : 0;

    return countRtl >= countLtr ? 'rtl' : 'ltr';
}
