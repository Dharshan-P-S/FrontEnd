import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketProvider';

export default function ChatList({ conversations, onSelectConversation, selectedConversation, onEditMyProfile, onCreateGroup }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const socket = useSocket();
  const currentUser = JSON.parse(localStorage.getItem('userProfile'));
  const defaultAvatar = (seed) => `https://api.dicebear.com/8.x/initials/svg?seed=${seed || '?'}&backgroundColor=b6e3f4`;
  const menuRef = useRef(null);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (socket) {
        socket.emit('search', { searchTerm }, (results) => {
          setSearchResults(results || []);
        });
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, socket]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleSelectSearchResult = (result) => {
    if (result.type === 'user') {
      socket.emit('create_conversation', { currentUser, otherUser: result }, (newConversation) => {
        onSelectConversation(newConversation);
      });
    } else if (result.type === 'group') {
      onSelectConversation(result);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className="flex h-full flex-col bg-light-container dark:bg-dark-container">
      {/* Header */}
      <div className="p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4 relative">
          <h2 className="text-2xl font-bold">Chats</h2>
          <div ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-light-container dark:bg-dark-container rounded-md shadow-lg border border-light-border dark:border-dark-border z-20">
                <button onClick={() => { onCreateGroup(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">New Group</button>
                <button onClick={() => { onEditMyProfile(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">My Profile</button>
              </div>
            )}
          </div>
        </div>
        <div className="relative">
          <input
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full border border-transparent bg-light-bg dark:bg-dark-bg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
          </div>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto">
        {searchTerm.trim() ? (
          <div>
            <h3 className="p-3 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border">Search Results</h3>
            {searchResults.length > 0 ? searchResults.map(result => (
              <div key={result._id} onClick={() => handleSelectSearchResult(result)} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-light-border dark:border-dark-border">
                <img src={(result.type === 'user' ? result.avatarUrl : result.groupAvatarUrl) || defaultAvatar(result.username || result.groupName)} alt={result.username || result.groupName} className="w-12 h-12 rounded-full object-cover"/>
                <div className="flex flex-col"><span className="font-semibold">{result.username || result.groupName}</span><span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{result.type === 'user' ? 'User' : 'Group'}</span></div>
              </div>
            )) : <p className="text-center text-gray-500 p-4">No results found.</p>}
          </div>
        ) : (
          conversations.map((convo) => {
            if (!convo) return null;
            const isSelected = selectedConversation?._id === convo._id;
            let displayName, displayAvatar, otherUser;

            if (convo.isGroup) {
              displayName = convo.groupName;
              displayAvatar = convo.groupAvatarUrl || defaultAvatar(convo.groupName);
            } else {
              otherUser = convo.participantsInfo?.find(p => p.userId !== currentUser.userId);
              displayName = otherUser?.username || 'Unknown User';
              displayAvatar = otherUser?.avatarUrl || defaultAvatar(otherUser?.username);
            }
            
            let lastMessageText = "No messages yet.";
            if (convo.lastMessage) {
              if (convo.lastMessage.senderId === currentUser.userId) { lastMessageText = `You: ${convo.lastMessage.text}`;
              } else {
                  const sender = convo.participantsInfo?.find(p => p.userId === convo.lastMessage.senderId);
                  lastMessageText = `${sender?.username || '... '}: ${convo.lastMessage.text}`;
              }
            }
            
            return (
              <div key={convo._id} className={`flex cursor-pointer items-center gap-4 p-3 border-b border-light-border dark:border-dark-border ${isSelected ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} onClick={() => onSelectConversation({ ...convo, otherUser })}>
                <img src={displayAvatar} alt={displayName} className="h-12 w-12 rounded-full object-cover"/>
                <div className="flex-1 overflow-hidden">
                  <h3 className="truncate font-semibold">{displayName}</h3>
                  <p className={`truncate text-sm ${convo.unreadCount > 0 ? 'font-bold text-light-text dark:text-dark-text' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>
                    {convo.isTyping ? <span className="italic text-light-accent dark:text-dark-accent">typing...</span> : lastMessageText}
                  </p>
                </div>
                {convo.unreadCount > 0 && (
                  <div className="flex-shrink-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-light-accent dark:bg-dark-accent text-xs text-white font-bold">
                      {convo.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}