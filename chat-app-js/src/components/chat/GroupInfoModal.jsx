import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketProvider';

export default function GroupInfoModal({ conversation, onClose, currentUser }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [groupName, setGroupName] = useState(conversation.groupName);
  const [groupDescription, setGroupDescription] = useState(conversation.groupDescription || '');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(conversation.groupAvatarUrl || '');
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const socket = useSocket();
  const memberMenuRef = useRef(null);
  const avatarInputRef = useRef(null);
  const avatarMenuRef = useRef(null);

  const CLOUDINARY_CLOUD_NAME = "duzgpmzhp";
  const CLOUDINARY_UPLOAD_PRESET = "ml_default";
  
  const isCurrentUserAdmin = conversation.admins.includes(currentUser.userId);
  const isCurrentUserOwner = conversation.ownerId === currentUser.userId;
  const defaultAvatar = (seed) => `https://api.dicebear.com/8.x/initials/svg?seed=${seed || '?'}`;

  useEffect(() => {
    function handleClickOutside(event) {
      if (memberMenuRef.current && !memberMenuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setIsAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [memberMenuRef, avatarMenuRef]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 1048576) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    } else if (file) {
      setError('Image must be under 1MB.');
    }
    setIsAvatarMenuOpen(false);
    setIsEditingInfo(true);
  };
  
  const handleRemoveAvatar = () => {
    setImageFile('REMOVE');
    setPreviewUrl('');
    setIsAvatarMenuOpen(false);
    setIsEditingInfo(true);
  };

  const handleSaveChanges = async () => {
    if (!groupName.trim()) { setError('Group name cannot be empty.'); return; }
    if (groupDescription.length > 100) { setError('Description cannot exceed 100 characters.'); return; }
    
    setIsLoading(true);
    let finalAvatarUrl = previewUrl;

    if (imageFile === 'REMOVE') {
      finalAvatarUrl = '';
    } else if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.secure_url) {
          finalAvatarUrl = data.secure_url;
        } else { throw new Error('Image upload failed.'); }
      } catch (err) {
        setError('Failed to upload image.'); setIsLoading(false); return;
      }
    }
    
    socket.emit('update_group_info', { conversationId: conversation._id, groupName, groupDescription, groupAvatarUrl: finalAvatarUrl });
    setIsEditingInfo(false);
    setIsLoading(false);
  };

  const handlePromote = (memberId) => {
    socket.emit('promote_admin', { conversationId: conversation._id, memberIdToPromote: memberId });
    setOpenMenuId(null);
  };
  
  const handleDemote = (memberId) => {
    socket.emit('demote_admin', { conversationId: conversation._id, memberIdToDemote: memberId });
    setOpenMenuId(null);
  };

  const handleRemove = (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
        socket.emit('remove_group_member', { conversationId: conversation._id, memberIdToRemove: memberId });
    }
    setOpenMenuId(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="relative w-24 h-24 mx-auto">
            <img 
              src={previewUrl || defaultAvatar(groupName)}
              alt="Group Avatar"
              className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-gray-300"
            />
            {isCurrentUserAdmin && (
              <div className="absolute -bottom-1 -right-1" ref={avatarMenuRef}>
                <input type="file" ref={avatarInputRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden"/>
                <button onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)} className="bg-gray-700 text-white p-1.5 rounded-full hover:bg-gray-800 border-2 border-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                {isAvatarMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-max bg-white rounded-md shadow-lg border z-30">
                    <button onClick={() => { avatarInputRef.current.click(); }} className="block w-full text-left p-2 text-sm hover:bg-gray-100">Change Photo</button>
                    <button onClick={handleRemoveAvatar} className="block w-full text-left p-2 text-sm text-red-500 hover:bg-red-50">Remove Photo</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isCurrentUserAdmin && isEditingInfo ? (
            <input 
              type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} 
              className="text-2xl font-bold mt-4 text-center border-b-2 focus:outline-none"
            />
          ) : (
            <h2 className="text-2xl font-bold mt-4">{groupName}</h2>
          )}
          {/* REMOVED the duplicate description from here */}
        </div>

        <div className="mb-4">
            <div className="flex justify-center items-center gap-2">
                <h3 className="font-bold text-lg">Description</h3>
                {isCurrentUserAdmin && !isEditingInfo && (
                    <button onClick={() => setIsEditingInfo(true)} className="p-1 rounded-full hover:bg-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                )}
            </div>
            {isCurrentUserAdmin && isEditingInfo ? (
               <textarea 
                  value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} 
                  maxLength="100"
                  className="w-full text-sm text-gray-500 mt-1 text-center border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" rows="2"
               />
            ) : (
                // --- THIS IS THE CHANGED LINE ---
                <p className="text-sm text-gray-500 mt-1 text-center">{groupDescription || "No Description Available"}</p>
            )}
        </div>

        <h3 className="font-bold text-lg mb-2">Members ({conversation.participants.length})</h3>
        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
          {conversation.participantsInfo.map(member => {
            const isTargetOwner = member.userId === conversation.ownerId;
            const isTargetAdmin = conversation.admins.includes(member.userId);
            const canManageAdmins = isCurrentUserOwner && !isTargetOwner;
            const canRemoveMember = isCurrentUserAdmin && !isTargetOwner;
            const showMenuButton = (canManageAdmins || canRemoveMember) && member.userId !== currentUser.userId;

            return (
              <div key={member.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <img src={member.avatarUrl || defaultAvatar(member.username)} alt={member.username} className="w-10 h-10 rounded-full object-cover"/>
                  <div className="flex flex-col">
                    <span>{member.username} {member.userId === currentUser.userId && '(You)'}</span>
                     {isTargetOwner ? <span className="text-xs text-yellow-600">Owner</span>
                     : isTargetAdmin ? <span className="text-xs text-indigo-600">Admin</span>
                     : null}
                  </div>
                </div>

                {showMenuButton && (
                  <div className="relative" ref={openMenuId === member.userId ? memberMenuRef : null}>
                    <button onClick={() => setOpenMenuId(openMenuId === member.userId ? null : member.userId)} className="p-2 rounded-full hover:bg-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2"/></svg>
                    </button>
                    {openMenuId === member.userId && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-20">
                        {canManageAdmins && !isTargetAdmin && (<button onClick={() => handlePromote(member.userId)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Make Admin</button>)}
                        {canManageAdmins && isTargetAdmin && (<button onClick={() => handleDemote(member.userId)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Remove as Admin</button>)}
                        {canRemoveMember && (<button onClick={() => handleRemove(member.userId)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Remove from Group</button>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {error && <p className="text-center text-sm text-red-500 mt-4">{error}</p>}

        <div className="mt-6 flex justify-end gap-4 border-t pt-4">
          {isCurrentUserAdmin && isEditingInfo ? (
            <>
              <button onClick={() => { setIsEditingInfo(false); setError(''); }} className="px-4 py-2 rounded-md border hover:bg-gray-100">Cancel</button>
              <button onClick={handleSaveChanges} disabled={isLoading} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-100">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}