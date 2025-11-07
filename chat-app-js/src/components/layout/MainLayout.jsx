import React from 'react';
import ChatList from '../chat/ChatList';
import ConversationView from '../chat/ConversationView';

export default function MainLayout({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  onViewProfile,
  onEditMyProfile,
  onCreateGroup,
  onViewGroupInfo,
  onMessageSent,
}) {
  return (
    <div className="flex h-screen w-full">
      <div className="w-full max-w-xs border-r border-light-border dark:border-dark-border bg-light-container dark:bg-dark-container md:w-1/3">
        <ChatList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={onSelectConversation}
          onEditMyProfile={onEditMyProfile}
          onCreateGroup={onCreateGroup}
        />
      </div>
      <div className="flex-1">
        {selectedConversation ? (
          <ConversationView 
            key={selectedConversation._id} 
            conversation={selectedConversation}
            onViewProfile={onViewProfile}
            onViewGroupInfo={onViewGroupInfo}
            onMessageSent={onMessageSent}
          />
        ) : (
          <ConversationView conversation={null} />
        )}
      </div>
    </div>
  );
}