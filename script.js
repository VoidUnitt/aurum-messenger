// Aurum Messenger - Telegram стиль

let appData = {
    currentUser: 'Алексей',
    currentChat: null,
    theme: 'light',
    chats: [],
    messages: {},
    contacts: []
};

function loadData() {
    const saved = localStorage.getItem('aurum_data');
    if (saved) {
        appData = JSON.parse(saved);
        applyTheme(appData.theme);
        document.getElementById('userName').textContent = appData.currentUser;
        document.getElementById('profileName').textContent = appData.currentUser;
        document.getElementById('profileNameInput').value = appData.currentUser;
    } else {
        appData.chats = [
            { id: '1', name: 'Анна', avatar: '👩', lastMessage: 'Привет! Как дела?', timestamp: Date.now() },
            { id: '2', name: 'Максим', avatar: '👨', lastMessage: 'Скинь фото', timestamp: Date.now() - 3600000 },
            { id: '3', name: 'Елена', avatar: '👩‍💼', lastMessage: 'Встреча в 15:00', timestamp: Date.now() - 7200000 }
        ];
        appData.messages = {
            '1': [
                { id: 'm1', text: 'Привет! Как дела?', sender: 'incoming', time: Date.now() - 3600000 },
                { id: 'm2', text: 'Привет! Всё отлично!', sender: 'outgoing', time: Date.now() - 3500000 }
            ],
            '2': [
                { id: 'm3', text: 'Привет!', sender: 'incoming', time: Date.now() - 7200000 }
            ],
            '3': [
                { id: 'm4', text: 'Доброе утро!', sender: 'incoming', time: Date.now() - 86400000 }
            ]
        };
        appData.contacts = [
            { id: 'c1', name: 'Анна', avatar: '👩', status: 'online' },
            { id: 'c2', name: 'Максим', avatar: '👨', status: 'был недавно' },
            { id: 'c3', name: 'Елена', avatar: '👩‍💼', status: 'была вчера' }
        ];
        saveData();
    }
    renderChatsList();
    renderContactsList();
}

function saveData() {
    localStorage.setItem('aurum_data', JSON.stringify(appData));
}

function applyTheme(theme) {
    document.body.className = theme;
    appData.theme = theme;
    const themeLabel = document.getElementById('themeLabel');
    if (themeLabel) {
        themeLabel.textContent = theme === 'light' ? 'Светлая тема' : 'Тёмная тема';
    }
    saveData();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return formatTime(timestamp);
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function renderChatsList() {
    const container = document.getElementById('chatsList');
    if (!container) return;
    
    container.innerHTML = appData.chats.map(chat => {
        const messages = appData.messages[chat.id] || [];
        const lastMsg = messages[messages.length - 1];
        return `
            <div class="chat-item" data-chat-id="${chat.id}">
                <div class="chat-avatar">${chat.avatar}</div>
                <div class="chat-info">
                    <div class="chat-name">${escapeHtml(chat.name)}</div>
                    <div class="chat-last-message">${lastMsg ? escapeHtml(lastMsg.text) : 'Нет сообщений'}</div>
                </div>
                <div class="chat-time">${lastMsg ? formatDate(lastMsg.time) : ''}</div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => openChat(el.dataset.chatId));
    });
}

function renderContactsList() {
    const container = document.getElementById('contactsList');
    if (!container) return;
    
    container.innerHTML = appData.contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-avatar">${contact.avatar}</div>
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(contact.name)}</div>
                <div class="contact-status">${contact.status}</div>
            </div>
        </div>
    `).join('');
}

function openChat(chatId) {
    appData.currentChat = chatId;
    const chat = appData.chats.find(c => c.id === chatId);
    if (chat) {
        document.getElementById('chatHeaderAvatar').innerHTML = chat.avatar;
        document.getElementById('chatHeaderName').textContent = chat.name;
        document.getElementById('chatHeaderStatus').innerHTML = '<span style="color:#4caf50">●</span> в сети';
    }
    renderMessages();
    
    document.querySelector('.chats-screen').classList.remove('active');
    document.querySelector('.chat-screen').classList.add('active');
}

function renderMessages() {
    const container = document.getElementById('messages');
    const messages = appData.messages[appData.currentChat] || [];
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="empty-chat"><i class="fas fa-comments"></i><p>Нет сообщений</p></div>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message message-${msg.sender}">
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${formatTime(msg.time)}</div>
        </div>
    `).join('');
    
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !appData.currentChat) return;
    
    const newMessage = {
        id: Date.now().toString(),
        text: text,
        sender: 'outgoing',
        time: Date.now()
    };
    
    if (!appData.messages[appData.currentChat]) {
        appData.messages[appData.currentChat] = [];
    }
    appData.messages[appData.currentChat].push(newMessage);
    
    const chat = appData.chats.find(c => c.id === appData.currentChat);
    if (chat) {
        chat.lastMessage = text;
        chat.timestamp = Date.now();
    }
    
    saveData();
    renderMessages();
    renderChatsList();
    input.value = '';
    
    // Автоответ
    setTimeout(() => {
        if (appData.currentChat) {
            const reply = {
                id: Date.now().toString(),
                text: 'Сообщение доставлено ✨',
                sender: 'incoming',
                time: Date.now()
            };
            appData.messages[appData.currentChat].push(reply);
            saveData();
            renderMessages();
            renderChatsList();
        }
    }, 1000);
}

function createNewChat() {
    const name = document.getElementById('newChatName').value.trim();
    if (!name) return;
    
    const selectedAvatar = document.querySelector('.avatar-opt.selected');
    const avatar = selectedAvatar ? selectedAvatar.dataset.emoji : '👤';
    
    const newChat = {
        id: Date.now().toString(),
        name: name,
        avatar: avatar,
        lastMessage: '',
        timestamp: Date.now()
    };
    
    appData.chats.unshift(newChat);
    appData.messages[newChat.id] = [];
    saveData();
    renderChatsList();
    
    document.getElementById('newChatModal').classList.remove('active');
    document.getElementById('newChatName').value = '';
    openChat(newChat.id);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.chats-screen, .chat-screen, .screen').forEach(s => {
                s.classList.remove('active');
            });
            
            if (screen === 'chats') {
                document.getElementById('chatsScreen').classList.add('active');
            } else if (screen === 'calls') {
                document.getElementById('callsScreen').classList.add('active');
            } else if (screen === 'contacts') {
                document.getElementById('contactsScreen').classList.add('active');
            } else if (screen === 'settings') {
                document.getElementById('settingsScreen').classList.add('active');
            }
        });
    });
}

function initEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        document.querySelector('.chat-screen').classList.remove('active');
        document.querySelector('.chats-screen').classList.add('active');
    });
    
    document.getElementById('sendMsgBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    document.getElementById('newChatHeaderBtn').addEventListener('click', () => {
        document.getElementById('newChatModal').classList.add('active');
    });
    
    document.getElementById('createNewChat').addEventListener('click', createNewChat);
    
    document.querySelectorAll('.btn-cancel, .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    document.querySelectorAll('.avatar-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
    
    document.getElementById('emojiMsgBtn').addEventListener('click', () => {
        const input = document.getElementById('messageInput');
        input.value += '😊';
        input.focus();
    });
    
    document.getElementById('profileAvatar').addEventListener('click', () => {
        document.getElementById('profileModal').classList.add('active');
    });
    
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const newName = document.getElementById('profileNameInput').value.trim();
        if (newName) {
            appData.currentUser = newName;
            document.getElementById('userName').textContent = newName;
            document.getElementById('profileName').textContent = newName;
            saveData();
        }
        const theme = document.getElementById('themeSelectModal').value;
        applyTheme(theme);
        document.getElementById('profileModal').classList.remove('active');
    });
    
    document.getElementById('themeSetting').addEventListener('click', () => {
        const newTheme = appData.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        document.getElementById('themeSelectModal').value = newTheme;
    });
    
    document.getElementById('searchBtn').addEventListener('click', () => {
        const searchBar = document.getElementById('searchBar');
        searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
        if (searchBar.style.display === 'flex') {
            document.getElementById('searchInput').focus();
        }
    });
    
    document.getElementById('closeSearchBtn').addEventListener('click', () => {
        document.getElementById('searchBar').style.display = 'none';
        document.getElementById('searchInput').value = '';
        renderChatsList();
    });
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const container = document.getElementById('chatsList');
        const filtered = appData.chats.filter(chat => chat.name.toLowerCase().includes(term));
        container.innerHTML = filtered.map(chat => {
            const messages = appData.messages[chat.id] || [];
            const lastMsg = messages[messages.length - 1];
            return `
                <div class="chat-item" data-chat-id="${chat.id}">
                    <div class="chat-avatar">${chat.avatar}</div>
                    <div class="chat-info">
                        <div class="chat-name">${escapeHtml(chat.name)}</div>
                        <div class="chat-last-message">${lastMsg ? escapeHtml(lastMsg.text) : 'Нет сообщений'}</div>
                    </div>
                </div>
            `;
        }).join('');
        document.querySelectorAll('.chat-item').forEach(el => {
            el.addEventListener('click', () => openChat(el.dataset.chatId));
        });
    });
    
    document.getElementById('attachMsgBtn').addEventListener('click', () => {
        alert('📎 Функция прикрепления файлов скоро появится!');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initNavigation();
    initEventListeners();
    
    const firstAvatar = document.querySelector('.avatar-opt');
    if (firstAvatar) firstAvatar.classList.add('selected');
    
    document.getElementById('themeSelectModal').value = appData.theme;
    
    console.log('🌟 Aurum Messenger запущен!');
});
