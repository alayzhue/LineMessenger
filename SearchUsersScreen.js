// SearchUsersScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { searchUsersByUsername, createOrGetChat } from './FirebaseService';
import { auth } from './firebase';
import { useTheme } from './ThemeContext';
import { colors } from './App'; // или импортируй цвета из твоего файла

export default function SearchUsersScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const result = await searchUsersByUsername(query);
    setLoading(false);
    
    if (result.success) {
      // Исключаем текущего пользователя
      const filtered = result.users.filter(u => u.uid !== auth.currentUser?.uid);
      setUsers(filtered);
    } else {
      Alert.alert('Ошибка', result.error);
    }
  };

  const startChat = async (user) => {
    const currentUserId = auth.currentUser?.uid;
    const result = await createOrGetChat(currentUserId, user.uid);
    
    if (result.success) {
      navigation.navigate('Чаты'); // Возвращаемся к списку чатов
    } else {
      Alert.alert('Ошибка', result.error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={[styles.searchHeader, { backgroundColor: currentColors.header }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: currentColors.accent, fontSize: 18 }}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentColors.text }]}>Поиск</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.searchBox}>
        <TextInput
          style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, backgroundColor: currentColors.inputBg }]}
          placeholder="Введите @username"
          placeholderTextColor={currentColors.placeholder}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.searchButton, { backgroundColor: currentColors.accent }]} onPress={search}>
          <Text style={styles.searchButtonText}>Найти</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.userCard, { backgroundColor: currentColors.bubble }]} onPress={() => startChat(item)}>
            <View style={[styles.userAvatar, { backgroundColor: currentColors.avatarDarkBg }]}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: currentColors.text }]}>{item.name}</Text>
              <Text style={[styles.userNick, { color: currentColors.chatNick }]}>{item.nick}</Text>
            </View>
            <Text style={{ color: currentColors.accent }}>Написать →</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: currentColors.placeholder }]}>
            {query ? 'Никого не найдено' : 'Введите @username для поиска'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', padding: 16, gap: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16 },
  searchButton: { paddingHorizontal: 20, borderRadius: 25, justifyContent: 'center' },
  searchButtonText: { color: '#fff', fontWeight: 'bold' },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, marginHorizontal: 16, marginVertical: 5, borderRadius: 12 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userNick: { fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
});