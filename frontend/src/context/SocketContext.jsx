import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getSocketUrl } from '../utils/env.js';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (!token) return;
      const socketUrl = getSocketUrl();
      if (!socketUrl) return;

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        path: '/socket.io'
      });
      newSocket.on('connect', () => {
        newSocket.emit('addUser', user._id);
      });
      newSocket.on('userOnline', (data) => {
        setOnlineUsers(prev => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
      });
      newSocket.on('userOffline', (data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });
      setSocket(newSocket);
      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setOnlineUsers([]);
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
