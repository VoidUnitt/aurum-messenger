// Aurum Messenger - Основной функционал

// Данные приложения
let appData = {
    currentUser: 'Aurum User',
    currentChat: null,
    theme: 'light',
    chats: [],
    messages: {}
};

// Загрузка сохранённых данных
function loadData() {
    const saved = localStorage.getItem('aurum_data');
    if (saved) {
        appData = JSON.parse(saved);
        applyTheme(appData.theme);
        document.getElementById('settingsUsername').value = appData.currentUser;
        document.getElementById('username').textContent = appData.currentUser;
    } else {
        // Демо чаты
        appData.chats = [
            { id: '1', name: 'Алексей', avatar: '👤', lastMessage: 'Привет!', timestamp: Date.now() },
            { id: '2', name: 'Мария', avatar: '⭐', lastMessage: 'Как дела?', timestamp: Date.now() - 3600000 },
            { id: '3', name: 'Дмитрий', avatar: '🔥', lastMessage: 'Отлично!', timestamp: Date.now() - 7200000 }
        ];
        appData.messages = {
            '1': [
                { id: 'm1', text: 'Привет! Как дела?', sender: 'incoming', time: Date.now() - 86400000 },
                { id: 'm2', text: 'Привет! Всё отлично, спасибо!', sender: 'outgoing', time: Date.now() - 86400000 + 300000 }
            ],
            '2': [
                { id: 'm3', text: 'Доброе утро!', sender: 'incoming', time: Date.now() - 43200000 }
            ],
            '3': [
                { id: 'm4', text: 'Когда встретимся?', sender: 'incoming', time: Date.now() - 7200000 }
            ]
        };
        saveData();
    }
    renderChatsList();
}

// Сохранение данных
function saveData() {
    localStorage.setItem('aurum_data', JSON.stringify(appData));
}

// Применение темы
function applyTheme(theme) {
    document.body.className = theme;
    appData.theme = theme;
    saveData();
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Форматирование даты для последнего сообщения
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return formatTime(timestamp);
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

// Рендер списка чатов
function renderChatsList() {
    const container = document.getElementById('chatsList');
    const searchTerm = document.getElementById('searchChats').value.toLowerCase();
    
    let filteredChats = appData.chats;
    if (searchTerm) {
        filteredChats = appData.chats.filter(chat => 
            chat.name.toLowerCase().includes(searchTerm)
        );
    }
    
    container.innerHTML = filteredChats.map(chat => {
        const lastMsg = appData.messages[chat.id]?.slice(-1)[0];
        return `
            <div class="chat-item ${appData.currentChat === chat.id ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-avatar-small">${chat.avatar}</div>
                <div class="chat-info">
                    <div class="chat-name">${escapeHtml(chat.name)}</div>
                    <div class="last-message">${lastMsg ? escapeHtml(lastMsg.text) : 'Нет сообщений'}</div>
                </div>
                <div class="chat-time">${lastMsg ? formatDate(lastMsg.time) : ''}</div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики
    document.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => openChat(el.dataset.chatId));
    });
}

// Открытие чата
function openChat(chatId) {
    appData.currentChat = chatId;
    const chat = appData.chats.find(c => c.id === chatId);
    if (chat) {
        document.getElementById('chatName').textContent = chat.name;
        document.getElementById('chatAvatar').innerHTML = chat.avatar;
        document.getElementById('chatStatus').innerHTML = '<span class="status-dot"></span><span>онлайн</span>';
    }
    renderMessages();
    renderChatsList();
}

// Рендер сообщений
function renderMessages() {
    const container = document.getElementById('messages');
    const messages = appData.messages[appData.currentChat] || [];
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon">
                    <i class="fas fa-comment-dots"></i>
                </div>
                <p>Нет сообщений</p>
                <p class="welcome-hint">Напишите первое сообщение!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message message-${msg.sender}">
            <div class="message-text">${escapeHtml(msg.text)}</div>
            <div class="message-time">${formatTime(msg.time)}</div>
        </div>
    `).join('');
    
    // Прокрутка вниз
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Отправка сообщения
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
    
    // Обновляем последнее сообщение в чате
    const chat = appData.chats.find(c => c.id === appData.currentChat);
    if (chat) {
        chat.lastMessage = text;
        chat.timestamp = Date.now();
    }
    
    saveData();
    renderMessages();
    renderChatsList();
    input.value = '';
    
    // Эффект "печатает"
    setTimeout(() => {
        if (appData.currentChat) {
            const autoReply = {
                id: Date.now().toString(),
                text: 'Сообщение получено! ✨',
                sender: 'incoming',
                time: Date.now()
            };
            appData.messages[appData.currentChat].push(autoReply);
            saveData();
            renderMessages();
            renderChatsList();
        }
    }, 1000);
}

// Создание нового чата
function createChat() {
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
    
    appData.chats.push(newChat);
    appData.messages[newChat.id] = [];
    saveData();
    renderChatsList();
    
    // Закрыть модалку
    document.getElementById('newChatModal').classList.remove('active');
    document.getElementById('newChatName').value = '';
    
    // Открыть новый чат
    openChat(newChat.id);
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Открытие модального окна
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Инициализация обработчиков
function initEventListeners() {
    // Отправка сообщения
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Новый чат
    document.getElementById('newChatBtn').addEventListener('click', () => openModal('newChatModal'));
    document.getElementById('createChatBtn').addEventListener('click', createChat);
    document.getElementById('cancelChatBtn').addEventListener('click', () => closeModal('newChatModal'));
    
    // Настройки
    document.getElementById('settingsBtn').addEventListener('click', () => openModal('settingsModal'));
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const newName = document.getElementById('settingsUsername').value.trim();
        if (newName) {
            appData.currentUser = newName;
            document.getElementById('username').textContent = newName;
            saveData();
        }
        const theme = document.getElementById('themeSelect').value;
        applyTheme(theme);
        closeModal('settingsModal');
    });
    
    // Информация о чате
    document.getElementById('chatInfoBtn').addEventListener('click', () => {
        if (appData.currentChat) {
            const chat = appData.chats.find(c => c.id === appData.currentChat);
            if (chat) {
                document.getElementById('chatInfoBody').innerHTML = `
                    <div style="text-align: center">
                        <div style="font-size: 48px; margin-bottom: 15px">${chat.avatar}</div>
                        <h3>${escapeHtml(chat.name)}</h3>
                        <p style="color: #4caf50; margin-top: 10px">● Онлайн</p>
                        <hr style="margin: 20px 0">
                        <p>Сообщений: ${(appData.messages[chat.id] || []).length}</p>
                    </div>
                `;
                openModal('chatInfoModal');
            }
        }
    });
    
    // Поиск чатов
    document.getElementById('searchChats').addEventListener('input', () => renderChatsList());
    
    // Закрытие модалок
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Выбор аватара
    document.querySelectorAll('.avatar-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
    
    // Эмодзи (простой вариант)
    document.getElementById('emojiBtn').addEventListener('click', () => {
        const input = document.getElementById('messageInput');
        input.value += '😊';
        input.focus();
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEventListeners();
    
    // Выбор первого аватара по умолчанию
    const firstAvatar = document.querySelector('.avatar-opt');
    if (firstAvatar) firstAvatar.classList.add('selected');
    
    // Устанавливаем тему в селекте
    document.getElementById('themeSelect').value = appData.theme;
    
    console.log('🌟 Aurum Messenger запущен!');
});
