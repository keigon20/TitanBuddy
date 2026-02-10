// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMUq0x_A5hxvuRAhXpub9pqVGMOcpBoKg",
  authDomain: "titanbuddy-8a654.firebaseapp.com",
  projectId: "titanbuddy-8a654",
  storageBucket: "titanbuddy-8a654.firebasestorage.app",
  messagingSenderId: "156668930699",
  appId: "1:156668930699:web:bd799e14ba63dbc0a2828e",
  measurementId: "G-GFR0KVLLYV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);