import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './router';
import { SocketProvider } from './context/SocketProvider';

function App() {
  // Effect to set the initial color mode based on user's OS preference
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Optional: Listen for changes in OS preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <SocketProvider>
      <AppRoutes />
      <Toaster position="top-right" />
    </SocketProvider>
  );
}

export default App;