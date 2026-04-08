// FirebaseService.js
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  ref, set, get, update, push, onValue
} from 'firebase/database';

// ========== АВТОРИЗАЦИЯ ==========
export const register = async (email, password, username, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await set(ref(db, `users/${user.uid}`), {
      uid: user.uid,
      email,
      username: username.toLowerCase(),
      name: name || username,
      nick: `@${username}`,
      avatar: null,
      bio: '',
      createdAt: new Date().toISOString()
    });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== ПРОФИЛИ ==========
export const getUserProfile = async (uid) => {
  try {
    const snapshot = await get(ref(db, `users/${uid}`));
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: 'Пользователь не найден' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (uid, updates) => {
  try {
    await update(ref(db, `users/${uid}`), updates);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== ПОИСК ПОЛЬЗОВАТЕЛЕЙ ==========
export const searchUsersByUsername = async (username) => {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = [];
    const searchTerm = username.toLowerCase().replace('@', '');
    
    snapshot.forEach((child) => {
      const user = child.val();
      if (user.username && user.username.includes(searchTerm)) {
        users.push({ uid: child.key, ...user });
      }
    });
    
    return { success: true, users };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== ЧАТЫ ==========
export const createOrGetChat = async (user1Id, user2Id) => {
  try {
    const chatsRef = ref(db, 'chats');
    const snapshot = await get(chatsRef);
    let existingChatId = null;
    
    snapshot.forEach((child) => {
      const chat = child.val();
      if (chat.participants && 
          chat.participants.includes(user1Id) && 
          chat.participants.includes(user2Id)) {
        existingChatId = child.key;
      }
    });
    
    if (existingChatId) {
      return { success: true, chatId: existingChatId };
    }
    
    const newChatRef = push(ref(db, 'chats'));
    await set(newChatRef, {
      participants: [user1Id, user2Id],
      createdAt: new Date().toISOString(),
      lastMessage: '',
      lastMessageTime: new Date().toISOString()
    });
    
    return { success: true, chatId: newChatRef.key };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== СООБЩЕНИЯ ==========
export const sendMessage = async (chatId, text, senderId) => {
  try {
    const messagesRef = ref(db, `messages/${chatId}`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      text,
      senderId,
      timestamp: new Date().toISOString(),
      read: false
    });
    
    await update(ref(db, `chats/${chatId}`), {
      lastMessage: text,
      lastMessageTime: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Подписка на сообщения в реальном времени
export const subscribeToMessages = (chatId, callback) => {
  const messagesRef = ref(db, `messages/${chatId}`);
  return onValue(messagesRef, (snapshot) => {
    const messages = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    callback(messages);
  });
};

// Подписка на чаты пользователя (ИСПРАВЛЕННАЯ ВЕРСИЯ)
export const subscribeToUserChats = (userId, callback) => {
  const chatsRef = ref(db, 'chats');
  
  return onValue(chatsRef, async (snapshot) => {
    const userChats = [];
    const promises = [];
    
    snapshot.forEach((child) => {
      const chat = { id: child.key, ...child.val() };
      if (chat.participants && chat.participants.includes(userId)) {
        const otherUserId = chat.participants.find(id => id !== userId);
        // Добавляем промис для получения профиля
        promises.push(
          getUserProfile(otherUserId).then(profile => {
            if (profile.success) {
              userChats.push({
                id: chat.id,
                name: profile.data.name,
                nick: profile.data.nick,
                avatar: profile.data.avatar,
                lastMessage: chat.lastMessage || '',
                time: chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                userId: otherUserId,
                bio: profile.data.bio || ''
              });
            }
          })
        );
      }
    });
    
    await Promise.all(promises);
    callback(userChats);
  });
};