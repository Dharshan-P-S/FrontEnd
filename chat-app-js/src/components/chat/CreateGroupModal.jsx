import React, { useState } from 'react';
import { useSocket } from '../../context/SocketProvider';

export default function CreateGroupModal({ onClose }) {
  const [groupName, setGroupName] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState('');
  const socket = useSocket();
  const currentUser = JSON.parse(localStorage.getItem('userProfile'));
  const defaultAvatar = (seed) => `https://api.dicebear.com/8.x/initials/svg?seed=${seed || '?'}`;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchUsername.trim() || !socket) return;
    socket.emit('search_user', { username: searchUsername }, (foundUser) => {
      if (foundUser && foundUser.userId !== currentUser.userId && !selectedMembers.some(m => m.userId === foundUser.userId)) {
        setSearchResults([foundUser]);
      } else {
        setSearchResults([]);
      }
    });
  };
  
  const addMember = (user) => {
    setSelectedMembers(prev => [...prev, user]);
    setSearchUsername('');
    setSearchResults([]);
  };

  const removeMember = (userId) => {
    setSelectedMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) { setError('Group name is required.'); return; }
    if (selectedMembers.length < 1) { setError('You must add at least one other member.'); return; }
    
    socket.emit('create_group', {
      groupName,
      members: selectedMembers,
      creator: currentUser
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Create a New Group</h2>
        <div className="space-y-4">
          <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group Name" className="w-full rounded-md border-gray-300 shadow-sm" />
          <div className="p-2 border rounded-md min-h-[50px]">
            <span className="font-semibold mr-2">Members:</span>
            {selectedMembers.map(member => (
              <span key={member.userId} className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded-full">
                {member.username}
                <button onClick={() => removeMember(member.userId)} className="text-indigo-500 hover:text-indigo-700 font-bold">x</button>
              </span>
            ))}
          </div>
          <form onSubmit={handleSearch}>
            <input type="text" value={searchUsername} onChange={(e) => setSearchUsername(e.target.value)} placeholder="Search users to add..." className="w-full rounded-md border-gray-300 shadow-sm" />
          </form>
          {searchResults.map(user => (
            <div key={user.userId} onClick={() => addMember(user)} className="cursor-pointer p-2 flex items-center gap-3 hover:bg-gray-100 rounded-md">
              <img src={user.avatarUrl || defaultAvatar(user.username)} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
              <span>{user.username}</span>
            </div>
          ))}
        </div>
        {error && <p className="text-center text-sm text-red-500 mt-4">{error}</p>}
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded-md border">Cancel</button>
          <button onClick={handleCreateGroup} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Create Group</button>
        </div>
      </div>
    </div>
  );
}