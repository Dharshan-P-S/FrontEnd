import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from '../firebase'; // Import auth from your firebase config

export default function LoginPage() {
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // This will open a Google login popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("User signed in with Google:", user);
      
      // Get the user's token and store it
      const token = await user.getIdToken();
      localStorage.setItem('authToken', token);
      window.location.href = '/app'; // Redirect to the chat app
    } catch (err) {
      console.error(err);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">
          Welcome to Chat App
        </h2>
        <p className="mb-8 text-gray-600">
          Sign in to continue
        </p>
        
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <img className="h-5 w-5" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" />
          Sign in with Google
        </button>
        
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}