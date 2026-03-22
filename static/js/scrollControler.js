const scrollToBottom = () => {
    $.logs.scrollTo(0, $.logs.scrollHeight);
};

const btnBottom = document.getElementById('toBottom');

const showAt = 3000;
function toggleButtons() {
    const top = $.logs.scrollTop;
    const height = $.logs.scrollHeight;
    const view = $.logs.clientHeight;

    const hasScrollableContent = height > view + 50;
    const isNotAtBottom = top + view < height - 100;

    if (hasScrollableContent && isNotAtBottom) {
        btnBottom.style.display = 'block';
    } else {
        btnBottom.style.display = 'none';
    }
}

$.logs.addEventListener('scroll', toggleButtons);

btnBottom.addEventListener('click', () => {
    btnBottom.style.display = 'none';
    scrollToBottom()
});
