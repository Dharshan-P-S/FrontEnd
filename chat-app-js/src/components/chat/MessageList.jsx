import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';

const formatDateSeparator = (dateStr) => {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

const DateSeparator = ({ date }) => (
  <div className="text-center my-4">
    <span className="bg-light-bg dark:bg-dark-container text-light-text-secondary dark:text-dark-text-secondary text-xs font-semibold px-3 py-1 rounded-full">
      {formatDateSeparator(date)}
    </span>
  </div>
);

export default function MessageList({ messages, participantsInfo, onReact }) {
  const currentUser = JSON.parse(localStorage.getItem('userProfile'));
  const isGroup = participantsInfo && participantsInfo.length > 2;
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);
  
  // --- THIS IS THE UPDATED SCROLL LOGIC ---
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    // Check if the user is scrolled near the bottom before auto-scrolling
    const isScrolledToBottom = listElement.scrollHeight - listElement.scrollTop <= listElement.clientHeight + 100;

    if (isScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2">
      {messages.map((msg, index) => {
        if (!msg || !msg.timestamp) return null;
        const showDateSeparator = index === 0 || !isSameDay(new Date(messages[index - 1].timestamp), new Date(msg.timestamp));
        
        const isOwnMessage = msg.senderId === currentUser?.userId;
        let senderName = null;
        if (isGroup && !isOwnMessage) {
            const sender = participantsInfo.find(p => p.userId === msg.senderId);
            senderName = sender?.username;
        }

        return (
          <div key={msg._id}>
            {showDateSeparator && <DateSeparator date={msg.timestamp} />}
            <MessageBubble
              message={msg}
              isOwnMessage={isOwnMessage}
              senderName={senderName}
              onReact={onReact}
            />
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}