import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, ScrollView, Modal, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { ThemeProvider, useTheme } from './ThemeContext';
import AuthScreen from './AuthScreen';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile, sendMessage, subscribeToMessages } from './FirebaseService';

// ========== ЦВЕТА ТЕМ ==========
const colors = {
  light: {
    background: '#FDFBF7',
    text: '#2C2B28',
    header: '#F9F6EE',
    border: '#E6E2D8',
    accent: '#C4A77D',
    inputBg: '#F9F6EE',
    bubble: '#EDE8DE',
    icon: '#2C2B28',
    avatarBg: '#E8E2D4',
    avatarDarkBg: '#D9D0C0',
    placeholder: '#A8A29E',
    timeText: '#A8A29E',
    chatName: '#2C2B28',
    chatNick: '#8C857D',
    chatLastMsg: '#8C857D',
    myBubble: '#007aff',
  },
  dark: {
    background: '#1A1A1A',
    text: '#F0EBE1',
    header: '#242424',
    border: '#33302B',
    accent: '#D4B88C',
    inputBg: '#242424',
    bubble: '#2A2A2A',
    icon: '#F0EBE1',
    avatarBg: '#2F2F2F',
    avatarDarkBg: '#3A3A3A',
    placeholder: '#A0988C',
    timeText: '#A0988C',
    chatName: '#F0EBE1',
    chatNick: '#B8B0A4',
    chatLastMsg: '#B8B0A4',
    myBubble: '#0A84FF',
  },
};

// ========== КОМПОНЕНТ МОДАЛЬНОГО МЕНЮ ==========
function LogoMenuModal({ visible, onClose, onNotifications, onChangeTheme }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.logoMenuContainer}>
          <TouchableOpacity style={styles.logoMenuItem} onPress={onNotifications}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <Text style={styles.logoMenuText}>Уведомления</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoMenuItem} onPress={onChangeTheme}>
            <Ionicons name="color-palette-outline" size={24} color="#fff" />
            <Text style={styles.logoMenuText}>Смена темы</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

// ========== ЛЕНТА ==========
function FeedScreen({ profile }) {
  const navigation = useNavigation();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  return (
    <View style={{ flex: 1, backgroundColor: currentColors.background }}>
      <View style={[styles.header, { backgroundColor: currentColors.header, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => setShowThemeMenu(!showThemeMenu)}>
          <Ionicons name="menu-outline" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image 
            source={theme === 'dark' ? require('./assets/logo_interface_dark_theme.png') : require('./assets/logo_interface_light_theme.png')} 
            style={styles.logoImage} 
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Профиль')}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: currentColors.avatarBg, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20 }}>🧑</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {showThemeMenu && (
        <View style={[styles.themeMenu, { backgroundColor: currentColors.header }]}>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('light'); setShowThemeMenu(false); }}>
            <Ionicons name="sunny-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Светлая тема</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('dark'); setShowThemeMenu(false); }}>
            <Ionicons name="moon-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Тёмная тема</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.center}>
        <Text style={{ color: currentColors.text }}>Лента</Text>
      </View>
      <LogoMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNotifications={() => {
          setMenuVisible(false);
          Alert.alert('Уведомления', 'Скоро здесь будут уведомления');
        }}
        onChangeTheme={() => {
          setMenuVisible(false);
          setTheme(theme === 'dark' ? 'light' : 'dark');
        }}
      />
    </View>
  );
}

// ========== ЧАТЫ ==========
// ========== ЧАТЫ ==========
function ChatsScreen({ profile }) {
  const navigation = useNavigation();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  // Подписка на чаты из Firebase
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsubscribe = subscribeToUserChats(currentUser.uid, (userChats) => {
      setChats(userChats);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredChats = chats.filter(chat => 
    chat.nick.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (chat) => {
    navigation.navigate('ChatRoom', {
      chatId: chat.id,
      chatName: chat.name,
      chatNick: chat.nick,
      chatAvatar: chat.avatar,
      chatBio: chat.bio || '',
      chatBanner: chat.banner || null,
      chatPosts: chat.posts || [],
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: currentColors.background }}>
      <View style={[styles.header, { backgroundColor: currentColors.header, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => setShowThemeMenu(!showThemeMenu)}>
          <Ionicons name="menu-outline" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        
        {/* КНОПКА ПОИСКА - ДЛЯ ПОИСКА ПОЛЬЗОВАТЕЛЕЙ */}
        <TouchableOpacity onPress={() => navigation.navigate('SearchUsers')}>
          <Ionicons name="search" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('Профиль')}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: currentColors.avatarBg, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20 }}>🧑</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {showThemeMenu && (
        <View style={[styles.themeMenu, { backgroundColor: currentColors.header }]}>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('light'); setShowThemeMenu(false); }}>
            <Ionicons name="sunny-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Светлая тема</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('dark'); setShowThemeMenu(false); }}>
            <Ionicons name="moon-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Тёмная тема</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={[styles.searchContainer, { borderBottomColor: currentColors.border }]}>
        <Ionicons name="search-outline" size={20} color={currentColors.placeholder} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.inputBg }]}
          placeholder="Поиск по @username"
          placeholderTextColor={currentColors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: currentColors.text }}>Загрузка чатов...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chatItemWrapper, { borderBottomColor: currentColors.border }]} onPress={() => openChat(item)}>
              <View style={[styles.chatAvatar, { backgroundColor: currentColors.avatarDarkBg, justifyContent: 'center', alignItems: 'center' }]}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
                ) : (
                  <Text style={{ fontSize: 18 }}>🧑</Text>
                )}
              </View>
              <View style={styles.chatInfo}>
                <Text style={[styles.chatName, { color: currentColors.chatName }]}>{item.name}</Text>
                <Text style={[styles.chatLastMessage, { color: currentColors.chatLastMsg }]} numberOfLines={1}>{item.lastMessage || 'Нет сообщений'}</Text>
              </View>
              <Text style={[styles.chatTime, { color: currentColors.timeText }]}>{item.time || ''}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: currentColors.placeholder, marginTop: 50 }}>
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов. Начните диалог через поиск →'}
              </Text>
            </View>
          }
        />
      )}
      
      <LogoMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNotifications={() => {
          setMenuVisible(false);
          Alert.alert('Уведомления', 'Скоро здесь будут уведомления');
        }}
        onChangeTheme={() => {
          setMenuVisible(false);
          setTheme(theme === 'dark' ? 'light' : 'dark');
        }}
      />
    </View>
  );
}

// ========== БИБЛИОТЕКА ==========
function LibraryScreen({ profile }) {
  const navigation = useNavigation();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  return (
    <View style={{ flex: 1, backgroundColor: currentColors.background }}>
      <View style={[styles.header, { backgroundColor: currentColors.header, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => setShowThemeMenu(!showThemeMenu)}>
          <Ionicons name="menu-outline" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image 
            source={theme === 'dark' ? require('./assets/logo_interface_dark_theme.png') : require('./assets/logo_interface_light_theme.png')} 
            style={styles.logoImage} 
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Профиль')}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: currentColors.avatarBg, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20 }}>🧑</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {showThemeMenu && (
        <View style={[styles.themeMenu, { backgroundColor: currentColors.header }]}>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('light'); setShowThemeMenu(false); }}>
            <Ionicons name="sunny-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Светлая тема</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('dark'); setShowThemeMenu(false); }}>
            <Ionicons name="moon-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Тёмная тема</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.center}>
        <Text style={{ color: currentColors.text }}>Библиотека</Text>
      </View>
      <LogoMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNotifications={() => {
          setMenuVisible(false);
          Alert.alert('Уведомления', 'Скоро здесь будут уведомления');
        }}
        onChangeTheme={() => {
          setMenuVisible(false);
          setTheme(theme === 'dark' ? 'light' : 'dark');
        }}
      />
    </View>
  );
}

// ========== ПРОФИЛЬ (СВОЙ) ==========
function ProfileScreen({ profile, setProfile }) {
  const navigation = useNavigation();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [name, setName] = useState(profile.name);
  const [nick, setNick] = useState(profile.nick);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [banner, setBanner] = useState(profile.banner);
  const [bio, setBio] = useState(profile.bio || '');
  const [posts, setPosts] = useState(profile.posts || []);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showBannerMenu, setShowBannerMenu] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [addToLibrary, setAddToLibrary] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  const pickImage = async (isBanner = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isBanner ? [16, 9] : [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      if (isBanner) setBanner(result.assets[0].uri);
      else setAvatar(result.assets[0].uri);
    }
    setShowAvatarMenu(false);
    setShowBannerMenu(false);
  };

  const removeAvatar = () => { setAvatar(null); setShowAvatarMenu(false); };
  const removeBanner = () => { setBanner(null); setShowBannerMenu(false); };

  const createPost = () => {
    if (!newPostText.trim() && !newPostImage) {
      Alert.alert('Ошибка', 'Добавьте текст или фото');
      return;
    }
    const newPost = {
      id: Date.now(),
      text: newPostText,
      image: newPostImage,
      date: new Date().toLocaleString(),
      inLibrary: addToLibrary,
    };
    setPosts([newPost, ...posts]);
    setNewPostText('');
    setNewPostImage(null);
    setAddToLibrary(true);
    setShowPostModal(false);
  };

  const saveProfile = () => {
    const newProfile = { name, nick, avatar, banner, bio, posts };
    setProfile(newProfile);
    Alert.alert('Сохранено', 'Профиль обновлён');
  };

  return (
    <ScrollView style={[styles.profileContainer, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { backgroundColor: currentColors.header, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => setShowThemeMenu(!showThemeMenu)}>
          <Ionicons name="menu-outline" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image 
            source={theme === 'dark' ? require('./assets/logo_interface_dark_theme.png') : require('./assets/logo_interface_light_theme.png')} 
            style={styles.logoImage} 
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={currentColors.icon} />
        </TouchableOpacity>
      </View>
      {showThemeMenu && (
        <View style={[styles.themeMenu, { backgroundColor: currentColors.header }]}>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('light'); setShowThemeMenu(false); }}>
            <Ionicons name="sunny-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Светлая тема</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('dark'); setShowThemeMenu(false); }}>
            <Ionicons name="moon-outline" size={24} color={currentColors.text} />
            <Text style={[styles.themeText, { color: currentColors.text }]}>Тёмная тема</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity onPress={() => setShowBannerMenu(true)}>
        {banner ? <Image source={{ uri: banner }} style={styles.banner} /> : <View style={[styles.banner, { backgroundColor: currentColors.avatarBg }]} />}
      </TouchableOpacity>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={() => setShowAvatarMenu(true)}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.profileAvatar} /> : <View style={[styles.profileAvatar, { backgroundColor: currentColors.avatarDarkBg, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ fontSize: 40 }}>🧑</Text></View>}
        </TouchableOpacity>
      </View>
      <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.inputBg }]} placeholder="Имя" placeholderTextColor={currentColors.placeholder} value={name} onChangeText={setName} />
      <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.inputBg }]} placeholder="Ник" placeholderTextColor={currentColors.placeholder} value={nick} onChangeText={setNick} />
      <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.inputBg, height: 80 }]} placeholder="Описание профиля" placeholderTextColor={currentColors.placeholder} value={bio} onChangeText={setBio} multiline />
      <TouchableOpacity style={styles.saveButton} onPress={saveProfile}><Text style={styles.saveButtonText}>Сохранить</Text></TouchableOpacity>
      <View style={[styles.divider, { backgroundColor: currentColors.border }]} />
      <View style={styles.postsHeader}>
        <Text style={[styles.postsTitle, { color: currentColors.text }]}>Посты</Text>
        <TouchableOpacity onPress={() => setShowPostModal(true)}><Ionicons name="add-circle" size={32} color={currentColors.accent} /></TouchableOpacity>
      </View>
      {posts.length === 0 ? (
        <View style={styles.emptyPostsContainer}><Text style={[styles.emptyPostsText, { color: currentColors.placeholder }]}>пока здесь пусто</Text></View>
      ) : (
        posts.map(post => (
          <View key={post.id} style={[styles.postCard, { backgroundColor: currentColors.bubble }]}>
            {post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}
            <Text style={[styles.postText, { color: currentColors.text }]}>{post.text}</Text>
            <Text style={[styles.postDate, { color: currentColors.timeText }]}>{post.date}</Text>
            <View style={styles.libraryBadge}><Text style={{ color: post.inLibrary ? currentColors.accent : currentColors.placeholder }}>{post.inLibrary ? '📚 В библиотеке' : '🚫 Не в библиотеке'}</Text></View>
          </View>
        ))
      )}
      <Modal visible={showAvatarMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAvatarMenu(false)}>
          <View style={[styles.modalMenu, { backgroundColor: currentColors.header }]}>
            <TouchableOpacity style={styles.modalItem} onPress={() => pickImage(false)}><Text style={[styles.modalText, { color: currentColors.text }]}>Добавить фото</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={removeAvatar}><Text style={[styles.modalText, { color: '#ff3b30' }]}>Удалить фото</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={() => setShowAvatarMenu(false)}><Text style={[styles.modalText, { color: currentColors.text }]}>Отмена</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={showBannerMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowBannerMenu(false)}>
          <View style={[styles.modalMenu, { backgroundColor: currentColors.header }]}>
            <TouchableOpacity style={styles.modalItem} onPress={() => pickImage(true)}><Text style={[styles.modalText, { color: currentColors.text }]}>Добавить банер</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={removeBanner}><Text style={[styles.modalText, { color: '#ff3b30' }]}>Удалить банер</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalItem} onPress={() => setShowBannerMenu(false)}><Text style={[styles.modalText, { color: currentColors.text }]}>Отмена</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={showPostModal} animationType="slide">
        <View style={[styles.modalFull, { backgroundColor: currentColors.background }]}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: currentColors.text }]}>Новый пост</Text><TouchableOpacity onPress={() => setShowPostModal(false)}><Ionicons name="close" size={28} color={currentColors.icon} /></TouchableOpacity></View>
          <TouchableOpacity style={styles.imagePickerButton} onPress={async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 }); if (!result.canceled) setNewPostImage(result.assets[0].uri); }}><Text style={styles.imagePickerText}>Добавить фото</Text></TouchableOpacity>
          {newPostImage && <Image source={{ uri: newPostImage }} style={styles.previewImage} />}
          <TextInput style={[styles.postInput, { color: currentColors.text, borderColor: currentColors.border }]} placeholder="Текст поста" placeholderTextColor={currentColors.placeholder} value={newPostText} onChangeText={setNewPostText} multiline />
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAddToLibrary(!addToLibrary)}><View style={[styles.checkbox, addToLibrary && styles.checkboxChecked]}>{addToLibrary && <Ionicons name="checkmark" size={16} color="#fff" />}</View><Text style={[styles.checkboxLabel, { color: currentColors.text }]}>Библиотека</Text></TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={createPost}><Text style={styles.createButtonText}>Опубликовать</Text></TouchableOpacity>
        </View>
      </Modal>
      <LogoMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNotifications={() => { setMenuVisible(false); Alert.alert('Уведомления', 'Скоро здесь будут уведомления'); }}
        onChangeTheme={() => { setMenuVisible(false); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
      />
    </ScrollView>
  );
}

// ========== ЧУЖОЙ ПРОФИЛЬ ==========
function OtherProfileScreen({ route }) {
  const { userId, name, nick, avatar, banner, bio, posts, chatParams } = route.params;
  const navigation = useNavigation();
  const { theme } = useTheme();
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  const goBack = () => {
    const routes = navigation.getState().routes;
    const previousRoute = routes[routes.length - 2]?.name;
    if (previousRoute === 'ChatRoom' && chatParams) {
      navigation.navigate('ChatRoom', chatParams);
    } else if (previousRoute === 'Чаты') {
      navigation.navigate('Чаты');
    } else {
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={[styles.profileContainer, { backgroundColor: currentColors.background }]}>
      <View style={[styles.header, { backgroundColor: currentColors.header, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={goBack}>
          <Ionicons name="arrow-back" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        <Text style={[styles.logo, { color: currentColors.text }]}>Профиль</Text>
        <View style={{ width: 28 }} />
      </View>
      {banner ? <Image source={{ uri: banner }} style={styles.banner} /> : <View style={[styles.banner, { backgroundColor: currentColors.avatarBg }]} />}
      <View style={styles.avatarContainer}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.profileAvatar} /> : <View style={[styles.profileAvatar, { backgroundColor: currentColors.avatarDarkBg, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ fontSize: 40 }}>🧑</Text></View>}
      </View>
      <Text style={[styles.otherName, { color: currentColors.text, textAlign: 'center', marginTop: 60 }]}>{name}</Text>
      <Text style={[styles.otherNick, { color: currentColors.chatNick, textAlign: 'center' }]}>{nick}</Text>
      {bio ? <Text style={[styles.otherBio, { color: currentColors.chatLastMsg, textAlign: 'center', marginHorizontal: 20, marginTop: 10 }]}>{bio}</Text> : null}
      <View style={[styles.divider, { backgroundColor: currentColors.border }]} />
      <View style={styles.postsHeader}>
        <Text style={[styles.postsTitle, { color: currentColors.text }]}>Посты</Text>
      </View>
      {posts && posts.length === 0 ? (
        <View style={styles.emptyPostsContainer}>
          <Text style={[styles.emptyPostsText, { color: currentColors.placeholder }]}>пока здесь пусто</Text>
        </View>
      ) : (
        posts && posts.map(post => (
          <View key={post.id} style={[styles.postCard, { backgroundColor: currentColors.bubble }]}>
            {post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}
            <Text style={[styles.postText, { color: currentColors.text }]}>{post.text}</Text>
            <Text style={[styles.postDate, { color: currentColors.timeText }]}>{post.date}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ========== КОМНАТА ЧАТА ==========
// ========== КОМНАТА ЧАТА ==========
function ChatRoomScreen({ route }) {
  const { chatId, chatName, chatNick, chatAvatar, chatBio, chatBanner, chatPosts } = route.params;
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  // Подписка на сообщения из Firebase в реальном времени
  useEffect(() => {
    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      const formattedMessages = msgs.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.senderId === auth.currentUser?.uid ? 'me' : 'them',
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(formattedMessages);
    });
    
    return unsubscribe;
  }, [chatId]);

  // Скрываем таб-бар при входе в чат
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarStyle: { display: 'flex' } });
      }
    };
  }, [navigation]);

  // Отправка сообщения в Firebase
  const sendMessageToFirebase = async () => {
    if (inputText.trim()) {
      await sendMessage(chatId, inputText.trim(), auth.currentUser?.uid);
      setInputText('');
    }
  };

  const openOtherProfile = () => {
    navigation.navigate('OtherProfile', {
      userId: chatId,
      name: chatName,
      nick: chatNick,
      avatar: chatAvatar,
      banner: chatBanner,
      bio: chatBio,
      posts: chatPosts || [],
      chatParams: {
        chatId,
        chatName,
        chatNick,
        chatAvatar,
        chatBio,
        chatBanner,
        chatPosts,
      }
    });
  };

  const goBack = () => {
    navigation.navigate('Чаты');
  };

  return (
    <View style={{ flex: 1, backgroundColor: currentColors.background }}>
      <View style={[styles.chatRoomHeader, { backgroundColor: currentColors.header, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={goBack}>
          <Ionicons name="arrow-back" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatRoomUserInfo} onPress={openOtherProfile}>
          {chatAvatar ? (
            <Image source={{ uri: chatAvatar }} style={styles.chatRoomAvatar} />
          ) : (
            <View style={[styles.chatRoomAvatar, { backgroundColor: currentColors.avatarDarkBg, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20 }}>🧑</Text>
            </View>
          )}
          <View style={styles.chatRoomNameContainer}>
            <Text style={[styles.chatRoomName, { color: currentColors.text }]}>{chatName}</Text>
            <Text style={[styles.chatRoomNick, { color: currentColors.chatNick }]}>{chatNick}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.sender === 'me' ? styles.myMessageRow : styles.theirMessageRow]}>
            <View style={[styles.messageBubble, item.sender === 'me' ? { backgroundColor: currentColors.myBubble } : { backgroundColor: currentColors.bubble }]}>
              <Text style={[styles.messageText, { color: item.sender === 'me' ? '#fff' : currentColors.text }]}>{item.text}</Text>
              <Text style={[styles.messageTime, { color: currentColors.timeText }]}>{item.time}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={[styles.inputContainer, { backgroundColor: currentColors.header, borderTopColor: currentColors.border }]}>
        <TextInput
          style={[styles.input, { color: currentColors.text, backgroundColor: currentColors.inputBg }]}
          placeholder="Сообщение..."
          placeholderTextColor={currentColors.placeholder}
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessageToFirebase}>
          <Ionicons name="send" size={24} color={currentColors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();
  const currentColors = theme === 'dark' ? colors.dark : colors.light;
  return (
    <View style={[styles.customTabBar, { backgroundColor: currentColors.header }]}>
      <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('Лента')}>
        <Ionicons name={state.index === 0 ? 'newspaper' : 'newspaper-outline'} size={30} color={state.index === 0 ? currentColors.accent : (theme === 'dark' ? '#888' : '#aaa')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('Чаты')}>
        <Ionicons name={state.index === 1 ? 'chatbubbles' : 'chatbubbles-outline'} size={30} color={state.index === 1 ? currentColors.accent : (theme === 'dark' ? '#888' : '#aaa')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('Библиотека')}>
        <Ionicons name={state.index === 2 ? 'bookmark' : 'bookmark-outline'} size={30} color={state.index === 2 ? currentColors.accent : (theme === 'dark' ? '#888' : '#aaa')} />
      </TouchableOpacity>
    </View>
  );
}

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [profile, setProfile] = useState({ name: 'Пользователь', nick: '@user', avatar: null, banner: null, bio: '', posts: [] });
  
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Загружаем профиль из Firebase
      const result = await getUserProfile(user.uid);
      if (result.success) {
        setProfile(result.data);
      }
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  });
  return unsubscribe;
}, []);

  // Проверка авторизации
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await AsyncStorage.getItem('currentUser');
        setIsAuthenticated(!!user);
      } catch (e) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Загрузка профиля (только если авторизован)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem('profile');
        if (saved) setProfile(JSON.parse(saved));
      } catch (e) {}
    };
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  // Сохранение профиля (только если авторизован)
  useEffect(() => {
    if (isAuthenticated) {
      AsyncStorage.setItem('profile', JSON.stringify(profile));
    }
  }, [profile, isAuthenticated]);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuth={() => setIsAuthenticated(true)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => {
          const routeName = props.state.routes[props.state.index].name;
          if (routeName === 'Профиль' || routeName === 'ChatRoom' || routeName === 'OtherProfile') return null;
          return <CustomTabBar {...props} />;
        }}
        screenOptions={{ headerShown: false }}
        initialRouteName="Лента"
      >
        <Tab.Screen name="Лента">{(props) => <FeedScreen {...props} profile={profile} />}</Tab.Screen>
        <Tab.Screen name="Чаты">{(props) => <ChatsScreen {...props} profile={profile} />}</Tab.Screen>
        <Tab.Screen name="Библиотека">{(props) => <LibraryScreen {...props} profile={profile} />}</Tab.Screen>
        <Tab.Screen name="Профиль">{(props) => <ProfileScreen {...props} profile={profile} setProfile={setProfile} />}</Tab.Screen>
        <Tab.Screen name="ChatRoom" component={ChatRoomScreen} options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: { display: 'none' } }} />
        <Tab.Screen name="OtherProfile" component={OtherProfileScreen} options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: { display: 'none' } }} />
        <Tab.Screen name="SearchUsers" component={SearchUsersScreen} options={{ tabBarButton: () => null, headerShown: false }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  customTabBar: { position: 'absolute', bottom: 20, alignSelf: 'center', width: 220, height: 60, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10, borderBottomWidth: 1 },
  logo: { fontSize: 20, fontWeight: 'bold' },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  themeMenu: { position: 'absolute', top: 100, alignSelf: 'center', width: 200, padding: 12, borderRadius: 12, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, zIndex: 1000 },
  themeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  themeText: { fontSize: 16 },
  profileContainer: { flex: 1 },
  banner: { width: '100%', height: 150 },
  avatarContainer: { position: 'absolute', top: 170, left: 20, width: '100%', alignItems: 'flex-start', marginTop: -50 },
  profileAvatar: { width: 90, height: 90, borderRadius: 50 },
  input: { width: '90%', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginTop: 20, alignSelf: 'center' },
  saveButton: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10, marginTop: 20, alignSelf: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 20, marginHorizontal: 16 },
  postsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  postsTitle: { fontSize: 20, fontWeight: 'bold' },
  emptyPostsContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyPostsText: { fontSize: 16 },
  postCard: { margin: 10, padding: 15, borderRadius: 12 },
  postImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10 },
  postText: { fontSize: 14, marginBottom: 8 },
  postDate: { fontSize: 10 },
  libraryBadge: { marginTop: 8, alignItems: 'flex-start' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalMenu: { width: 250, borderRadius: 12, padding: 10 },
  modalItem: { padding: 15, alignItems: 'center' },
  modalText: { fontSize: 16 },
  modalFull: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  imagePickerButton: { backgroundColor: '#007aff', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#fff', fontSize: 16 },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15 },
  postInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 100, marginBottom: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#007aff', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#007aff' },
  checkboxLabel: { fontSize: 16 },
  createButton: { backgroundColor: '#007aff', padding: 15, borderRadius: 10, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoMenuContainer: { position: 'absolute', top: '40%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 16, padding: 16, width: 250 },
  logoMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  logoMenuText: { color: '#fff', fontSize: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, fontSize: 16 },
  chatItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, alignItems: 'center' },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: 'bold' },
  chatNick: { fontSize: 14 },
  chatLastMessage: { fontSize: 14 },
  chatTime: { fontSize: 12 },
  chatHeaderTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  chatHeaderNick: { fontSize: 14, marginLeft: 8 },
  messageRow: { marginVertical: 5 },
  myMessageRow: { alignItems: 'flex-end' },
  theirMessageRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 10, borderRadius: 15 },
  messageText: { fontSize: 16 },
  messageTime: { fontSize: 10, textAlign: 'right', marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  sendButton: { padding: 8 },
  otherName: { fontSize: 24, fontWeight: 'bold', marginTop: 60 },
  otherNick: { fontSize: 16, marginTop: 4 },
  otherBio: { fontSize: 14, marginTop: 8 },
  chatItemWrapper: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, alignItems: 'center' },
  chatRoomHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10, borderBottomWidth: 1 },
  chatRoomUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
  chatRoomAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  chatRoomNameContainer: { flex: 1 },
  chatRoomName: { fontSize: 16, fontWeight: 'bold' },
  chatRoomNick: { fontSize: 14 },
  logoImage: { width: 80, height: 50, resizeMode: 'contain', marginLeft: 8 },
});