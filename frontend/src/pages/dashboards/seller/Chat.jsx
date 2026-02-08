import { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiUser } from 'react-icons/fi';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';

const Chat = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await api.get(`/chat/${user._id}`);
        setConversations(res.data.data || []);
        if (res.data.data?.length > 0 && !selectedConversation) {
          setSelectedConversation(res.data.data[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!selectedConversation) return;
    const load = async () => {
      try {
        const res = await api.get(`/chat/conversation/${selectedConversation._id}/messages`);
        setMessages(res.data.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [selectedConversation?._id]);

  useEffect(() => {
    if (!socket || !selectedConversation) return;
    const handleGetMessage = (data) => {
      if (data.conversationId !== selectedConversation._id) return;
      const sid = data.senderId?.toString?.() ?? data.senderId;
      const msg = {
        _id: data._id || `socket-${Date.now()}`,
        content: data.content,
        timestamp: data.timestamp || new Date(),
        senderId: data.sender || { _id: sid }
      };
      setMessages(prev => [...prev, msg]);
    };
    socket.on('getMessage', handleGetMessage);
    return () => socket.off('getMessage', handleGetMessage);
  }, [socket, selectedConversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const getOtherParticipant = (conv) => {
    if (!conv?.participants) return null;
    return conv.participants.find(p => (p._id || p) !== user?._id);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    const tempId = `temp-${Date.now()}`;
    const other = getOtherParticipant(selectedConversation);
    setMessages(prev => [...prev, {
      _id: tempId,
      content,
      timestamp: new Date(),
      senderId: { _id: user._id }
    }]);
    try {
      const res = await api.post('/messages', {
        conversationId: selectedConversation._id,
        content
      });
      setMessages(prev => prev.map(m => m._id === tempId ? { ...res.data.data, senderId: res.data.data.senderId || { _id: user._id } } : m));
      if (socket && other?._id) {
        socket.emit('stopTyping', { conversationId: selectedConversation._id, receiverId: other._id });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  if (!user) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold p-4 border-b">Messages</h2>
      <div className="flex flex-1 min-h-0">
        <div className="w-72 border-r flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y">
            {conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">No conversations yet</p>
            ) : (
              conversations.map(conv => {
                const other = getOtherParticipant(conv);
                const isActive = selectedConversation?._id === conv._id;
                return (
                  <button
                    key={conv._id}
                    type="button"
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-4 hover:bg-gray-50 ${isActive ? 'bg-amber-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <FiUser className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{other?.username || 'User'}</p>
                        {conv.productId && (
                          <p className="text-xs text-gray-500 truncate">{conv.productId.name}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation ? (
            <>
              <div className="p-3 border-b flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <FiUser className="h-4 w-4 text-amber-700" />
                </div>
                <span className="font-medium text-gray-900">
                  {getOtherParticipant(selectedConversation)?.username || 'User'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.map(msg => {
                  const sid = msg.senderId?._id ?? msg.senderId;
                  const isOwn = String(sid) === String(user._id);
                  return (
                    <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${isOwn ? 'text-white' : 'bg-gray-100 text-gray-900'}`} style={isOwn ? { backgroundColor: '#fab242' } : undefined}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-3 border-t flex-shrink-0 flex gap-2 z-10">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 text-white rounded-md disabled:opacity-50 flex items-center gap-1 transition-colors"
                  style={{ backgroundColor: '#d4942e' }}
                  onMouseOver={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#b87d20'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#d4942e'; }}
                >
                  <FiSend className="h-4 w-4" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FiMessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
