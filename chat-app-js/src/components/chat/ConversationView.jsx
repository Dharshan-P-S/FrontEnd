import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import { useSocket } from '../../context/SocketProvider';
import AttachmentModal from './AttachmentModal';

export default function ConversationView({ conversation, onViewProfile, onViewGroupInfo, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const socket = useSocket();
  const currentUser = JSON.parse(localStorage.getItem('userProfile'));
  
  const CLOUDINARY_CLOUD_NAME = "duzgpmzhp";
  const CLOUDINARY_UPLOAD_PRESET = "ml_default";
  const defaultAvatar = (seed) => `https://api.dicebear.com/8.x/initials/svg?seed=${seed || '?'}&backgroundColor=b6e3f4`;

  useEffect(() => {
    if (!socket || !conversation) {
      setMessages([]);
      return;
    };
    const requestHistory = () => socket.emit('get_history', { conversationId: conversation._id });
    const markMessagesAsRead = () => socket.emit('messages_read', { conversationId: conversation._id, readerId: currentUser.userId });
    requestHistory();
    markMessagesAsRead();

    const handleChatHistory = (history) => setMessages(history);
    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId === conversation._id) {
        if (newMessage.tempId && newMessage.senderId === currentUser.userId) {
          setMessages(prev => prev.map(m => m._id === newMessage.tempId ? newMessage : m));
        } 
        else if (newMessage.senderId !== currentUser.userId) {
          setMessages((prev) => [...prev, newMessage]);
          markMessagesAsRead();
        }
      }
    };
    const handleTypingIndicator = ({ conversationId, isTyping }) => { if (conversationId === conversation._id) { setIsTyping(isTyping); } };
    const handleStatusUpdate = ({ conversationId }) => { if (conversationId === conversation._id) { requestHistory(); } };
    const handleFocus = () => markMessagesAsRead();
    window.addEventListener('focus', handleFocus);

    socket.on('chat_history', handleChatHistory);
    socket.on('new_message', handleNewMessage);
    socket.on('typing_indicator', handleTypingIndicator);
    socket.on('messages_status_updated', handleStatusUpdate);

    return () => {
      socket.off('chat_history', handleChatHistory);
      socket.off('new_message', handleNewMessage);
      socket.off('typing_indicator', handleTypingIndicator);
      socket.off('messages_status_updated', handleStatusUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [conversation, socket, currentUser.userId]);

  const handleSendMessage = (text) => {
    if (!socket || !conversation) return;
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId, text, senderId: currentUser?.userId,
      conversationId: conversation._id, timestamp: new Date(), status: 'sending',
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    onMessageSent(optimisticMessage);
    socket.emit('send_message', { text, conversationId: conversation._id, tempId });
  };

  const handleSendAttachment = async ({ file, caption }) => {
    if (!file || !socket || !conversation) return;

    setIsUploading(true);
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId, text: caption, senderId: currentUser?.userId,
      conversationId: conversation._id, timestamp: new Date(), status: 'uploading',
      fileName: file.name, fileType: file.type.startsWith('image/') ? 'image' : 'raw'
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    onMessageSent(optimisticMessage);
    setIsAttachmentModalOpen(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
      const resourceType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'raw');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST', body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        socket.emit('send_message', {
            text: caption, conversationId: conversation._id, tempId: tempId,
            fileUrl: data.secure_url, fileName: file.name, fileType: data.resource_type,
        });
      } else { throw new Error('File upload to Cloudinary failed.'); }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
    } finally {
      setIsUploading(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="text-center"><h2 className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">Select a conversation</h2></div>
      </div>
    );
  }

  const isGroup = conversation.isGroup;
  const otherUser = !isGroup ? conversation.otherUser : null;
  const displayName = isGroup ? conversation.groupName : otherUser?.username;
  const displayAvatar = isGroup ? (conversation.groupAvatarUrl || defaultAvatar(conversation.groupName)) : (otherUser?.avatarUrl || defaultAvatar(otherUser?.username));

  return (
    <>
      <div className="flex h-full flex-col bg-light-bg dark:bg-dark-bg">
        <header className="flex shrink-0 items-center gap-4 border-b border-light-border dark:border-dark-border bg-light-container dark:bg-dark-container p-4">
          <button onClick={() => { if (isGroup) { onViewGroupInfo(); } else { onViewProfile(otherUser); } }} className="flex items-center gap-4 text-left">
            <img src={displayAvatar} alt={displayName} className="h-10 w-10 rounded-full object-cover"/>
            <div>
              <h2 className="font-semibold">{displayName || 'Chat'}</h2>
              {isTyping ? (
                <p className="text-xs text-light-accent dark:text-dark-accent italic">...typing</p>
              ) : (
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{isGroup ? `${conversation.participants.length} members` : 'Online'}</p>
              )}
            </div>
          </button>
        </header>
        
        <MessageList messages={messages} participantsInfo={conversation.participantsInfo} />
        <MessageComposer onSendMessage={handleSendMessage} conversation={conversation} onAttachmentClick={() => setIsAttachmentModalOpen(true)} />
      </div>
      {isAttachmentModalOpen && (
        <AttachmentModal 
            onClose={() => setIsAttachmentModalOpen(false)}
            onSend={handleSendAttachment}
            isLoading={isUploading}
        />
      )}
    </>
  );
}