import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

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
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return;

      // Connect to Socket.io server
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const newSocket = io(backendUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket.io connected:', newSocket.id);
        // Add user to active users
        newSocket.emit('addUser', user._id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket.io disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
      });

      // Listen for user online/offline events
      newSocket.on('userOnline', (data) => {
        setOnlineUsers(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      });

      newSocket.on('userOffline', (data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setOnlineUsers([]);
      }
    }
  }, [user]);

  const value = {
    socket,
    onlineUsers
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
