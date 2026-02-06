import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import api from '../../../utils/api';
import { FiMessageSquare, FiSend, FiUser, FiShoppingBag } from 'react-icons/fi';

const Chat = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const messagesEndRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const sendingRef = useRef(false); // Prevent double submission

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages, selectedConversation]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      // Scroll to bottom when conversation changes
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    }
  }, [selectedConversation]);

  // Socket.io real-time message handling
  useEffect(() => {
    if (!socket || !selectedConversation) return;

    const handleGetMessage = (data) => {
      // Normalize IDs for comparison
      const currentConvId = String(selectedConversation._id || selectedConversation.id);
      const messageConvId = String(data.conversationId || '');
      
      // Only add message if it belongs to the current conversation
      if (messageConvId === currentConvId) {
        setMessages(prev => {
          const messageId = String(data._id || '');
          
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => {
            const msgId = String(msg._id || '');
            // Check by exact ID match
            if (msgId === messageId && messageId && !msgId.startsWith('temp-')) return true;
            // Check if it's a temp message with same content and recent timestamp
            if (msgId.startsWith('temp-') && msg.content === data.content) {
              const timeDiff = Math.abs(
                new Date(msg.timestamp).getTime() - new Date(data.timestamp || new Date()).getTime()
              );
              if (timeDiff < 5000) return true; // Within 5 seconds
            }
            // Check by content and sender if message ID is missing
            if (!messageId && msg.content === data.content && 
                String(msg.senderId?._id || msg.senderId || '') === String(data.senderId || '')) {
              const timeDiff = Math.abs(
                new Date(msg.timestamp).getTime() - new Date(data.timestamp || new Date()).getTime()
              );
              if (timeDiff < 2000) return true; // Within 2 seconds
            }
            return false;
          });
          
          if (exists) {
            console.log('Duplicate message detected, skipping:', messageId);
            return prev;
          }
          
          // Add new message with normalized senderId structure
          const socketMessage = {
            _id: messageId || `socket-${Date.now()}`,
            conversationId: messageConvId,
            senderId: {
              _id: String(data.senderId || data.sender?._id || ''),
              username: data.sender?.username || 'Unknown',
              email: data.sender?.email || ''
            },
            content: data.content,
            timestamp: data.timestamp || new Date()
          };
          
          // Ensure senderId._id is properly set
          if (!socketMessage.senderId._id && data.senderId) {
            socketMessage.senderId._id = String(data.senderId);
          }
          
          return [...prev, socketMessage];
        });
        
        // Refresh conversations to update last message timestamp
        fetchConversations();
      }
    };

    const handleUserTyping = (data) => {
      if (data.conversationId === selectedConversation._id && data.userId !== user._id) {
        setTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.conversationId === selectedConversation._id) {
        setTyping(false);
      }
    };

    socket.on('getMessage', handleGetMessage);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);

    return () => {
      socket.off('getMessage', handleGetMessage);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
    };
  }, [socket, selectedConversation, user]);

  const fetchConversations = async () => {
    try {
      const response = await api.get(`/chat/${user._id}`);
      // Filter conversations where seller is a participant
      const sellerConversations = response.data.data.filter(conv => 
        conv.participants?.some(p => p._id === user._id)
      );
      setConversations(sellerConversations);
      
      // Auto-select first conversation if none selected
      if (sellerConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(sellerConversations[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversation/${conversationId}/messages`);
      // Normalize message data to ensure consistent format
      const normalizedMessages = response.data.data.map(msg => {
        // Handle senderId - it could be an object (populated) or ObjectId
        let senderIdData = null;
        if (msg.senderId) {
          if (typeof msg.senderId === 'object') {
            // Populated senderId object
            senderIdData = {
              _id: String(msg.senderId._id || msg.senderId.id || ''),
              username: msg.senderId.username || 'Unknown',
              email: msg.senderId.email || ''
            };
          } else {
            // Just an ObjectId string
            senderIdData = {
              _id: String(msg.senderId),
              username: 'Unknown',
              email: ''
            };
          }
        }
        
        return {
          ...msg,
          _id: String(msg._id || ''),
          conversationId: String(msg.conversationId || ''),
          senderId: senderIdData,
          timestamp: msg.timestamp || msg.createdAt || new Date()
        };
      });
      setMessages(normalizedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Guard against double submission
    if (sendingRef.current || sending || !newMessage.trim() || !selectedConversation) {
      return;
    }

    const messageContent = newMessage.trim();
    sendingRef.current = true;
    setSending(true);
    setNewMessage('');

    // Optimistically add message to UI
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      conversationId: selectedConversation._id,
      senderId: {
        _id: String(user._id || user.id || ''),
        username: user.username || 'Unknown',
        email: user.email || ''
      },
      content: messageContent,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Get receiver ID (the buyer)
      const receiver = getOtherParticipant(selectedConversation);
      
      // Save message to database via API
      const response = await api.post('/messages', {
        conversationId: selectedConversation._id,
        content: messageContent
      });

      // Replace temp message with real message from server
      const realMessage = response.data.data;
      const realMessageId = String(realMessage._id || '');
      
      // Normalize the real message senderId
      let normalizedSenderId = null;
      if (realMessage.senderId) {
        if (typeof realMessage.senderId === 'object') {
          normalizedSenderId = {
            _id: String(realMessage.senderId._id || realMessage.senderId.id || ''),
            username: realMessage.senderId.username || 'Unknown',
            email: realMessage.senderId.email || ''
          };
        } else {
          normalizedSenderId = {
            _id: String(realMessage.senderId),
            username: 'Unknown',
            email: ''
          };
        }
      }
      
      setMessages(prev => {
        // Check if message already exists (from Socket.io or previous update)
        const exists = prev.some(msg => String(msg._id || '') === realMessageId);
        
        if (exists) {
          // Update existing message with full populated data
          return prev.map(msg => {
            const msgId = String(msg._id || '');
            if (msgId === realMessageId) {
              return {
                ...realMessage,
                _id: realMessageId,
                senderId: normalizedSenderId || msg.senderId,
                timestamp: realMessage.timestamp || realMessage.createdAt || new Date()
              };
            }
            return msg;
          });
        }
        
        // Replace temp message with real message
        return prev.map(msg => {
          if (String(msg._id || '') === String(tempMessage._id)) {
            return {
              ...realMessage,
              _id: realMessageId,
              senderId: normalizedSenderId || msg.senderId,
              timestamp: realMessage.timestamp || realMessage.createdAt || new Date()
            };
          }
          return msg;
        });
      });

      // Stop typing indicator (backend handles Socket.io emission, no need to emit here)
      if (socket && receiver) {
        socket.emit('stopTyping', {
          conversationId: selectedConversation._id,
          receiverId: receiver._id
        });
      }

      await fetchConversations(); // Refresh conversations to update last message timestamp
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      setNewMessage(messageContent); // Restore message text
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      sendingRef.current = false; // Reset guard
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation.participants) return null;
    return conversation.participants.find(p => p._id !== user._id);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !selectedConversation) return;
    
    const receiver = getOtherParticipant(selectedConversation);
    if (receiver) {
      socket.emit('typing', {
        conversationId: selectedConversation._id,
        receiverId: receiver._id
      });
    }
  };

  // Stop typing after user stops typing for 1 second
  useEffect(() => {
    if (!newMessage.trim()) return;

    const typingTimeout = setTimeout(() => {
      if (socket && selectedConversation) {
        const receiver = getOtherParticipant(selectedConversation);
        if (receiver) {
          socket.emit('stopTyping', {
            conversationId: selectedConversation._id,
            receiverId: receiver._id
          });
        }
      }
    }, 1000);

    return () => clearTimeout(typingTimeout);
  }, [newMessage, socket, selectedConversation]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <FiMessageSquare className="h-6 w-6" />
          <span>Messages from Buyers</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
        {/* Conversations List */}
        <div className="lg:col-span-1 border-r border-gray-200 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Conversations</h3>
            <p className="text-xs text-gray-500 mt-1">
              {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiMessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No messages yet</p>
                <p className="text-xs mt-2">Buyers will appear here when they message you</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {conversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  const isSelected = selectedConversation?._id === conversation._id;
                  
                  return (
                    <button
                      key={conversation._id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        isSelected ? 'bg-primary-50 border-l-4' : ''
                      }`}
                      style={isSelected ? { borderLeftColor: '#fab242' } : {}}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <FiUser className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isSelected ? 'text-primary-900' : 'text-gray-900'
                          }`}>
                            {otherParticipant?.username || 'Unknown Buyer'}
                          </p>
                          {conversation.productId && (
                            <p className="text-xs text-gray-500 truncate flex items-center space-x-1">
                              <FiShoppingBag className="h-3 w-3" />
                              <span>{conversation.productId.name}</span>
                            </p>
                          )}
                          {conversation.lastMessage && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
                {(() => {
                  const otherParticipant = getOtherParticipant(selectedConversation);
                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {otherParticipant?.username || 'Unknown Buyer'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {otherParticipant?.email || ''}
                          </p>
                        </div>
                      </div>
                      {selectedConversation.productId && (
                        <a
                          href={`/products/${selectedConversation.productId._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline flex items-center space-x-1"
                        >
                          <FiShoppingBag className="h-4 w-4" />
                          <span>View Product</span>
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Messages - Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0" style={{ maxHeight: 'none' }}>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FiMessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      // Extract senderId - handle normalized structure
                      let senderIdStr = null;
                      if (message.senderId) {
                        // After normalization, senderId is always an object with _id
                        if (message.senderId._id) {
                          senderIdStr = String(message.senderId._id);
                        } else if (typeof message.senderId === 'string') {
                          senderIdStr = String(message.senderId);
                        } else if (message.senderId.id) {
                          senderIdStr = String(message.senderId.id);
                        }
                      }
                      
                      // Extract user ID - handle different formats
                      const userIdStr = String(user?._id || user?.id || '');
                      
                      // Compare both as strings
                      const isOwnMessage = senderIdStr && userIdStr && senderIdStr === userIdStr;
                      
                      return (
                        <div
                          key={message._id || `msg-${Date.now()}-${Math.random()}`}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} w-full`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                              isOwnMessage
                                ? 'bg-gray-100 text-gray-900 border border-gray-300'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            {!isOwnMessage && (
                              <p className="text-xs font-semibold text-gray-700 mb-1">
                                {message.senderId?.username || 'Buyer'}
                              </p>
                            )}
                            <p className="text-sm break-words whitespace-pre-wrap text-gray-900">{message.content}</p>
                            <p
                              className={`text-xs mt-1 text-gray-600`}
                            >
                              {new Date(message.timestamp || message.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {typing && (
                      <div className="flex justify-start">
                        <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                          <p className="text-sm italic">Buyer is typing...</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>
                )}
              </div>

              {/* Message Input - Fixed at bottom */}
              <form onSubmit={handleSendMessage} className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!sendingRef.current && !sending) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={sending || sendingRef.current}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                    style={{ backgroundColor: '#fab242' }}
                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
                  >
                    <FiSend />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
              <div className="text-center">
                <FiMessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
