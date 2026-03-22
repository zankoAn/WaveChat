const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const textarea = document.getElementById('chat-input-text');
const emojis = document.querySelectorAll('.emoji');

const standardEmojis = [
  '😂','🤣','😆','😅','😊','😁','😄','🤗','😎','🤩',
  '❤️','💖','💘','💞',
  "😍", "😘", '😁', '💕', "💋", "🫦",
  '😭','😢','😔','😞','💔',
  '😲','🤯','😳','😮','🤔',
  '😠','😡','🤬',
  '😏','😉','😜','😝',
  '😐','🤐','😑','😶',
  '👏','🙌','💪','🔥','🌟','🚀',
  '👀'
];

const animatedEmojiMap = {
    ":ablobcat_aww_kira:": "static/emojis/ablobcat_aww_kira.gif",
    ":ablobcatpnd_heart_happy:": "static/emojis/ablobcatpnd_heart_happy.gif",
    ":blob_wave:": "static/emojis/blob_wave.gif",
    ":hdfire:": "static/emojis/hdfire.gif",
    ":ablobcatpnd_hiasobi:": "static/emojis/ablobcatpnd_hiasobi.gif",
    ":lots_of_love:": "static/emojis/lots_of_love.gif",
    ":ablobcatheartbroken:": "static/emojis/ablobcatheartbroken.gif",
    ":ablobcat_yummy:": "static/emojis/ablobcat_yummy.gif",
    ":ablobcatpnd_running:": "static/emojis/ablobcatpnd_running.gif",
    ":ablobcat_uruuru:": "static/emojis/ablobcat_uruuru.gif",
    ":ablobcatheart:": "static/emojis/ablobcatheart.gif",
    ":ablobcatheartsqueeze:": "static/emojis/ablobcatheartsqueeze.gif",
    ':anarchoheart3:': 'static/emojis/anarchoheart3.png',
    ':anarcho-heart2:': 'static/emojis/anarcho-heart2.png',
    ':love:': "static/emojis/love.png",
    ":yericute:": "static/emojis/yericute.png",
    ":pink_cup:": "static/emojis/pink_cup.png",
    ":queeranarchy": "static/emojis/queeranarchy.png",
    ":solidarity:": "static/emojis/solidarity.png",
    ":blobaww:": "static/emojis/blobaww.png",
    ":blobcatsnuggle:": "static/emojis/blobcatsnuggle.png",
    ":blobmeltsoblove:": "static/emojis/blobmeltsoblove.png",
    ":blobcathuggies:": "static/emojis/blobcathuggies.png",
    ":cannabis:": "static/emojis/cannabis.png",
    ":cozy_nap:": "static/emojis/cozy_nap.png",
    ":blob_raccoon_blueheart:": "static/emojis/blob_raccoon_blueheart.png",
    ":blobcatlove:": "static/emojis/blobcatlove.png",
    ":bear_hugs:": "static/emojis/bear_hugs.png",
    ":bear_hug:": "static/emojis/bear_hug.png",
};

const animatedGifs = Object.keys(animatedEmojiMap);

export function createGifElement(shortName) {
    const url = animatedEmojiMap[shortName];
    if (!url) return false;

    const img = document.createElement('img');
    img.src = url;
    img.alt = shortName;
    img.className = 'w-8 h-8 object-contain';
    img.loading = 'lazy';
    return img;
}

function createEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;

    picker.innerHTML = '';

    animatedGifs.forEach(shortName => {
        const span = document.createElement('span');
        span.className = 'emoji cursor-pointer text-2xl lg:text-3xl hover:bg-gray-600/50 p-2 rounded-xl transition flex items-center justify-center w-12 h-10 select-none';

        const img = createGifElement(shortName);
        span.appendChild(img);

        span.addEventListener('click', () => {
            $.input.value += shortName;
            $.input.focus();
        });

        picker.appendChild(span);
    });

    standardEmojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji cursor-pointer text-2xl lg:text-3xl hover:bg-gray-600/50 p-2 rounded-xl transition flex items-center justify-center w-10 h-10 select-none';
        span.textContent = emoji;

        span.addEventListener('click', () => {
            $.input.value += emoji;
            $.input.focus();
        });

        picker.appendChild(span);
    });
}

document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.add('hidden');
    }
});

emojis.forEach(emoji => {
    emoji.addEventListener('click', () => {
        textarea.focus();

        const emojiText = emoji.textContent;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        textarea.value =
            textarea.value.substring(0, start) +
            emojiText +
            textarea.value.substring(end);

        textarea.setSelectionRange(
            start + emojiText.length,
            start + emojiText.length
        );
    });
});

emojiPicker.addEventListener('mouseleave', () => {
    emojiPicker.classList.replace("grid", "hidden");
    emojiBtn.classList.replace("stroke-blue-200", "stroke-gray-400");
});

emojiPicker.addEventListener('mouseenter', () => {
    emojiBtn.classList.replace("stroke-gray-400", "stroke-blue-200");
    emojiPicker.classList.replace("hidden", "grid");
});

emojiBtn.addEventListener('mouseenter', () => {
    setTimeout(() => {
        emojiPicker.classList.replace('hidden', "grid");
        emojiBtn.classList.replace("stroke-gray-400", "stroke-blue-200");
    }, 100);
});


document.addEventListener('DOMContentLoaded', () => {
    createEmojiPicker();
});