import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyD1wMdAYWl06m8zPa_laJ1d7m-c3B1NqLs",
  authDomain: "chat-application-d410c.firebaseapp.com",
  projectId: "chat-application-d410c",
  storageBucket: "chat-application-d410c.firebasestorage.app",
  messagingSenderId: "985135986639",
  appId: "1:985135986639:web:200f7193ae017a3e4f44ba",
  measurementId: "G-J2E037TEG1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
