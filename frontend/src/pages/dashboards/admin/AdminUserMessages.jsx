import { useState, useEffect } from 'react';
import { MessageCircle, Eye, CheckCircle, Mail, X } from 'lucide-react';
import api from '../../../utils/api';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AdminUserMessages = () => {
  const [contactMessages, setContactMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'contact' | 'direct'
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/messages');
      if (response.data.success) {
        setContactMessages(response.data.data.contactMessages || []);
        setDirectMessages(response.data.data.directMessages || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleMarkResolved = async (id) => {
    try {
      setResolvingId(id);
      await api.patch(`/admin/messages/${id}`, { contactStatus: 'resolved' });
      await fetchMessages();
      if (selected?._id === id) setSelected((s) => (s ? { ...s, contactStatus: 'resolved' } : null));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as resolved.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleSendReply = async () => {
    if (selected?.source !== 'contact_form' || !replyText.trim()) return;
    try {
      setSendingReply(true);
      await api.post(`/admin/messages/${selected._id}/reply`, { replyText: replyText.trim() });
      setReplyText('');
      setSelected(null);
      alert('Reply sent successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const list =
    filter === 'contact'
      ? contactMessages
      : filter === 'direct'
        ? directMessages
        : [...contactMessages, ...directMessages].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-6 w-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">Messages from Users</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All messages</option>
            <option value="contact">Contact form only</option>
            <option value="direct">Direct chat only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto" />
            <p className="mt-3 text-gray-500">Loading messages...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No messages found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {list.map((m) => (
                  <tr key={m._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.senderName || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.senderEmail || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                      {m.subject || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(m.date)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          m.source === 'contact_form'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {m.source === 'contact_form' ? 'Contact form' : 'Direct'}
                      </span>
                      {m.source === 'contact_form' && m.contactStatus && (
                        <span
                          className={`ml-1 px-2 py-1 text-xs font-medium rounded ${
                            m.contactStatus === 'resolved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {m.contactStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelected(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View / Reply modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selected.source === 'contact_form' ? 'Contact form message' : 'Direct message'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  From {selected.senderName} {selected.senderEmail && `<${selected.senderEmail}>`} •{' '}
                  {formatDate(selected.date)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setReplyText('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selected.subject && (
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Subject: <span className="font-normal">{selected.subject}</span>
                </p>
              )}
              <div className="text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 p-4">
                {selected.content}
              </div>

              {selected.source === 'contact_form' && (
                <>
                  {selected.contactStatus === 'pending' && (
                    <div className="mt-4">
                      <button
                        onClick={() => handleMarkResolved(selected._id)}
                        disabled={resolvingId === selected._id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {resolvingId === selected._id ? 'Updating...' : 'Mark as resolved'}
                      </button>
                    </div>
                  )}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reply to user (email)</label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sendingReply}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        <Mail className="h-4 w-4" />
                        {sendingReply ? 'Sending...' : 'Send reply'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserMessages;
