import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, MessageSquare, X } from 'lucide-react';
import { messagesAPI } from '@/services/api';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';
import LoadError from '@/components/ui/LoadError';

export interface ComposeTarget {
  recipientId?: string;
  recipientName: string;
  referralId?: string;
  subject: string;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(
    (location.state as { composeTo?: ComposeTarget } | null)?.composeTo || null
  );
  const [composeText, setComposeText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadMessages();
    // Clear the navigation state so a refresh/back doesn't reopen compose
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async () => {
    setLoadFailed(false);
    try {
      setMessages(await messagesAPI.getInbox());
    } catch {
      setLoadFailed(true);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await loadMessages();
    setRetrying(false);
  };

  const handleSelectMessage = async (message: Message) => {
    setComposeTarget(null);
    setSelectedMessage(message);
    if (!message.isRead) {
      try {
        await messagesAPI.markAsRead(message.id);
        await loadMessages();
      } catch {
        showError('Couldn’t update this message', 'It may still show as unread. Please try again.');
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !user) return;
    setSending(true);
    try {
      await messagesAPI.send({
        referralId: selectedMessage.referralId,
        senderId: user.id,
        senderName: `Dr. ${user.firstName} ${user.lastName}`,
        senderRole: user.role === 'primary_doctor' ? 'Primary Doctor' : user.role === 'coordinator' ? 'Care Coordinator' : 'Specialist',
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

  const handleSendCompose = async () => {
    if (!composeTarget || !composeText.trim() || !user) return;
    setSending(true);
    try {
      await messagesAPI.send({
        referralId: composeTarget.referralId,
        recipientId: composeTarget.recipientId,
        recipientName: composeTarget.recipientName,
        subject: composeTarget.subject,
        content: composeText, attachments: [],
      });
      const msg = formatSuccess('reply-sent');
      success(msg.title, msg.description);
      setComposeText('');
      setComposeTarget(null);
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
            {loadFailed ? (
              <LoadError title="Couldn’t load messages" onRetry={handleRetry} retrying={retrying} />
            ) : messages.length === 0 && (
              <div className="neu-pressed rounded-2xl text-center py-12">
                <MessageSquare className="w-14 h-14 text-base-300 mx-auto mb-3" />
                <p className="text-base-500 text-sm">No messages</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail / Reply / Compose */}
        <div className="neu-card p-6">
          {composeTarget ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-base-900">New Message</h2>
                  <p className="text-xs text-base-500 mt-1">
                    To: {composeTarget.recipientName} — {composeTarget.subject}
                  </p>
                </div>
                <button onClick={() => setComposeTarget(null)} aria-label="Cancel"
                  className="neu-btn w-8 h-8 flex items-center justify-center rounded-full p-0 shrink-0">
                  <X className="w-3.5 h-3.5 text-base-500" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">Message</label>
                <textarea value={composeText} onChange={(e) => setComposeText(e.target.value)}
                  className="neu-input w-full resize-none" rows={7} placeholder="Type your message..." />
                <button onClick={handleSendCompose} disabled={!composeText.trim() || sending}
                  className="neu-btn-primary mt-3 w-full flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          ) : selectedMessage ? (
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
