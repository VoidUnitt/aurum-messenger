// Импорт Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, getDoc, getDocs, where, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);

// Переменные состояния
let currentUser = null;
let currentChat = null;
let currentChatType = 'private'; // 'private' или 'group'
let currentContact = null;
let unsubscribeMessages = null;
let mediaRecorder = null;
let audioChunks = [];
let currentCall = null;
let callStartTime = null;
let callTimerInterval = null;
let peerConnection = null;
let localStream = null;
let notificationsEnabled = true;

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
const chatStatusSpan = document.getElementById('chatStatus');
const contactsList = document.getElementById('contactsList');
const voiceBtn = document.getElementById('voiceBtn');
const attachBtn = document.getElementById('attachBtn');
const voiceRecordingDiv = document.getElementById('voiceRecording');
const stopRecordingBtn = document.getElementById('stopRecordingBtn');
const audioCallBtn = document.getElementById('audioCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const notificationsStatusSpan = document.getElementById('notificationsStatus');

// ========== АВТОРИЗАЦИЯ ==========
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
            groups: [],
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
        
        // Запрос разрешения на уведомления
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } else {
        authScreen.style.display = 'flex';
        mainScreen.style.display = 'none';
        if (unsubscribeMessages) unsubscribeMessages();
        if (currentCall) endCall();
    }
});

// ========== ЗАГРУЗКА ЧАТОВ ==========
async function loadChats() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    const chatIds = userData?.chats || [];
    const groupIds = userData?.groups || [];
    
    if (chatIds.length === 0 && groupIds.length === 0) {
        chatsList.innerHTML = '<div style="text-align:center;padding:40px;color:#6c7a8e;">Нет чатов</div>';
        return;
    }
    
    let chatsHtml = '';
    
    // Личные чаты
    for (const chatId of chatIds) {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (chatDoc.exists()) {
            const chat = chatDoc.data();
            const otherId = chat.participants.find(id => id !== currentUser.uid);
            const otherUser = await getDoc(doc(db, 'users', otherId));
            const otherData = otherUser.data();
            
            chatsHtml += `
                <div class="chat-item" data-chat-id="${chatId}" data-chat-type="private" data-user-id="${otherId}">
                    <div class="chat-avatar">${otherData?.avatar || '👤'}</div>
                    <div class="chat-info">
                        <div class="chat-name">${escapeHtml(otherData?.name || 'Пользователь')}</div>
                        <div class="chat-last-message">${chat.lastMessage?.substring(0, 30) || 'Нет сообщений'}</div>
                    </div>
                    <div class="chat-time">${chat.lastTime ? formatTime(chat.lastTime) : ''}</div>
                </div>
            `;
        }
    }
    
    // Групповые чаты
    for (const groupId of groupIds) {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
            const group = groupDoc.data();
            chatsHtml += `
                <div class="chat-item" data-chat-id="${groupId}" data-chat-type="group">
                    <div class="chat-avatar group-avatar">👥</div>
                    <div class="chat-info">
                        <div class="chat-name">${escapeHtml(group.name)} <span class="chat-badge">Группа</span></div>
                        <div class="chat-last-message">${group.lastMessage?.substring(0, 30) || 'Нет сообщений'}</div>
                    </div>
                    <div class="chat-time">${group.lastTime ? formatTime(group.lastTime) : ''}</div>
                </div>
            `;
        }
    }
    
    chatsList.innerHTML = chatsHtml;
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => {
            const chatId = el.dataset.chatId;
            const chatType = el.dataset.chatType;
            const userId = el.dataset.userId;
            openChat(chatId, chatType, userId);
        });
    });
}

// ========== ОТКРЫТЬ ЧАТ ==========
async function openChat(chatId, type, userId = null) {
    currentChat = chatId;
    currentChatType = type;
    currentContact = userId;
    
    if (type === 'private' && userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        chatNameSpan.textContent = userData?.name || 'Пользователь';
        chatAvatar.innerHTML = userData?.avatar || '👤';
        chatStatusSpan.textContent = 'в сети';
    } else if (type === 'group') {
        const groupDoc = await getDoc(doc(db, 'groups', chatId));
        const groupData = groupDoc.data();
        chatNameSpan.textContent = groupData?.name || 'Группа';
        chatAvatar.innerHTML = '👥';
        chatStatusSpan.textContent = `${groupData?.members?.length || 0} участников`;
    }
    
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('chatPanel').classList.add('active');
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    const collectionPath = type === 'private' 
        ? collection(db, 'chats', chatId, 'messages')
        : collection(db, 'groups', chatId, 'messages');
    
    const messagesQuery = query(collectionPath, orderBy('time', 'asc'));
    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const isOutgoing = msg.senderId === currentUser.uid;
            renderMessage(msg, isOutgoing);
        });
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    });
}

function renderMessage(msg, isOutgoing) {
    if (msg.type === 'text') {
        messagesContainer.innerHTML += `
            <div class="message message-${isOutgoing ? 'outgoing' : 'incoming'}">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${formatTime(msg.time)}</div>
            </div>
        `;
    } else if (msg.type === 'image') {
        messagesContainer.innerHTML += `
            <div class="message message-${isOutgoing ? 'outgoing' : 'incoming'}">
                <div class="message-image" onclick="window.open('${msg.imageUrl}', '_blank')">
                    <img src="${msg.imageUrl}" alt="image">
                </div>
                <div class="message-time">${formatTime(msg.time)}</div>
            </div>
        `;
    } else if (msg.type === 'audio') {
        messagesContainer.innerHTML += `
            <div class="message message-${isOutgoing ? 'outgoing' : 'incoming'}">
                <div class="message-audio">
                    <button onclick="playAudio('${msg.audioUrl}')"><i class="fas fa-play"></i></button>
                    <span>Голосовое сообщение</span>
                    <span>${msg.duration || '0:05'}</span>
                </div>
                <div class="message-time">${formatTime(msg.time)}</div>
            </div>
        `;
    }
}

// ========== ОТПРАВКА СООБЩЕНИЙ ==========
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    
    const collectionPath = currentChatType === 'private' 
        ? collection(db, 'chats', currentChat, 'messages')
        : collection(db, 'groups', currentChat, 'messages');
    
    await addDoc(collectionPath, {
        text: text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        time: Date.now(),
        type: 'text'
    });
    
    const updatePath = currentChatType === 'private' 
        ? doc(db, 'chats', currentChat)
        : doc(db, 'groups', currentChat);
    
    await updateDoc(updatePath, {
        lastMessage: text,
        lastTime: Date.now()
    });
    
    messageInput.value = '';
    
    // Уведомление
    if (notificationsEnabled && document.hidden) {
        showNotification('Новое сообщение', text);
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// ========== ФОТО ==========
attachBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentChat) return;
        
        const storageRef = ref(storage, `messages/${currentChat}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);
        
        const collectionPath = currentChatType === 'private' 
            ? collection(db, 'chats', currentChat, 'messages')
            : collection(db, 'groups', currentChat, 'messages');
        
        await addDoc(collectionPath, {
            imageUrl: imageUrl,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            time: Date.now(),
            type: 'image'
        });
    };
    input.click();
});

// ========== ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
voiceBtn.addEventListener('click', startRecording);

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const storageRef = ref(storage, `messages/${currentChat}/${Date.now()}_voice.webm`);
            await uploadBytes(storageRef, audioBlob);
            const audioUrl = await getDownloadURL(storageRef);
            
            const collectionPath = currentChatType === 'private' 
                ? collection(db, 'chats', currentChat, 'messages')
                : collection(db, 'groups', currentChat, 'messages');
            
            await addDoc(collectionPath, {
                audioUrl: audioUrl,
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                time: Date.now(),
                type: 'audio',
                duration: '0:05'
            });
            
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        voiceRecordingDiv.style.display = 'flex';
        voiceBtn.style.display = 'none';
    } catch (err) {
        alert('Нет доступа к микрофону');
    }
}

stopRecordingBtn.addEventListener('click', () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
        voiceRecordingDiv.style.display = 'none';
        voiceBtn.style.display = 'flex';
    }
});

window.playAudio = (url) => {
    const audio = new Audio(url);
    audio.play();
};

// ========== ЗВОНКИ ==========
let localStreamCall = null;
let peerConnectionCall = null;

async function startCall(type, name) {
    const modal = document.getElementById('callModal');
    document.getElementById('callName').textContent = name;
    document.getElementById('callStatus').textContent = 'Соединение...';
    document.getElementById('callTimer').textContent = '00:00';
    modal.classList.add('active');
    
    try {
        localStreamCall = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: type === 'video' 
        });
        
        if (type === 'video') {
            const videoContainer = document.createElement('div');
            videoContainer.style.position = 'fixed';
            videoContainer.style.bottom = '100px';
            videoContainer.style.right = '20px';
            videoContainer.style.width = '120px';
            videoContainer.style.height = '160px';
            videoContainer.style.backgroundColor = '#000';
            videoContainer.style.borderRadius = '12px';
            videoContainer.style.zIndex = '1001';
            
            const video = document.createElement('video');
            video.srcObject = localStreamCall;
            video.autoplay = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            videoContainer.appendChild(video);
            document.body.appendChild(videoContainer);
        }
        
        document.getElementById('callStatus').textContent = 'Разговор идёт...';
        
        callStartTime = Date.now();
        callTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('callTimer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        const ringtone = document.getElementById('ringtone');
        ringtone.play();
        
    } catch (err) {
        alert('Нет доступа к микрофону/камере');
        endCall();
    }
}

function endCall() {
    if (localStreamCall) {
        localStreamCall.getTracks().forEach(track => track.stop());
        localStreamCall = null;
    }
    if (callTimerInterval) clearInterval(callTimerInterval);
    
    document.getElementById('callModal').classList.remove('active');
    document.getElementById('callEnd').play();
    
    const videoContainer = document.querySelector('div[style*="bottom: 100px"]');
    if (videoContainer) videoContainer.remove();
}

audioCallBtn.addEventListener('click', () => {
    const name = chatNameSpan.textContent;
    startCall('audio', name);
});

videoCallBtn.addEventListener('click', () => {
    const name = chatNameSpan.textContent;
    startCall('video', name);
});

document.getElementById('endCallBtn').addEventListener('click', endCall);

// ========== ГРУППОВЫЕ ЧАТЫ ==========
document.getElementById('newGroupBtn').addEventListener('click', () => {
    document.getElementById('newGroupModal').classList.add('active');
});

document.getElementById('createGroupBtn').addEventListener('click', async () => {
    const groupName = document.getElementById('groupName').value.trim();
    const membersEmails = document.getElementById('groupMembers').value.split(',').map(e => e.trim());
    
    if (!groupName) {
        alert('Введите название группы');
        return;
    }
    
    const memberIds = [currentUser.uid];
    
    for (const email of membersEmails) {
        if (!email) continue;
        const usersQuery = query(collection(db, 'users'), where('phone', '==', email));
        const snapshot = await getDocs(usersQuery);
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                if (!memberIds.includes(doc.id)) memberIds.push(doc.id);
            });
        }
    }
    
    const groupId = Date.now().toString();
    await setDoc(doc(db, 'groups', groupId), {
        name: groupName,
        members: memberIds,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        lastMessage: '',
        lastTime: null
    });
    
    for (const memberId of memberIds) {
        await updateDoc(doc(db, 'users', memberId), {
            groups: arrayUnion(groupId)
        });
    }
    
    document.getElementById('newGroupModal').classList.remove('active');
    document.getElementById('groupName').value = '';
    document.getElementById('groupMembers').value = '';
    loadChats();
});

// ========== КОНТАКТЫ ==========
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
                        <div class="contact-name">${escapeHtml(contact.name)}</div>
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
        openChat(existingChatId, 'private', userId);
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
        
        openChat(chatId, 'private', userId);
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
                    <div><strong>${escapeHtml(user.name)}</strong></div>
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

// ========== НАВИГАЦИЯ ==========
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

// ========== НАСТРОЙКИ ==========
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

document.getElementById('notificationsBtn').addEventListener('click', () => {
    notificationsEnabled = !notificationsEnabled;
    notificationsStatusSpan.textContent = notificationsEnabled ? 'Вкл' : 'Выкл';
    if (notificationsEnabled && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
});

// ========== УВЕДОМЛЕНИЯ ==========
function showNotification(title, body) {
    if (notificationsEnabled && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%234a9eff"/%3E%3Ctext x="50" y="67" font-size="50" text-anchor="middle" fill="white"%3EA%3C/text%3E%3C/svg%3E' });
        const audio = document.getElementById('notificationSound');
        audio.play();
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Закрытие модалок
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

// Фокус на ввод
document.addEventListener('click', () => {
    if (document.getElementById('chatPanel').classList.contains('active')) {
        messageInput.focus();
    }
});

console.log('🚀 Aurum Messenger полностью загружен!');
