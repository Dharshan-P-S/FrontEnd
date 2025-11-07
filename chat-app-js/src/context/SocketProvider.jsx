import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const SERVER_URL = 'http://localhost:8080';

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const profileString = localStorage.getItem('userProfile');

    if (token && profileString) {
      const profile = JSON.parse(profileString);
      
      const newSocket = io(SERVER_URL, {
        auth: { 
          token, 
          userId: profile.userId,
          username: profile.username
        },
      });

      setSocket(newSocket);

      return () => newSocket.disconnect();
    }
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};