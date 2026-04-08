// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCLc95ozhITCy4w4tSxc2I1GSgd3yyyaZA",
  authDomain: "linemessenger-8eb21.firebaseapp.com",
  projectId: "linemessenger-8eb21",
  storageBucket: "linemessenger-8eb21.firebasestorage.app",
  messagingSenderId: "1000891420984",
  appId: "1:1000891420984:web:e8c596d14a4ca3257db1cd",
  databaseURL: "https://linemessenger-8eb21-default-rtdb.europe-west1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getDatabase(app);