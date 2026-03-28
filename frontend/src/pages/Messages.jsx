import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FiMessageSquare, FiSend, FiArrowLeft, FiUser } from 'react-icons/fi';

const Messages = () => {
  const { user } = useAuth();
  const { conversationId: conversationIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const conversationId = useMemo(
    () => conversationIdParam || searchParams.get('conversationId') || '',
    [conversationIdParam, searchParams]
  );

  const messagesBase = useMemo(() => {
    return location.pathname.startsWith('/dashboard/buyer')
      ? '/dashboard/buyer/messages'
      : '/messages';
  }, [location.pathname]);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    const loadList = async () => {
      try {
        const response = await api.get('/conversations');
        const list = response.data.data || [];
        setConversations(list);

        const fromQuery = new URLSearchParams(location.search).get('conversationId');
        const pathMatch = location.pathname.match(/\/messages\/([^/]+)$/);
        const pathId = pathMatch ? pathMatch[1] : null;
        const activeId = pathId || fromQuery;

        if (list.length > 0 && !activeId) {
          navigate(`${messagesBase}/${list[0]._id}`, { replace: true });
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [user, navigate, location.pathname, location.search]);

  useEffect(() => {
    const qid = searchParams.get('conversationId');
    if (qid && !conversationIdParam) {
      navigate(`${messagesBase}/${qid}`, { replace: true });
    }
  }, [searchParams, conversationIdParam, messagesBase, navigate]);

  useEffect(() => {
    if (conversationId) {
      fetchConversation(conversationId);
      fetchMessages(conversationId);
    } else {
      setSelectedConversation(null);
      setMessages([]);
    }
  }, [conversationId]);

  const fetchConversation = async (id) => {
    try {
      const response = await api.get(`/conversations/${id}`);
      setSelectedConversation(response.data.data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const response = await api.get(`/messages/conversation/${id}`);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await api.post('/messages', {
        conversationId: selectedConversation._id,
        content: newMessage.trim()
      });
      setMessages((prev) => [...prev, response.data.data]);
      setNewMessage('');
      const convRes = await api.get('/conversations');
      setConversations(convRes.data.data || []);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants || !user) return null;
    return conversation.participants.find(
      (p) => (p._id || p).toString() !== (user._id || user.id).toString()
    );
  };

  const isConvSelected = (c) =>
    c._id === conversationId || c._id === conversationIdParam || c._id === searchParams.get('conversationId');

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/products"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="mr-2" />
            Back to Products
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FiMessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {conversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    return (
                      <Link
                        key={conversation._id}
                        to={`${messagesBase}/${conversation._id}`}
                        className={`block p-4 hover:bg-gray-50 transition ${
                          isConvSelected(conversation) ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <FiUser className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {otherParticipant?.username || 'Unknown User'}
                            </p>
                            {conversation.productId && (
                              <p className="text-xs text-gray-500 truncate">
                                {conversation.productId.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-md flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  {(() => {
                    const otherParticipant = getOtherParticipant(selectedConversation);
                    return (
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {otherParticipant?.username || 'Unknown User'}
                          </p>
                          {selectedConversation.productId && (
                            <Link
                              to={`/products/${selectedConversation.productId._id}`}
                              className="text-sm text-primary-600 hover:underline"
                            >
                              View Product: {selectedConversation.productId.name}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const senderId = message.senderId?._id || message.senderId;
                      const isOwnMessage = senderId?.toString() === (user._id || user.id)?.toString();
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOwnMessage ? 'text-white' : 'bg-gray-100 text-gray-900'
                            }`}
                            style={isOwnMessage ? { backgroundColor: '#fab242' } : undefined}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-white/90' : 'text-gray-500'
                              }`}
                            >
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                      style={{ backgroundColor: '#d4942e' }}
                      onMouseOver={(e) => {
                        if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#b87d20';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#d4942e';
                      }}
                    >
                      <FiSend />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FiMessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
