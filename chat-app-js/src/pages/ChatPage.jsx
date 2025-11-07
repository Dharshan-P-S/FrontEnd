import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useSocket } from '../context/SocketProvider';
import ProfileModal from '../components/profile/ProfileModal';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import GroupInfoModal from '../components/chat/GroupInfoModal';
import GroupSettingsModal from '../components/chat/GroupSettingsModal';

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const socket = useSocket();
  const currentUser = JSON.parse(localStorage.getItem('userProfile'));

  useEffect(() => {
    if (socket && currentUser?.userId) {
      socket.emit('get_conversations', { userId: currentUser.userId }, (fetchedConversations) => {
        const initialConversations = (fetchedConversations || []).map(c => ({
          ...c, unreadCount: 0, isTyping: false,
        }));
        setConversations(initialConversations);
      });
      const handleNewConversation = (newConvo) => {
        const newConversationWithState = { ...newConvo, unreadCount: 0, isTyping: false };
        setConversations(prev => {
            if (prev.find(c => c._id === newConvo._id)) return prev;
            return [...prev, newConversationWithState];
        });
        if (newConvo._isNew && newConvo._creatorId === currentUser.userId) {
            handleSelectConversation(newConversationWithState);
        }
      };
      const handleGroupUpdated = (updatedConvo) => {
        const fullUpdatedConvo = { ...updatedConvo, unreadCount: 0, isTyping: false };
        setConversations(prev => prev.map(c => c._id === fullUpdatedConvo._id ? fullUpdatedConvo : c));
        if (selectedConversation?._id === fullUpdatedConvo._id) {
            handleSelectConversation(fullUpdatedConvo);
        }
      };
      socket.on('new_conversation', handleNewConversation);
      socket.on('group_updated', handleGroupUpdated);
      return () => {
        socket.off('new_conversation', handleNewConversation);
        socket.off('group_updated', handleGroupUpdated);
      };
    }
  }, [socket, currentUser?.userId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (newMessage) => {
      setConversations(prevConvos => 
        prevConvos.map(convo => {
          if (convo._id === newMessage.conversationId) {
            const isSelected = selectedConversation?._id === newMessage.conversationId;
            return { ...convo, lastMessage: newMessage, unreadCount: isSelected ? 0 : (convo.unreadCount || 0) + 1 };
          }
          return convo;
        })
      );
    };
    const handleTypingIndicator = ({ conversationId, isTyping }) => {
      setConversations(prevConvos =>
        prevConvos.map(convo => (convo._id === conversationId ? { ...convo, isTyping } : convo))
      );
    };
    socket.on('new_message', handleNewMessage);
    socket.on('typing_indicator', handleTypingIndicator);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing_indicator', handleTypingIndicator);
    };
  }, [socket, selectedConversation]);

  const handleSelectConversation = (conversation) => {
    let convoToSelect = conversation;
    if (conversation && !conversation.isGroup && !conversation.otherUser) {
        const otherUser = conversation.participantsInfo?.find(p => p.userId !== currentUser.userId);
        convoToSelect = { ...conversation, otherUser };
    }
    setSelectedConversation(convoToSelect);
    if (conversation) {
      setConversations(prevConvos =>
        prevConvos.map(convo => (convo._id === conversation._id ? { ...convo, unreadCount: 0 } : convo))
      );
    }
  };
  
  const openGroupSettings = () => {
    setIsGroupInfoOpen(false);
    setIsGroupSettingsOpen(true);
  };

  const closeGroupSettings = () => {
    setIsGroupSettingsOpen(false);
  };
  
  const handleMyMessageSent = (message) => {
    setConversations(prevConvos => 
      prevConvos.map(convo => {
        if (convo._id === message.conversationId) {
          return { ...convo, lastMessage: message };
        }
        return convo;
      })
    );
  };

  return (
    <>
      <MainLayout
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        onViewProfile={setViewingProfile}
        onEditMyProfile={() => setIsMyProfileOpen(true)}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onViewGroupInfo={() => setIsGroupInfoOpen(true)}
        onMessageSent={handleMyMessageSent}
      />
      
      {isMyProfileOpen && <ProfileModal user={currentUser} onClose={() => setIsMyProfileOpen(false)} isCurrentUser={true} />}
      {viewingProfile && <ProfileModal user={viewingProfile} onClose={() => setViewingProfile(null)} isCurrentUser={false} />}
      {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} onGroupCreated={handleSelectConversation} />}
      
      {isGroupInfoOpen && selectedConversation?.isGroup && (
        <GroupInfoModal
          conversation={selectedConversation}
          currentUser={currentUser}
          onClose={() => setIsGroupInfoOpen(false)}
          onEditInfo={openGroupSettings}
        />
      )}
      {isGroupSettingsOpen && selectedConversation?.isGroup && (
        <GroupSettingsModal
          conversation={selectedConversation}
          currentUser={currentUser}
          onClose={closeGroupSettings}
        />
      )}
    </>
  );
}