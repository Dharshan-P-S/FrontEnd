import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketProvider';
import EmojiPicker from 'emoji-picker-react';

export default function MessageComposer({ onSendMessage, conversation, onAttachmentClick }) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socket = useSocket();
  const [typingTimeout, setTypingTimeout] = useState(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerRef]);

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !conversation) return;
    if (typingTimeout) clearTimeout(typingTimeout);
    socket.emit('typing', { conversationId: conversation._id, isTyping: true });
    const timeout = setTimeout(() => {
      socket.emit('typing', { conversationId: conversation._id, isTyping: false });
    }, 1500);
    setTypingTimeout(timeout);
  };

  const handleEmojiClick = (emojiObject) => {
    setText(prevText => prevText + emojiObject.emoji);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && socket) {
      // --- THIS IS THE FIX ---
      // Send the text string directly, not as an object
      onSendMessage(text); 
      setText('');
      setShowEmojiPicker(false);
      if (typingTimeout) clearTimeout(typingTimeout);
      socket.emit('typing', { conversationId: conversation._id, isTyping: false });
    }
  };

  return (
    <div className="relative bg-light-container dark:bg-dark-container p-4 border-t border-light-border dark:border-dark-border">
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full mb-2">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            height={400}
            width={350}
            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
          className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
        </button>
        <button 
          type="button" 
          onClick={onAttachmentClick}
          className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        </button>
        
        <input
          type="text" value={text} onChange={handleTyping}
          placeholder="Type a message..."
          maxLength="1000"
          className="flex-1 rounded-full border border-transparent bg-light-bg dark:bg-dark-bg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
        />
        <button type="submit" className="p-2 rounded-full bg-light-accent dark:bg-dark-accent text-white flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50" disabled={!text.trim()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
  );
}