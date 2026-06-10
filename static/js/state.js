
class AppState {
    #firstIntersection = true;
    #scrollModeAppend = false;
    #systemStatusMsg = null;
    #ws = null;
    #pendingFile = null;
    #beforeTs = 0;
    #replyId = 0;
    #IsImageOpen = false;
    #currentPendingWrapper = false;
    #lastMsg = 0;
    #unreadCount = {};
    #isUserActive = {};
    #activeChats = {};
    #IsfromCache = false;

    // getters
    get ws() { return this.#ws; }
    get systemStatusMsg() { return this.#systemStatusMsg; }
    get currentPendingWrapper() { return this.#currentPendingWrapper; }
    get firstIntersection() { return this.#firstIntersection; }
    get scrollModeAppend() { return this.#scrollModeAppend; }
    get beforeTs() { return this.#beforeTs; }
    get pendingFile() { return this.#pendingFile; }
    get IsImageOpen() { return this.#IsImageOpen; }
    get IsfromCache() { return this.#IsfromCache; }
    get replyId() { return this.#replyId; }
    get lastMsg() { return this.#lastMsg; }
    get isUserActive() { return this.#isUserActive; }
    get activeChats() { return this.#activeChats; }
    get unreadCount() { return this.#unreadCount; }

    hasChat(chat) {
        return this.#activeChats.hasOwnProperty(chat);
    }

    chatIsActive(chat) {
        return this.#activeChats[chat] ?? false;
    }

    chatHasUnreadMsg(chat) {
        return this.#unreadCount[chat] ?? false;
    }

    getUnreadCount(chat) {
        return this.#unreadCount[chat] ?? 0;
    }

    get getActiveChat() {
        return Object.keys(this.#activeChats).find(chat => this.#activeChats[chat] === true) || null;
    }

    // setters
    set ws(v) { this.#ws = v; }
    set systemStatusMsg(v) { this.#systemStatusMsg = v; }
    set currentPendingWrapper(v) { this.#currentPendingWrapper = v; }
    set firstIntersection(v) { this.#firstIntersection = v; }
    set scrollModeAppend(v) { this.#scrollModeAppend = v; }
    set beforeTs(v) { this.#beforeTs = v; }
    set pendingFile(v) { this.#pendingFile = v; }
    set replyId(v) { this.#replyId = v; }
    set lastMsg(v) { this.#lastMsg = v; }
    set IsImageOpen(v) { this.#IsImageOpen = v; }
    set IsfromCache(v) { this.#IsfromCache = v; }
    set unreadCount({ chat, count }) { this.#unreadCount[chat] = count; }
    set activeChats({ chat, active }) { this.#activeChats[chat] = active; }
    set isUserActive(v) { this.#isUserActive = v; }

    setActiveChat(chat) {
        this.#activeChats = Object.fromEntries(
            Object.keys(this.#activeChats).map(key => [key, false])
        );

        this.#activeChats[chat] = true;
    }

    setunreadCount(chat, count, replace = false) {
        if (replace) {
            this.#unreadCount = { [chat]: count };
        } else {
            this.#unreadCount = { ...this.#unreadCount, [chat]: count };
        }
    }

    clearUnreadChat(chat) {
        this.#unreadCount[chat] = 0;
    }
}

const state = new AppState();