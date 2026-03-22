// Импорт Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, getDoc, getDocs, where, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyA19cg9dvbo_2t59pNmEC5Hm7Ryj9hjQb0",
    authDomain: "aurum-e244a.firebaseapp.com",
    projectId: "aurum-e244a",
    storageBucket: "aurum-e244a.firebasestorage.app",
    messagingSenderId: "403538033504",
    appId: "1:403538033504:web:dde02304b4665f0fe1bc05",
    measurementId: "G-LLGHJN78V3"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Переменные
let currentUser = null;
let currentChat = null;
let currentContact = null;
let unsubscribeMessages = null;

// DOM элементы
const authScreen = document.getElementById('authScreen');
const mainScreen = document.getElementById('mainScreen');
const userNameSpan = document.getElementById('userName');
const profileNameSpan = document.getElementById('profileName');
const chatsList = document.getElementById('chatsList');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatNameSpan = document.getElementById('chatName');
const chatAvatar = document.getElementById('chatAvatar');
const contactsList = document.getElementById('contactsList');

// Авторизация
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Ошибка входа: ' + error.message);
    }
});

document.getElementById('registerBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: name,
            phone: email,
            avatar: '👤',
            contacts: [],
            createdAt: Date.now()
        });
    } catch (error) {
        alert('Ошибка регистрации: ' + error.message);
    }
});

// Состояние авторизации
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        userNameSpan.textContent = userData?.name || user.displayName;
        profileNameSpan.textContent = userData?.name || user.displayName;
        document.getElementById('editName').value = userData?.name || '';
        
        authScreen.style.display = 'none';
        mainScreen.style.display = 'flex';
        loadChats();
        loadContacts();
    } else {
        authScreen.style.display = 'flex';
        mainScreen.style.display = 'none';
        if (unsubscribeMessages) unsubscribeMessages();
    }
});

// Загрузка чатов
async function loadChats() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    const chatIds = userData?.chats || [];
    
    chatsList.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Загрузка...</div>';
    
    if (chatIds.length === 0) {
        chatsList.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Нет чатов. Начните общение!</div>';
        return;
    }
    
    let chatsHtml = '';
    for (const chatId of chatIds) {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (chatDoc.exists()) {
            const chat = chatDoc.data();
            const otherId = chat.participants.find(id => id !== currentUser.uid);
            const otherUser = await getDoc(doc(db, 'users', otherId));
            const otherData = otherUser.data();
            
            const lastMsg = chat.lastMessage || '';
            const lastTime = chat.lastTime ? new Date(chat.lastTime).toLocaleTimeString() : '';
            
            chatsHtml += `
                <div class="chat-item" data-chat-id="${chatId}" data-user-id="${otherId}">
                    <div class="chat-avatar">${otherData?.avatar || '👤'}</div>
                    <div class="chat-info">
                        <div class="chat-name">${otherData?.name || 'Пользователь'}</div>
                        <div class="chat-last-message">${lastMsg.substring(0, 30) || 'Нет сообщений'}</div>
                    </div>
                    <div class="chat-time">${lastTime}</div>
                </div>
            `;
        }
    }
    
    chatsList.innerHTML = chatsHtml;
    document.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => openChat(el.dataset.chatId, el.dataset.userId));
    });
}

// Открыть чат
async function openChat(chatId, userId) {
    currentChat = chatId;
    currentContact = userId;
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    chatNameSpan.textContent = userData?.name || 'Пользователь';
    chatAvatar.innerHTML = userData?.avatar || '👤';
    
    document.getElementById('chatsPanel').style.display = 'none';
    document.getElementById('chatPanel').style.display = 'flex';
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('time', 'asc'));
    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const isOutgoing = msg.senderId === currentUser.uid;
            messagesContainer.innerHTML += `
                <div class="message message-${isOutgoing ? 'outgoing' : 'incoming'}">
                    <div class="message-text">${escapeHtml(msg.text)}</div>
                    <div class="message-time">${new Date(msg.time).toLocaleTimeString()}</div>
                </div>
            `;
        });
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    });
}

// Отправить сообщение
sendBtn?.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    
    await addDoc(collection(db, 'chats', currentChat, 'messages'), {
        text: text,
        senderId: currentUser.uid,
        time: Date.now()
    });
    
    await updateDoc(doc(db, 'chats', currentChat), {
        lastMessage: text,
        lastTime: Date.now()
    });
    
    messageInput.value = '';
});

messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// Загрузка контактов
async function loadContacts() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    const contactIds = userData?.contacts || [];
    
    if (contactIds.length === 0) {
        contactsList.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Нет контактов</div>';
        return;
    }
    
    let contactsHtml = '';
    for (const contactId of contactIds) {
        const contactDoc = await getDoc(doc(db, 'users', contactId));
        if (contactDoc.exists()) {
            const contact = contactDoc.data();
            contactsHtml += `
                <div class="contact-item" data-user-id="${contactId}">
                    <div class="contact-avatar">${contact.avatar || '👤'}</div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.name}</div>
                        <div class="contact-status">${contact.phone || ''}</div>
                    </div>
                    <button class="icon-btn message-contact"><i class="fas fa-comment"></i></button>
                </div>
            `;
        }
    }
    
    contactsList.innerHTML = contactsHtml;
    document.querySelectorAll('.contact-item').forEach(el => {
        el.addEventListener('click', async () => {
            const userId = el.dataset.userId;
            await startChatWithUser(userId);
        });
    });
}

// Начать чат с пользователем
async function startChatWithUser(userId) {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    let chatId = userData.chats?.find(chatId => {
        // Найти существующий чат
        return false;
    });
    
    if (!chatId) {
        chatId = Date.now().toString();
        await setDoc(doc(db, 'chats', chatId), {
            participants: [currentUser.uid, userId],
            createdAt: Date.now(),
            lastMessage: '',
            lastTime: null
        });
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
            chats: arrayUnion(chatId)
        });
        await updateDoc(doc(db, 'users', userId), {
            chats: arrayUnion(chatId)
        });
    }
    
    openChat(chatId, userId);
}

// Поиск пользователя
document.getElementById('newChatBtn')?.addEventListener('click', () => {
    document.getElementById('searchPanel').style.display = 'block';
    document.getElementById('chatsPanel').style.display = 'none';
});

document.getElementById('closeSearch')?.addEventListener('click', () => {
    document.getElementById('searchPanel').style.display = 'none';
    document.getElementById('chatsPanel').style.display = 'block';
});

document.getElementById('findUserBtn')?.addEventListener('click', async () => {
    const phone = document.getElementById('contactPhone').value;
    const usersQuery = query(collection(db, 'users'), where('phone', '==', phone));
    const snapshot = await getDocs(usersQuery);
    const foundDiv = document.getElementById('foundUser');
    
    if (snapshot.empty) {
        foundDiv.innerHTML = '<p style="color:red;">Пользователь не найден</p>';
    } else {
        snapshot.forEach(doc => {
            const user = doc.data();
            foundDiv.innerHTML = `
                <div style="padding:10px;border:1px solid #ccc;border-radius:8px;margin:10px 0;">
                    <div>${user.name}</div>
                    <div>${user.phone}</div>
                    <button id="addThisContact" data-id="${doc.id}">Добавить в контакты</button>
                </div>
            `;
            document.getElementById('addThisContact')?.addEventListener('click', async () => {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    contacts: arrayUnion(doc.id)
                });
                alert('Контакт добавлен!');
                document.getElementById('newChatModal').classList.remove('active');
                loadContacts();
            });
        });
    }
});

// Навигация по панелям
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.getElementById('chatsPanel').style.display = 'none';
        document.getElementById('chatPanel').style.display = 'none';
        document.getElementById('contactsPanel').style.display = 'none';
        document.getElementById('settingsPanel').style.display = 'none';
        
        if (panel === 'chats') {
            document.getElementById('chatsPanel').style.display = 'block';
        } else if (panel === 'contacts') {
            document.getElementById('contactsPanel').style.display = 'block';
            loadContacts();
        } else if (panel === 'settings') {
            document.getElementById('settingsPanel').style.display = 'block';
        }
    });
});

document.getElementById('backToChats')?.addEventListener('click', () => {
    document.getElementById('chatPanel').style.display = 'none';
    document.getElementById('chatsPanel').style.display = 'block';
    if (unsubscribeMessages) unsubscribeMessages();
});

document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    document.getElementById('profileModal').classList.add('active');
});

document.getElementById('saveNameBtn')?.addEventListener('click', async () => {
    const newName = document.getElementById('editName').value;
    if (newName && currentUser) {
        await updateProfile(currentUser, { displayName: newName });
        await updateDoc(doc(db, 'users', currentUser.uid), {
            name: newName
        });
        userNameSpan.textContent = newName;
        profileNameSpan.textContent = newName;
        document.getElementById('profileModal').classList.remove('active');
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
});

document.getElementById('themeItem')?.addEventListener('click', () => {
    const body = document.body;
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        document.getElementById('themeValue').textContent = 'Светлая';
    } else {
        body.classList.add('dark');
        document.getElementById('themeValue').textContent = 'Тёмная';
    }
});

document.getElementById('emojiBtn')?.addEventListener('click', () => {
    messageInput.value += '😊';
    messageInput.focus();
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal')?.classList.remove('active');
    });
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Сообщения
window.playAudio = (url) => new Audio(url).play();
