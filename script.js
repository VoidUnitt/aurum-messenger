// Импорт Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, getDoc, getDocs, where, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyA19cg9dvbo_2t59pNmEC5Hm7Ryj9hjQb0",
    authDomain: "aurum-e244a.firebaseapp.com",
    projectId: "aurum-e244a",
    storageBucket: "aurum-e244a.firebasestorage.app",
    messagingSenderId: "403538033504",
    appId: "1:403538033504:web:dde02304b4665f0fe1bc05"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

// Переключение табов
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        if (tab.dataset.tab === 'login') {
            document.getElementById('loginForm').classList.add('active');
        } else {
            document.getElementById('registerForm').classList.add('active');
        }
    });
});

// Регистрация
document.getElementById('registerBtn').addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    
    if (!name || !email || !password) {
        alert('Заполните все поля');
        return;
    }
    
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
        alert('Регистрация успешна!');
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

// Вход
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Ошибка: ' + error.message);
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
    
    if (chatIds.length === 0) {
        chatsList.innerHTML = '<div style="text-align:center;padding:40px;color:#6c7a8e;">Нет чатов</div>';
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
            
            chatsHtml += `
                <div class="chat-item" data-chat-id="${chatId}" data-user-id="${otherId}">
                    <div class="chat-avatar">${otherData?.avatar || '👤'}</div>
                    <div class="chat-info">
                        <div class="chat-name">${otherData?.name || 'Пользователь'}</div>
                        <div class="chat-last-message">${chat.lastMessage?.substring(0, 30) || 'Нет сообщений'}</div>
                    </div>
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
    
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('chatPanel').classList.add('active');
    
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
                    <div class="message-time">${new Date(msg.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
            `;
        });
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    });
}

// Отправить сообщение
sendBtn.addEventListener('click', async () => {
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

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// Загрузка контактов
async function loadContacts() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    const contactIds = userData?.contacts || [];
    
    if (contactIds.length === 0) {
        contactsList.innerHTML = '<div style="text-align:center;padding:40px;color:#6c7a8e;">Нет контактов</div>';
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

// Начать чат
async function startChatWithUser(userId) {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    
    let existingChatId = null;
    if (userData.chats) {
        for (const chatId of userData.chats) {
            const chatDoc = await getDoc(doc(db, 'chats', chatId));
            if (chatDoc.exists() && chatDoc.data().participants.includes(userId)) {
                existingChatId = chatId;
                break;
            }
        }
    }
    
    if (existingChatId) {
        openChat(existingChatId, userId);
    } else {
        const chatId = Date.now().toString();
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
        
        openChat(chatId, userId);
    }
}

// Поиск пользователя
document.getElementById('newChatBtn').addEventListener('click', () => {
    document.getElementById('newChatModal').classList.add('active');
});

document.getElementById('findUserBtn').addEventListener('click', async () => {
    const phone = document.getElementById('contactPhone').value.trim();
    if (!phone) return;
    
    const usersQuery = query(collection(db, 'users'), where('phone', '==', phone));
    const snapshot = await getDocs(usersQuery);
    const foundDiv = document.getElementById('foundUser');
    
    if (snapshot.empty) {
        foundDiv.innerHTML = '<p style="color:#ff6b6b;">Пользователь не найден</p>';
    } else {
        snapshot.forEach(doc => {
            const user = doc.data();
            if (doc.id === currentUser.uid) {
                foundDiv.innerHTML = '<p style="color:#ff6b6b;">Это вы</p>';
                return;
            }
            foundDiv.innerHTML = `
                <div>
                    <div><strong>${user.name}</strong></div>
                    <div style="font-size:12px;color:#6c7a8e;">${user.phone}</div>
                    <button id="addThisContact" data-id="${doc.id}" style="margin-top:8px;padding:8px;background:#4a9eff;border:none;border-radius:8px;color:#fff;cursor:pointer;">Добавить</button>
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
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${panel}Panel`).classList.add('active');
        
        if (panel === 'contacts') loadContacts();
    });
});

document.getElementById('backToChats').addEventListener('click', () => {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('chatsPanel').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-panel="chats"]').classList.add('active');
    if (unsubscribeMessages) unsubscribeMessages();
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
    document.getElementById('profileModal').classList.add('active');
});

document.getElementById('saveNameBtn').addEventListener('click', async () => {
    const newName = document.getElementById('editName').value.trim();
    if (newName && currentUser) {
        await updateProfile(currentUser, { displayName: newName });
        await updateDoc(doc(db, 'users', currentUser.uid), { name: newName });
        userNameSpan.textContent = newName;
        profileNameSpan.textContent = newName;
        document.getElementById('profileModal').classList.remove('active');
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
