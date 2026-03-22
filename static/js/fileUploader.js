const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function closeImageViewer() {
    if (!state.IsImageOpen) return;

    const viewer = document.getElementById('image-full-viewer');
    const viewerImg = document.getElementById('viewer-img');

    if (!viewer || !viewerImg) return;

    viewerImg.classList.remove('scale-100', 'opacity-100');
    viewerImg.classList.add('scale-95', 'opacity-0');
    viewer.classList.add('hidden');
    viewerImg.src = '';
    document.body.style.overflow = '';
    state.IsImageOpen = false;
    state.currentViewerImg = null;
}

function createImageViewer() {
    if (document.getElementById('image-full-viewer')) return;

    const viewer = document.createElement('div');
    viewer.id = 'image-full-viewer';
    viewer.className = 'fixed inset-0 bg-black/95 z-[9999] hidden flex items-center justify-center transition-opacity duration-300';
    viewer.innerHTML = `
        <img id="viewer-img" class="max-h-[92vh] max-w-[96vw] object-contain transition-transform duration-400 scale-95 opacity-0" alt="Full screen image">
        <button id="close-viewer" class="absolute top-4 right-4 text-red-400 text-4xl opacity-80 hover:opacity-100">×</button>
    `;
    document.body.appendChild(viewer);

    viewer.addEventListener('click', (e) => {
        if (e.target.id === 'image-full-viewer' || e.target.id === 'close-viewer') {
            closeImageViewer();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !viewer.classList.contains('hidden')) {
            closeImageViewer();
        }
    });
}

function handleImageClick(e) {
    e.stopPropagation();
    e.preventDefault();

    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;

    const viewer = document.getElementById('image-full-viewer');
    const viewerImg = document.getElementById('viewer-img');

    if (!viewer || !viewerImg) {
        console.warn("Image viewer element not found");
        return;
    }

    viewerImg.src = img.src;
    viewerImg.alt = img.alt || "تصویر بزرگ";

    viewer.classList.remove('hidden');
    viewer.classList.remove('opacity-0');

    setTimeout(() => {
        viewerImg.classList.remove('scale-95', 'opacity-0');
        viewerImg.classList.add('scale-100', 'opacity-100');
    }, 20);

    document.body.style.overflow = 'hidden';

    state.IsImageOpen = true;
}

function createPendingImagePreview(base64, addSendTimeToMsg, sendMessage) {
    const container = document.createElement('div');
    container.className = `
        pending-preview 
        relative w-full max-w-md mx-auto 
        rounded-2xl overflow-hidden shadow-xl 
        bg-gray-900/40 backdrop-blur-md 
        border border-white/10
    `;

    const img = document.createElement('img');
    img.src = base64;
    img.className = `
        w-full max-h-[240px] sm:max-h-[300px] 
        object-contain bg-gradient-to-b from-gray-950/60 to-black/70
        transition-transform duration-300 ease-out
        group-hover:scale-[1.015]
    `;
    img.alt = "پیش‌نمایش عکس";

    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'relative';
    previewWrapper.appendChild(img);

    const actionsBar = document.createElement('div');
    actionsBar.className = `
        flex items-center justify-between 
        px-4 py-3 
        bg-gradient-to-r from-gray-900/80 via-gray-900/70 to-black/80
        border-t border-white/8
    `;

    const statusSection = document.createElement('div');
    statusSection.className = 'flex items-center gap-2.5';

    const sendTime = addSendTimeToMsg(Date.now());
    sendTime.className = 'text-xs text-gray-400/90 font-medium tracking-tight';
    statusSection.append(sendTime);

    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'flex items-center gap-2';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = `
        w-9 h-9 flex items-center justify-center 
        rounded-full bg-black/50 hover:bg-red-900/40 
        text-gray-300 hover:text-red-300 
        transition-all duration-200 
        hover:scale-105 active:scale-95
        border border-white/5 hover:border-red-500/30
    `;
    removeBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
    `;

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = `
        loading-send-btn
        flex items-center gap-2 px-5 py-2 
        rounded-full text-sm font-medium
        bg-gradient-to-r from-blue-600 to-indigo-600 
        hover:from-blue-500 hover:to-indigo-500 
        disabled:from-gray-700 disabled:to-gray-600 
        disabled:cursor-not-allowed disabled:opacity-60
        text-white shadow-lg shadow-blue-900/30
        transition-all duration-200 min-w-[90px]
        hover:shadow-xl hover:shadow-blue-900/40
        active:scale-[0.97]
    `;
    sendBtn.innerHTML = `
        ارسال
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
        </svg>
    `;

    buttonsSection.append(removeBtn, sendBtn);
    actionsBar.append(statusSection, buttonsSection);

    container.append(previewWrapper, actionsBar);

    sendBtn.onclick = async () => {
        if (!container.isConnected) return;

        sendBtn.disabled = true;
        removeBtn.disabled = true;
        sendBtn.innerHTML = `
            در حال ارسال
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
            </svg>
        `;

        const chatMsg = container.closest('.chat-msg');
        if (!chatMsg) return;

        chatMsg.classList.add('sent', 'opacity-90');
        try {
            await sendMessage();
            chatMsg.remove();
        } catch (err) {
            console.error(err);
            sendBtn.disabled = false;
            removeBtn.disabled = false;
            sendBtn.innerHTML = `
                ارسال
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
            `;
        }
    };

    removeBtn.onclick = () => {
        container.closest('.chat-msg')?.remove();
        state.pendingFile = null;
        state.currentPendingWrapper = null;
    };

    return container;
}

export function uploadFileFromClipboard(e, deps) {
    const { setSystemStatus, addSendTimeToMsg, sendMessage } = deps;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFile = getFirstImageFromClipboard(items);
    if (!imageFile) return;

    if (imageFile.size > MAX_FILE_SIZE) {
        setSystemStatus('حجم فایل نباید بیشتر از ۱۰۰ مگابایت باشد.', 'error');
        return;
    }

    state.pendingFile = imageFile;

    const reader = new FileReader();

    reader.onload = (ev) => {
        const base64 = ev.target.result;

        const wrapper = createSelfMessageWrapper();
        const previewContainer = createPendingImagePreview(base64, addSendTimeToMsg, sendMessage);

        const msgDiv = wrapper.querySelector('.msg');
        if (msgDiv) {
            msgDiv.appendChild(previewContainer);
            msgDiv.classList.add(
                'relative', 'overflow-hidden', 'rounded-2xl', 'shadow-lg',
                'bg-gradient-to-b', 'from-gray-900/40', 'to-black/30',
                'border', 'border-white/8', 'transition-all', 'duration-300'
            );
        }

        $.logs.appendChild(wrapper);
        state.currentPendingWrapper = wrapper;

        wrapper.style.opacity = '0';
        wrapper.style.transform = 'translateY(20px)';
        setTimeout(() => {
            wrapper.style.transition = 'all 0.4s ease-out';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
        }, 10);

        scrollToBottom();
    };

    reader.readAsDataURL(imageFile);
    e.preventDefault();
}

function getFirstImageFromClipboard(items) {
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            return item.getAsFile();
        }
    }
    return null;
}

function createSelfMessageWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-msg self';

    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg img';

    wrapper.appendChild(msgDiv);
    return wrapper;
}

export function createFilePreviewClipboard(fileId, urlOrBase64, sendTimeEl, tickEl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg file relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-b from-gray-900/60 to-black/40 border border-white/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]';

    if (fileId) wrapper.dataset.id = fileId;

    let previewEl;
    let downloadBtn = null;

    const isDataURL = urlOrBase64?.startsWith('data:');
    const isRemote = urlOrBase64?.startsWith('http') || urlOrBase64?.startsWith('/media');

    let extension = '';
    if (isRemote) {
        const url = new URL(urlOrBase64, window.location.origin);
        const pathname = url.pathname;
        extension = (pathname.split('.').pop() || '').split('?')[0].toLowerCase();
    } else if (isDataURL) {
        const mimeMatch = urlOrBase64.match(/^data:([^;,]+)[;,]/);
        const mime = mimeMatch ? mimeMatch[1].toLowerCase() : '';
        if (mime.startsWith('image/')) extension = 'image';
        else if (mime.startsWith('video/')) extension = 'video';
        else if (mime.startsWith('audio/')) extension = 'audio';
        else if (mime === 'application/pdf') extension = 'pdf';
    }

    const supportedImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

    if (extension === 'image' || supportedImageExt.includes(extension)) {
        previewEl = document.createElement('img');
        previewEl.src = urlOrBase64;
        previewEl.preload = 'none';
        previewEl.className = 'preview-img w-full h-auto max-w-[400px] max-h-[420px] object-cover transition-transform duration-500 hover:scale-105 cursor-zoom-in rounded-t-2xl';
        previewEl.alt = "تصویر ارسالی";
        previewEl.addEventListener('click', handleImageClick);
    }
    else if (extension === 'video' || ['mp4', 'webm', 'mov'].includes(extension)) {
        previewEl = document.createElement('video');
        previewEl.src = urlOrBase64;
        previewEl.preload = 'none';
        previewEl.controls = true;
        previewEl.className = 'preview-video w-full max-h-[420px] object-cover rounded-t-2xl shadow-inner';
        previewEl.poster = '';
    }
    else if (extension === 'audio' || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
        previewEl = document.createElement('div');
        previewEl.className = `
        w-full max-w-xl mx-auto
        bg-gradient-to-r from-indigo-950/70 via-purple-950/60 to-slate-950/70
        rounded-2xl p-6
        border border-indigo-500/20
        shadow-2xl shadow-black/40
        backdrop-blur-md
    `;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center gap-5';

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'relative flex-shrink-0';
        iconWrapper.innerHTML = `
        <div class="text-6xl opacity-90 animate-pulse-slow">🎧</div>
        <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-full blur-xl opacity-50"></div>
    `;

        const content = document.createElement('div');
        content.className = 'flex-1 min-w-0';

        const filenameEl = document.createElement('div');
        filenameEl.className = 'text-indigo-300/90 text-sm font-medium truncate mb-2';
        var parts = urlOrBase64.split("/")
        filenameEl.textContent = parts[parts.length - 1] || 'Audio Track'; // ← filename رو خودت باید پاس بدی

        const audio = document.createElement('audio');
        audio.src = urlOrBase64;
        audio.preload = 'none';
        audio.controls = true;
        audio.volume = 0.45;
        audio.className = `
        w-full mt-1
        [&_*]:!text-sm
        accent-indigo-500
        [&::-webkit-media-controls-panel]:bg-gradient-to-r 
        [&::-webkit-media-controls-panel]:from-slate-900/90 
        [&::-webkit-media-controls-panel]:to-indigo-950/80
        [&::-webkit-media-controls-panel]:rounded-xl
        [&::-webkit-media-controls-panel]:border 
        [&::-webkit-media-controls-panel]:border-white/5
    `;

        content.append(filenameEl, audio);
        wrapper.append(iconWrapper, content);
        previewEl.appendChild(wrapper);
    }
    else if (extension === 'pdf') {
        previewEl = document.createElement('div');
        previewEl.className = 'preview-pdf relative w-full h-[420px] rounded-t-2xl overflow-hidden border-b border-white/10';

        const iframe = document.createElement('iframe');
        iframe.src = urlOrBase64;
        iframe.className = 'absolute inset-0 w-full h-full';
        iframe.title = "پیش‌نمایش PDF";

        const overlay = document.createElement('div');
        overlay.className = 'absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-4 pointer-events-none';
        overlay.innerHTML = '<span class="text-white/90 text-sm font-medium">PDF • اسکرول کنید</span>';

        previewEl.append(iframe, overlay);
    }
    else {
        previewEl = document.createElement('div');
        previewEl.className = 'preview-generic w-full min-h-[140px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-800/70 to-gray-950/70 rounded-xl p-6 text-center border border-gray-600/40 transition hover:border-gray-400/60';

        const icon = document.createElement('div');
        icon.textContent = '📄';
        icon.className = 'text-6xl mb-3 opacity-80';

        const name = document.createElement('span');
        let fileName = urlOrBase64.split(/[\\/]/).pop() || 'فایل';
        fileName = decodeURIComponent(fileName);
        name.textContent = fileName;
        name.className = 'text-gray-200 font-medium text-lg break-all';

        previewEl.append(icon, name);

        if (isRemote) {
            downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-small-btn mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-medium transition shadow-md hover:shadow-lg active:scale-95';
            downloadBtn.textContent = 'دانلود فایل';
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                const a = document.createElement('a');
                a.href = urlOrBase64;
                a.download = '';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        }
    }

    const meta = document.createElement('div');
    meta.className = 'metadata flex items-center justify-between px-3 py-2.5 bg-black/40 border-t border-white/5 text-xs text-gray-300';

    if (tickEl) meta.appendChild(tickEl);
    if (sendTimeEl) meta.appendChild(sendTimeEl);
    if (downloadBtn) meta.appendChild(downloadBtn);

    const hiddenId = document.createElement('p');
    hiddenId.className = 'msgId hidden';
    hiddenId.id = fileId ? `id_${fileId}` : '';
    meta.appendChild(hiddenId);

    wrapper.append(previewEl, meta);
    return wrapper;
}

export function createFilePreviewLocal(file, addSendTimeToMsg, sendMessage) {
    const isImage = file.type.startsWith('image/');

    const container = document.createElement('div');
    container.className = `
        pending-preview
        relative w-full max-w-md mx-auto
        rounded-2xl overflow-hidden shadow-xl
        bg-gray-900/40 backdrop-blur-md
        border border-white/10
    `;

    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'relative';

    if (isImage) {
        const placeholder = document.createElement('div');
        placeholder.className = `
            w-full max-h-[240px] sm:max-h-[300px]
            flex items-center justify-center
            bg-gradient-to-b from-gray-950/60 to-black/70
            text-gray-400 text-sm
        `;
        placeholder.textContent = 'در حال بارگذاری پیش‌نمایش...';
        previewWrapper.appendChild(placeholder);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = `
                preview-img
                w-full max-h-[240px] sm:max-h-[300px]
                object-contain bg-gradient-to-b from-gray-950/60 to-black/70
                transition-transform duration-300 ease-out
                group-hover:scale-[1.015]
            `;
            img.alt = "پیش‌نمایش عکس";
            previewWrapper.innerHTML = '';
            previewWrapper.appendChild(img);
        };
        reader.readAsDataURL(file);
    } else {
        const content = document.createElement('div');
        content.className = `
            h-[180px] flex flex-col items-center justify-center
            bg-gradient-to-br from-gray-800/70 to-gray-950/70
            text-center p-6
        `;

        const icon = document.createElement('div');
        icon.textContent = getFileIcon(file.type, file.name);
        icon.className = 'text-6xl mb-4 opacity-80';

        const name = document.createElement('div');
        name.textContent = file.name.length > 40 ? file.name.slice(0, 37) + '...' : file.name;
        name.className = 'text-gray-200 font-medium text-base break-all max-w-[90%]';

        const size = document.createElement('div');
        size.textContent = formatFileSize(file.size);
        size.className = 'text-gray-400 text-xs mt-2';

        content.append(icon, name, size);
        previewWrapper.appendChild(content);
    }

    const actionsBar = document.createElement('div');
    actionsBar.className = `
        flex items-center justify-between
        px-4 py-3
        bg-gradient-to-r from-gray-900/80 via-gray-900/70 to-black/80
        border-t border-white/8
    `;

    const statusSection = document.createElement('div');
    statusSection.className = 'flex items-center gap-2.5';

    const sendTime = addSendTimeToMsg(Date.now());
    sendTime.className = 'text-xs text-gray-400/90 font-medium tracking-tight';
    statusSection.appendChild(sendTime);

    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'flex items-center gap-2';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = `
        w-9 h-9 flex items-center justify-center
        rounded-full bg-black/50 hover:bg-red-900/40
        text-gray-300 hover:text-red-300
        transition-all duration-200
        hover:scale-105 active:scale-95
        border border-white/5 hover:border-red-500/30
    `;
    removeBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
    `;

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = `
        loading-send-btn
        flex items-center gap-2 px-5 py-2
        rounded-full text-sm font-medium
        bg-gradient-to-r from-blue-600 to-indigo-600
        hover:from-blue-500 hover:to-indigo-500
        disabled:from-gray-700 disabled:to-gray-600
        disabled:cursor-not-allowed disabled:opacity-60
        text-white shadow-lg shadow-blue-900/30
        transition-all duration-200 min-w-[90px]
        hover:shadow-xl hover:shadow-blue-900/40
        active:scale-[0.97]
    `;
    sendBtn.innerHTML = `
        ارسال
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
        </svg>
    `;

    buttonsSection.append(removeBtn, sendBtn);
    actionsBar.append(statusSection, buttonsSection);

    container.append(previewWrapper, actionsBar);

    sendBtn.onclick = async () => {
        if (!container.isConnected) return;

        sendBtn.disabled = true;
        removeBtn.disabled = true;
        sendBtn.innerHTML = `
            در حال ارسال
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
            </svg>
        `;

        const chatMsg = container.closest('.chat-msg');
        if (!chatMsg) return;

        chatMsg.classList.add('sent', 'opacity-90');
        try {
            await sendMessage();
            chatMsg.remove();
        } catch (err) {
            console.error(err);
            sendBtn.disabled = false;
            removeBtn.disabled = false;
            sendBtn.innerHTML = `
                ارسال
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
            `;
        }
    };

    removeBtn.onclick = () => {
        container.closest('.chat-msg')?.remove();
        state.pendingFile = null;
        state.currentPendingWrapper = null;
    };

    return container;
}

function getFileIcon(mimeType, fileName) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📄';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return '🗄️';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 بایت';
    const k = 1024;
    const sizes = ['بایت', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function uploadFileFromLocal(e, deps) {
    const { setSystemStatus, addSendTimeToMsg, sendMessage } = deps;

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        setSystemStatus?.('حجم فایل نباید بیشتر از ۱۰۰ مگابایت باشد.', 'error');
        return;
    }

    e.target.value = '';
    state.pendingFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const wrapper = createSelfMessageWrapper();
        const previewContainer = createFilePreviewLocal(file, addSendTimeToMsg, sendMessage);
        const msgDiv = wrapper.querySelector('.msg');
        if (msgDiv) {
            msgDiv.appendChild(previewContainer);
            msgDiv.classList.add(
                'relative', 'overflow-hidden', 'rounded-2xl', 'shadow-lg',
                'bg-gradient-to-b', 'from-gray-900/40', 'to-black/30',
                'border', 'border-white/8', 'transition-all', 'duration-300'
            );
        }

        $.logs.appendChild(wrapper);
        state.currentPendingWrapper = wrapper;

        wrapper.style.opacity = '0';
        wrapper.style.transform = 'translateY(20px)';
        setTimeout(() => {
            wrapper.style.transition = 'all 0.4s ease-out';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
        }, 10);
        scrollToBottom();
    }
    reader.readAsDataURL(file);
}


createImageViewer();
