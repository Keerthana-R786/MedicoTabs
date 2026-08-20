import React, { useEffect, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { mockMessagesAPI } from '@/services/mockAPI';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const data = await mockMessagesAPI.getInbox();
    setMessages(data);
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await mockMessagesAPI.markAsRead(message.id);
      await loadMessages();
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !user) return;
    setSending(true);

    try {
      await mockMessagesAPI.send({
        referralId: selectedMessage.referralId,
        senderId: user.id,
        senderName: `Dr. ${user.firstName} ${user.lastName}`,
        senderRole: user.role === 'primary_doctor' ? 'Primary Doctor' : 'Specialist',
        recipientId: selectedMessage.senderId,
        recipientName: selectedMessage.senderName,
        subject: `Re: ${selectedMessage.subject}`,
        content: replyText,
        attachments: [],
      });

      alert('Reply sent successfully!');
      setReplyText('');
      await loadMessages();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">
          Two-way communication with referring doctors and specialists
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-danger-500 text-white text-xs font-semibold rounded-full">
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Inbox</h2>
          
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                onClick={() => handleSelectMessage(message)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedMessage?.id === message.id
                    ? 'bg-primary-100 border-2 border-primary-500'
                    : message.isRead
                    ? 'bg-gray-50 border border-gray-200 hover:border-primary-300'
                    : 'bg-primary-50 border-2 border-primary-300 hover:border-primary-400'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{message.senderName}</h3>
                    {!message.isRead && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{message.senderRole}</span>
                </div>
                <p className="font-medium text-sm text-gray-900 mb-1">{message.subject}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(message.sentAt).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Referral: {message.referralId}
                  </span>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No messages</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {selectedMessage ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      From: {selectedMessage.senderName} ({selectedMessage.senderRole})
                    </p>
                  </div>
                  {selectedMessage.isRead ? (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Read</span>
                  ) : (
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded">New</span>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Sent: {new Date(selectedMessage.sentAt).toLocaleString()}
                  </p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>

                {selectedMessage.repliedAt && (
                  <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                    <p className="text-sm text-success-700">
                      ✓ Replied on {new Date(selectedMessage.repliedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={6}
                  placeholder="Type your reply..."
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 font-medium mb-2">Referral Information</p>
                <p className="text-xs text-gray-500">Referral ID: {selectedMessage.referralId}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Select a message to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
