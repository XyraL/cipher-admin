// Cipher-Admin -- Admin Chat (shell HTML is in index.html; this handles messages only)

var _chatMessages = [];
var _chatUnread   = 0;

function chatRenderAll() {
    var el = document.getElementById('chat-messages');
    if (!el) return;
    if (!_chatMessages.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x1F4AC;</div><div class="empty-text">No messages yet</div></div>';
        return;
    }
    el.innerHTML = _chatMessages.map(function(m) {
        return '<div class="chat-msg">'
             + '<span class="chat-sender">' + escHtml(m.sender) + '</span>'
             + '<span class="chat-time">' + chatFmtTime(m.time) + '</span>'
             + '<div class="chat-text">' + escHtml(m.message) + '</div>'
             + '</div>';
    }).join('');
    chatScrollBottom();
}

function chatAppend(m) {
    var el = document.getElementById('chat-messages');
    if (!el) return;
    var empty = el.querySelector('.empty-state');
    if (empty) empty.remove();
    var div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = '<span class="chat-sender">' + escHtml(m.sender) + '</span>'
                  + '<span class="chat-time">' + chatFmtTime(m.time) + '</span>'
                  + '<div class="chat-text">' + escHtml(m.message) + '</div>';
    el.appendChild(div);
    chatScrollBottom();
}

function chatScrollBottom() {
    var el = document.getElementById('chat-messages');
    if (el) setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
}

function chatFmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts * 1000);
    var h = d.getHours().toString().padStart(2, '0');
    var mi = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + mi;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function chatSend() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    var msg = input.value.trim();
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
        var badge = document.getElementById('badge-adminchat');
        if (badge) badge.textContent = _chatUnread;
    }
}

// Re-render messages and clear badge when switching to adminchat panel
var _origSwitchPanel = window.switchPanel;
window.switchPanel = function(name) {
    _origSwitchPanel(name);
    if (name === 'adminchat') {
        _chatUnread = 0;
        var badge = document.getElementById('badge-adminchat');
        if (badge) badge.textContent = '';
        chatRenderAll();
    }
};
