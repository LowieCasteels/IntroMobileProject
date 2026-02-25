// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCrbZpephN4d7nJd3ADX_CexeHoKRUGmmc",
    authDomain: "intromobile-reactnative.firebaseapp.com",
    projectId: "intromobile-reactnative",
    storageBucket: "intromobile-reactnative.firebasestorage.app",
    messagingSenderId: "667839011317",
    appId: "1:667839011317:web:2223f349bcfe8d176868bc",
    measurementId: "G-J28FTD5Z6R",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
