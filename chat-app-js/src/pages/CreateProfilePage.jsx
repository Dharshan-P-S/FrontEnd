import React, { useState } from 'react';
import { useSocket } from '../context/SocketProvider';

export default function CreateProfilePage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const socket = useSocket();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("1. Save Profile button clicked."); // <-- ADD THIS

    if (!socket) {
      console.log("2. Error: Socket is not connected."); // <-- ADD THIS
      setError('Connection not ready, please wait a moment and try again.');
      return;
    }
    
    setError('');
    console.log("3. Socket is connected. Emitting 'check_username'."); // <-- ADD THIS

    socket.emit('check_username', { username }, ({ isAvailable }) => {
      if (isAvailable) {
        socket.emit('create_user', { username }, ({ success, user }) => {
          if (success) {
            localStorage.setItem('userProfile', JSON.stringify(user));
            window.location.href = '/app';
          } else {
            setError('Could not create profile. Please try another username.');
          }
        });
      } else {
        setError('This username is already taken.');
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Create Your Profile
        </h2>
        <form onSubmit={handleSubmit}>
          {/* ... rest of the form is the same ... */}
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Save Profile
          </button>
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}