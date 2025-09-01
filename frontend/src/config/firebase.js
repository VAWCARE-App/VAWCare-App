// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmV7uLFHpbpTm8t1CKaCZs4BU2f3lrWt4",
  authDomain: "vawcare-app.firebaseapp.com",
  projectId: "vawcare-app",
  storageBucket: "vawcare-app.firebasestorage.app",
  messagingSenderId: "625710835121",
  appId: "1:625710835121:web:53dba7aac7d112f0ae4990",
  measurementId: "G-WBCXDBX72W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth and Analytics instances
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { app, auth, analytics };
