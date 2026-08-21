import React, { useEffect, useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { messagesAPI } from '@/services/api';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => { setMessages(await messagesAPI.getInbox()); };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) { await messagesAPI.markAsRead(message.id); await loadMessages(); }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !user) return;
    setSending(true);
    try {
      await messagesAPI.send({
        referralId: selectedMessage.referralId,
        senderId: user.id,
        senderName: `Dr. ${user.firstName} ${user.lastName}`,
        senderRole: user.role === 'primary_doctor' ? 'Primary Doctor' : 'Specialist',
        recipientId: selectedMessage.senderId,
        recipientName: selectedMessage.senderName,
        subject: `Re: ${selectedMessage.subject}`,
        content: replyText, attachments: [],
      });
      const msg = formatSuccess('reply-sent');
      success(msg.title, msg.description);
      setReplyText('');
      await loadMessages();
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setSending(false); }
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Messages</h1>
        <p className="text-base-500 mt-1 text-sm">
          Communication with referring doctors and specialists
          {unreadCount > 0 && (
            <span className="ml-2 neu-badge bg-danger-500 text-white">{unreadCount} unread</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inbox */}
        <div className="neu-card p-5">
          <h2 className="font-display text-lg font-bold text-base-900 mb-4">Inbox</h2>
          <div className="space-y-2">
            {messages.map((message) => (
              <button key={message.id} onClick={() => handleSelectMessage(message)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selectedMessage?.id === message.id
                    ? 'bg-primary-50   border border-primary-200'
                    : message.isRead
                    ? 'neu-pressed'
                    : 'neu-flat border border-primary-200'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-base-800">{message.senderName}</h3>
                    {!message.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                  </div>
                  <span className="text-[10px] text-base-400 uppercase tracking-wider">{message.senderRole}</span>
                </div>
                <p className="font-semibold text-xs text-base-700 mb-1">{message.subject}</p>
                <p className="text-xs text-base-500 line-clamp-2">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-base-400">{new Date(message.sentAt).toLocaleString()}</span>
                  <span className="text-[10px] text-base-400">Ref: {message.referralId}</span>
                </div>
              </button>
            ))}
            {messages.length === 0 && (
              <div className="neu-pressed rounded-2xl text-center py-12">
                <MessageSquare className="w-14 h-14 text-base-300 mx-auto mb-3" />
                <p className="text-base-500 text-sm">No messages</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail / Reply */}
        <div className="neu-card p-6">
          {selectedMessage ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-base-900">{selectedMessage.subject}</h2>
                <p className="text-xs text-base-500 mt-1">
                  From: {selectedMessage.senderName} ({selectedMessage.senderRole})
                </p>
              </div>

              <div className="neu-pressed rounded-xl p-4">
                <p className="text-[10px] text-base-400 mb-1">Sent: {new Date(selectedMessage.sentAt).toLocaleString()}</p>
                <p className="text-sm text-base-800 whitespace-pre-wrap leading-relaxed">{selectedMessage.content}</p>
              </div>

              {selectedMessage.repliedAt && (
                <div className="neu-flat rounded-xl p-3 border border-success-200">
                  <p className="text-xs text-success-700 font-medium">
                    Replied {new Date(selectedMessage.repliedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">Reply</label>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  className="neu-input w-full resize-none" rows={5} placeholder="Type your reply..." />
                <button onClick={handleSendReply} disabled={!replyText.trim() || sending}
                  className="neu-btn-primary mt-3 w-full flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>

              <div className="neu-pressed rounded-xl p-3">
                <p className="text-[10px] text-base-400 uppercase tracking-wider font-semibold">Referral</p>
                <p className="text-xs text-base-600 mt-0.5">{selectedMessage.referralId}</p>
              </div>
            </div>
          ) : (
            <div className="neu-pressed rounded-2xl text-center py-16">
              <MessageSquare className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">Select a message to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
