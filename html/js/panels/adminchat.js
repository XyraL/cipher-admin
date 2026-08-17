// Cipher-Admin -- Admin Chat (shell HTML is in index.html; this handles messages only)

const _chatMessages = [];
let _chatUnread   = 0;

function chatRenderAll() {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    if (!_chatMessages.length) {
        el.innerHTML = emptyState('adminchat', 'No messages yet');
        return;
    }
    el.innerHTML = _chatMessages.map(function(m) {
        return '<div class="chat-msg">'
             + '<span class="chat-sender">' + esc(m.sender) + '</span>'
             + '<span class="chat-time">' + chatFmtTime(m.time) + '</span>'
             + '<div class="chat-text">' + esc(m.message) + '</div>'
             + '</div>';
    }).join('');
    chatScrollBottom();
}

function chatAppend(m) {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    const empty = el.querySelector('.empty-state');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = '<span class="chat-sender">' + esc(m.sender) + '</span>'
                  + '<span class="chat-time">' + chatFmtTime(m.time) + '</span>'
                  + '<div class="chat-text">' + esc(m.message) + '</div>';
    el.appendChild(div);
    chatScrollBottom();
}

function chatScrollBottom() {
    const el = document.getElementById('chat-messages');
    if (el) setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
}

function chatFmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const h = d.getHours().toString().padStart(2, '0');
    const mi = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + mi;
}

function chatSend() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    fetch('https://cipher-admin/adminChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });
}

function pushAdminChat(data) {
    _chatMessages.push(data);
    if (_chatMessages.length > 200) _chatMessages.shift();

    if (CA.currentPanel === 'adminchat') {
        chatAppend(data);
    } else {
        _chatUnread++;
        let badge = document.getElementById('badge-adminchat');
        if (badge) badge.textContent = _chatUnread;
    }
}

// Called by switchPanel. Previously this file wrapped switchPanel itself,
// which meant the function every other panel called was a monkey-patch
// installed by whichever script happened to load last.
function chatOnPanelOpen() {
    _chatUnread = 0;
    const badge = document.getElementById('badge-adminchat');
    if (badge) badge.textContent = '';
    chatRenderAll();
}

window.chatOnPanelOpen = chatOnPanelOpen;
window.chatSend        = chatSend;
window.pushAdminChat   = pushAdminChat;
