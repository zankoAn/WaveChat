const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function closeImageViewer() {
    if (!state.IsImageOpen) return;

    const viewer = document.getElementById('image-full-viewer');
    const viewerImg = document.getElementById('viewer-img');

    if (!viewer || !viewerImg) return;

    viewerImg.classList.remove('scale-100', 'opacity-100');
    viewerImg.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        viewer.classList.add('hidden');
        viewerImg.src = '';
    }, 200);
    document.body.style.overflow = '';
    state.IsImageOpen = false;
    state.currentViewerImg = null;
}

function createImageViewer() {
    if (document.getElementById('image-full-viewer')) return;

    const viewer = document.createElement('div');
    viewer.id = 'image-full-viewer';
    viewer.className = 'fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] hidden flex items-center justify-center transition-all duration-300 opacity-0';
    viewer.innerHTML = `
        <div class="relative max-h-[92vh] max-w-[96vw] flex items-center justify-center group">
            <img id="viewer-img" class="max-h-[92vh] max-w-[96vw] object-contain rounded-xl shadow-2xl transition-all duration-300 scale-95 opacity-0" alt="Full screen image">
            <button id="close-viewer" class="absolute -top-12 right-0 sm:top-4 sm:-right-12 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xl transition-all duration-200 active:scale-95">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
    `;
    document.body.appendChild(viewer);

    viewer.addEventListener('click', (e) => {
        if (e.target.id === 'image-full-viewer' || e.target.closest('#close-viewer')) {
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

    if (!viewer || !viewerImg) return;

    viewerImg.src = img.src;
    viewerImg.alt = img.alt || "تصویر";

    viewer.classList.remove('hidden');
    setTimeout(() => {
        viewer.classList.remove('opacity-0');
        viewerImg.classList.remove('scale-95', 'opacity-0');
        viewerImg.classList.add('scale-100', 'opacity-100');
    }, 10);

    document.body.style.overflow = 'hidden';
    state.IsImageOpen = true;
}

function createCustomAudioPlayer(url, filename) {
    const playerContainer = document.createElement('div');
    playerContainer.className = 'w-full max-w-[340px] p-4 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-slate-950/60 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col gap-3.5 rtl select-none group/player transition-all duration-300 hover:border-indigo-500/30 relative';

    const audio = document.createElement('audio');
    if (url) {
        audio.src = url;
    }
    audio.preload = 'auto';

    playerContainer.innerHTML = `
        <div class="flex items-center justify-between gap-3 flex-row-reverse">
            <div class="flex-1 min-w-0 flex flex-col justify-center text-right">
                <p class="text-gray-100 font-semibold text-sm truncate tracking-tight" title="${filename}">${filename}</p>
            </div>

            <div class="flex items-center gap-2.5 flex-row">
                <button type="button" class="custom-play-btn w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-300 transform group-hover/player:scale-105">
                    <svg class="play-icon w-4 h-4 fill-current pointer-events-none" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg class="pause-icon w-4 h-4 fill-current hidden pointer-events-none" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <p class="text-slate-400 text-xs font-mono tracking-wider duration-label">00:00 / 00:00</p>
            </div>
        </div>

        <div class="relative w-full h-2 bg-white/5 rounded-full cursor-pointer progress-container group/progress overflow-hidden" style="direction: ltr;">
            <div class="progress-bar absolute top-0 left-0 h-full w-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-300 ease-out"></div>
            <div class="absolute inset-0 bg-white/10 opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none"></div>
        </div>

        <div class="flex items-center justify-between border-t border-white/5 pt-2.5 mt-0.5">
            <div class="relative speed-menu-container">
                <button type="button" class="speed-btn px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-semibold font-mono text-slate-400 hover:text-indigo-400 transition-all active:scale-95 flex items-center gap-0.5" title="سرعت پخش">
                    <span class="speed-label">1.0x</span>
                    <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </button>
                
                <div class="speed-options hidden absolute bottom-full left-0 mb-2 w-16 bg-slate-950/95 border border-white/10 rounded-xl p-1 shadow-xl flex flex-col gap-0.5 z-50 backdrop-blur-md">
                    <button type="button" data-speed="1" class="w-full text-center py-1 text-xs font-mono text-indigo-400 bg-white/5 rounded-lg font-medium">1.0x</button>
                    <button type="button" data-speed="1.5" class="w-full text-center py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">1.5x</button>
                    <button type="button" data-speed="2" class="w-full text-center py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">2.0x</button>
                </div>
            </div>
            
            <div class="flex items-center gap-2 group/volume relative">
                <div class="w-0 group-hover/volume:w-20 transition-all duration-300 flex items-center h-5 overflow-hidden" style="direction: ltr;">
                    <input type="range" min="0" max="1" step="0.01" value="1" class="volume-slider w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none transition-all" style="background: linear-gradient(to right, rgb(99, 102, 241) 100%, rgba(255, 255, 255, 0.2) 100%);">
                </div>
                
                <button type="button" class="mute-btn w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-90" title="صدا">
                    <svg class="volume-up-icon w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    <svg class="volume-mute-icon w-4 h-4 hidden text-rose-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l-2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H3a1 1 0 00-1 1v4a1 1 0 001 1h1.5l2.25 2.25c.63.63 1.72.18 1.72-.71v-10.5c0-.89-1.09-1.34-1.72-.71z"/></svg>
                </button>
            </div>
        </div>
    `;

    playerContainer.appendChild(audio);

    const playBtn = playerContainer.querySelector('.custom-play-btn');
    const playIcon = playerContainer.querySelector('.play-icon');
    const pauseIcon = playerContainer.querySelector('.pause-icon');
    const durationLabel = playerContainer.querySelector('.duration-label');
    const progressContainer = playerContainer.querySelector('.progress-container');
    const progressBar = playerContainer.querySelector('.progress-bar');
    const muteBtn = playerContainer.querySelector('.mute-btn');
    const volUpIcon = playerContainer.querySelector('.volume-up-icon');
    const volMuteIcon = playerContainer.querySelector('.volume-mute-icon');
    const volumeSlider = playerContainer.querySelector('.volume-slider');

    const speedBtn = playerContainer.querySelector('.speed-btn');
    const speedLabel = playerContainer.querySelector('.speed-label');
    const speedOptions = playerContainer.querySelector('.speed-options');

    let previousVolume = 1;

    // تابع کمکی برای رنگ‌آمیزی پویای پس‌زمینه اسلایدر ولوم
    const updateVolumeSliderBackground = (value) => {
        const pct = value * 100;
        volumeSlider.style.background = `linear-gradient(to right, rgb(99, 102, 241) ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%)`;
    };

    const formatTime = (secs) => {
        if (isNaN(secs)) return '00:00';
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    playerContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!speedBtn.contains(e.target)) {
            speedOptions.classList.add('hidden');
        }
    });

    speedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        speedOptions.classList.toggle('hidden');
    });

    speedOptions.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const speed = parseFloat(btn.getAttribute('data-speed'));
            audio.playbackRate = speed;
            speedLabel.textContent = `${speed === 1 ? '1.0' : speed}x`;

            speedOptions.querySelectorAll('button').forEach(b => {
                b.classList.remove('text-indigo-400', 'bg-white/5', 'font-medium');
                b.classList.add('text-slate-400');
            });
            btn.classList.add('text-indigo-400', 'bg-white/5', 'font-medium');
            btn.classList.remove('text-slate-400');

            speedOptions.classList.add('hidden');
        });
    });

    playBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!audio.src || audio.src === window.location.href) {
            console.error("آدرس فایل صوتی نامعتبر است.");
            return;
        }

        if (audio.paused || audio.ended) {
            document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });

            try {
                await audio.play();
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
                playerContainer.classList.add('border-indigo-500/30', 'shadow-indigo-950/40');
            } catch (err) {
                console.warn("مرورگر جلوی پخش خودکار را گرفت:", err);
            }
        } else {
            audio.pause();
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            playerContainer.classList.remove('border-indigo-500/30', 'shadow-indigo-950/40');
        }
    });

    audio.addEventListener('play', () => {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    });

    audio.addEventListener('pause', () => {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    });

    audio.addEventListener('loadedmetadata', () => {
        durationLabel.textContent = `00:00 / ${formatTime(audio.duration)}`;
    });

    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${pct}%`;
            durationLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        }
    });

    audio.addEventListener('ended', () => {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        progressBar.style.width = '0%';
        playerContainer.classList.remove('border-indigo-500/30', 'shadow-indigo-950/40');
    });

    progressContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const finalPct = clickX / rect.width;

        if (!isNaN(audio.duration) && audio.duration > 0) {
            audio.currentTime = finalPct * audio.duration;
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        audio.volume = val;
        updateVolumeSliderBackground(val);

        if (val === 0) {
            audio.muted = true;
            volUpIcon.classList.add('hidden');
            volMuteIcon.classList.remove('hidden');
        } else {
            audio.muted = false;
            volUpIcon.classList.remove('hidden');
            volMuteIcon.classList.add('hidden');
            previousVolume = val;
        }
    });

    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.muted = !audio.muted;
        if (audio.muted) {
            volUpIcon.classList.add('hidden');
            volMuteIcon.classList.remove('hidden');
            volumeSlider.value = 0;
            updateVolumeSliderBackground(0);
        } else {
            volUpIcon.classList.remove('hidden');
            volMuteIcon.classList.add('hidden');
            volumeSlider.value = previousVolume;
            audio.volume = previousVolume;
            updateVolumeSliderBackground(previousVolume);
        }
    });

    return playerContainer;
}

function createPendingFilePreview(file, isImage, base64, createMessageTimeElement, sendMessage) {
    const container = document.createElement('div');
    container.className = 'pending-preview relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-slate-900/60 backdrop-blur-lg border border-white/10 transition-all duration-300';

    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'relative';

    if (isImage) {
        const img = document.createElement('img');
        img.src = base64;
        img.className = 'w-full max-h-[260px] object-contain bg-slate-950/80 transition-transform duration-300 hover:scale-[1.01]';
        img.alt = "پیش‌نمایش";
        previewWrapper.appendChild(img);
    } else {
        const ext = file.name.split('.').pop().toLowerCase();
        previewWrapper.className = 'p-6 flex items-center gap-4 bg-gradient-to-br from-slate-800/50 to-slate-950/80';
        previewWrapper.innerHTML = `
            <div class="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-3xl shadow-inner">
                ${getFileIcon(file.type, file.name)}
            </div>
            <div class="flex-1 min-w-0 text-right">
                <p class="text-gray-100 font-semibold text-sm truncate">${file.name}</p>
                <p class="text-gray-400 text-xs mt-1 font-mono">${formatFileSize(file.size)} • آماده ارسال</p>
            </div>
        `;
    }

    const actionsBar = document.createElement('div');
    actionsBar.className = 'flex items-center justify-between px-4 py-3 bg-black/40 border-t border-white/5';

    const sendTime = createMessageTimeElement(Date.now());
    sendTime.className = 'text-xs text-gray-500 font-mono';

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex items-center gap-2';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all active:scale-95';
    removeBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/10 active:scale-95 transition-all min-w-[80px] justify-center';
    sendBtn.innerHTML = `ارسال <svg class="w-3.5 h-3.5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>`;

    btnGroup.append(removeBtn, sendBtn);
    actionsBar.append(sendTime, btnGroup);
    container.append(previewWrapper, actionsBar);

    sendBtn.onclick = async () => {
        if (!container.isConnected) return;
        sendBtn.disabled = true;
        removeBtn.disabled = true;
        sendBtn.innerHTML = `<svg class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path></svg>`;

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
            sendBtn.innerHTML = `ارسال`;
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
    const { setSystemStatus, createMessageTimeElement, sendMessage } = deps;
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
        const previewContainer = createPendingFilePreview(imageFile, true, base64, createMessageTimeElement, sendMessage);

        const msgDiv = wrapper.querySelector('.msg');
        if (msgDiv) {
            msgDiv.appendChild(previewContainer);
            msgDiv.className = "msg img p-0 bg-transparent shadow-none border-none";
        }

        $.logs.appendChild(wrapper);
        state.currentPendingWrapper = wrapper;

        wrapper.style.opacity = '0';
        wrapper.style.transform = 'translateY(12px)';
        setTimeout(() => {
            wrapper.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
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
        if (item.type.startsWith('image/')) return item.getAsFile();
    }
    return null;
}

function createSelfMessageWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-msg self flex justify-end mb-4';
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg file';
    wrapper.appendChild(msgDiv);
    return wrapper;
}

export function createFilePreviewClipboard(fileId, urlOrBase64, sendTimeEl, tickEl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg file relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-b from-slate-900/70 to-slate-950/80 border border-white/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.005] max-w-[350px]';

    if (fileId) wrapper.dataset.id = fileId;

    let previewEl;
    let downloadBtn = null;

    const isDataURL = urlOrBase64?.startsWith('data:');
    const isRemote = urlOrBase64?.startsWith('http') || urlOrBase64?.startsWith('/media');

    let extension = '';
    let extractedName = 'File';

    if (isRemote) {
        const url = new URL(urlOrBase64, window.location.origin);
        extractedName = decodeURIComponent(url.pathname.split('/').pop() || 'File');
        extension = extractedName.split('.').pop().toLowerCase();
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
        previewEl.className = 'preview-img w-full h-auto max-h-[320px] object-cover transition-transform duration-500 hover:scale-[1.02] cursor-zoom-in rounded-t-2xl';
        previewEl.alt = "تصویر";
        previewEl.addEventListener('click', handleImageClick);
    }
    else if (extension === 'video' || ['mp4', 'webm', 'mov'].includes(extension)) {
        previewEl = document.createElement('video');
        previewEl.src = urlOrBase64;
        previewEl.controls = true;
        previewEl.className = 'preview-video w-full max-h-[320px] object-cover rounded-t-2xl bg-black';
    }
    else if (extension === 'audio' || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
        previewEl = createCustomAudioPlayer(urlOrBase64, extractedName);
    }
    else if (extension === 'pdf') {
        previewEl = document.createElement('div');
        previewEl.className = 'p-4 flex items-center gap-4 bg-gradient-to-br from-red-950/20 via-slate-900/60 to-slate-900/40 border-b border-white/5 rtl text-right';
        previewEl.innerHTML = `
            <div class="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-2xl shadow-inner">📕</div>
            <div class="flex-1 min-w-0">
                <p class="text-gray-200 font-medium text-sm truncate">${extractedName}</p>
                <p class="text-red-400/80 text-xs mt-0.5 font-medium">سند PDF</p>
            </div>
            <button class="view-pdf-btn px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium transition-all active:scale-95">مشاهده</button>
        `;

        previewEl.querySelector('.view-pdf-btn').onclick = (e) => {
            e.stopPropagation();
            window.open(urlOrBase64, '_blank');
        };
    }
    else {
        previewEl = document.createElement('div');
        previewEl.className = 'p-4 flex items-center gap-4 bg-slate-900/40 border-b border-white/5 rtl text-right';
        previewEl.innerHTML = `
            <div class="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center bg-slate-500/10 border border-slate-500/20 text-2xl shadow-inner">📎</div>
            <div class="flex-1 min-w-0">
                <p class="text-gray-200 font-medium text-sm truncate">${extractedName}</p>
                <p class="text-gray-400 text-xs mt-0.5 font-mono">فایل ضمیمه</p>
            </div>
        `;
    }

    if (isRemote && extension !== 'audio') {
        downloadBtn = document.createElement('button');
        downloadBtn.className = 'w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition active:scale-95';
        downloadBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>`;
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

    const meta = document.createElement('div');
    meta.className = 'metadata flex items-center justify-between px-3 py-2 bg-black/20 text-[11px] text-gray-400';

    const leftMeta = document.createElement('div');
    leftMeta.className = 'flex items-center gap-1.5';
    if (tickEl) leftMeta.appendChild(tickEl);
    if (sendTimeEl) leftMeta.appendChild(sendTimeEl);

    meta.appendChild(leftMeta);
    if (downloadBtn) meta.appendChild(downloadBtn);

    const hiddenId = document.createElement('p');
    hiddenId.className = 'msgId hidden';
    hiddenId.id = fileId ? `id_${fileId}` : '';
    meta.appendChild(hiddenId);

    wrapper.append(previewEl, meta);
    return wrapper;
}

export function createFilePreviewLocal(file, createMessageTimeElement, sendMessage) {
    const isImage = file.type.startsWith('image/');
    const container = createPendingFilePreview(file, isImage, null, createMessageTimeElement, sendMessage);

    if (isImage) {
        const previewWrapper = container.querySelector('.relative');
        const placeholder = document.createElement('div');
        placeholder.className = 'w-full h-48 flex items-center justify-center bg-slate-950 text-gray-500 text-xs';
        placeholder.textContent = 'در حال پردازش...';
        previewWrapper.appendChild(placeholder);

        const reader = new FileReader();
        reader.onload = (e) => {
            previewWrapper.innerHTML = '';
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full max-h-[260px] object-contain bg-slate-950/80 transition-transform duration-300 hover:scale-[1.01]';
            previewWrapper.appendChild(img);
        };
        reader.readAsDataURL(file);
    }

    return container;
}

function getFileIcon(mimeType, fileName) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return '📕';
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📘';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return '📦';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function uploadFileFromLocal(e, deps) {
    const { setSystemStatus, createMessageTimeElement, sendMessage } = deps;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        setSystemStatus?.('حجم فایل نباید بیشتر از ۱۰۰ مگابایت باشد.', 'error');
        return;
    }

    e.target.value = '';
    state.pendingFile = file;

    const wrapper = createSelfMessageWrapper();
    const isImage = file.type.startsWith('image/');
    const previewContainer = createFilePreviewLocal(file, createMessageTimeElement, sendMessage);

    const msgDiv = wrapper.querySelector('.msg');
    if (msgDiv) {
        msgDiv.appendChild(previewContainer);
        msgDiv.className = "msg file p-0 bg-transparent shadow-none border-none";
    }

    $.logs.appendChild(wrapper);
    state.currentPendingWrapper = wrapper;

    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(12px)';
    setTimeout(() => {
        wrapper.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
    }, 10);
    scrollToBottom();
}

createImageViewer();