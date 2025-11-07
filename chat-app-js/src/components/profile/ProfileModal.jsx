import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketProvider';

export default function ProfileModal({ user, onClose, isCurrentUser }) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user.avatarUrl || '');
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const socket = useSocket();
  const fileInputRef = useRef(null);
  const avatarMenuRef = useRef(null);

  const CLOUDINARY_CLOUD_NAME = "duzgpmzhp";
  const CLOUDINARY_UPLOAD_PRESET = "ml_default";
  
  const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${user.username}`;

  useEffect(() => {
    function handleClickOutside(event) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setIsAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [avatarMenuRef]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 1048576) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    } else if (file) {
      setError('Image must be under 1MB.');
    }
    setIsAvatarMenuOpen(false);
  };
  
  const handleRemovePhoto = () => {
    setImageFile(null); // Mark for removal
    setPreviewUrl(''); // Clear preview
    setIsAvatarMenuOpen(false);
  };

  const handleSave = async () => {
    if (!username.trim()) { setError('Username cannot be empty.'); return; }
    if (bio.length > 50) { setError('Bio cannot exceed 50 characters.'); return; }
    
    setIsLoading(true);
    let finalAvatarUrl = previewUrl;

    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST', body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          finalAvatarUrl = data.secure_url;
        } else { throw new Error('Image upload failed.'); }
      } catch (err) {
        setError('Failed to upload image.'); setIsLoading(false); return;
      }
    }

    socket.emit('update_profile', { userId: user.userId, username, bio, avatarUrl: finalAvatarUrl }, 
      ({ success, user: updatedUser, message }) => {
        setIsLoading(false);
        if (success) {
          if (isCurrentUser) { localStorage.setItem('userProfile', JSON.stringify(updatedUser)); }
          onClose();
          window.location.reload();
        } else { setError(message || 'Failed to save.'); }
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">{isCurrentUser ? "Edit Your Profile" : `${user.username}'s Profile`}</h2>
        
        <div className="relative w-24 h-24 mx-auto mb-4">
          <img 
            src={previewUrl || defaultAvatar}
            alt="Avatar Preview"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
          />
          {isCurrentUser && (
            <div className="absolute -bottom-1 -right-1" ref={avatarMenuRef}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
              <button onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)} className="bg-gray-700 text-white p-1.5 rounded-full hover:bg-gray-800 border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              {isAvatarMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-max bg-white rounded-md shadow-lg border z-30">
                  <button onClick={() => { fileInputRef.current.click(); }} className="block w-full text-left p-2 text-sm hover:bg-gray-100">Change Photo</button>
                  <button onClick={handleRemovePhoto} className="block w-full text-left p-2 text-sm text-red-500 hover:bg-red-50">Remove Photo</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              disabled={!isCurrentUser} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              {isCurrentUser && !isEditingBio && (
                <button onClick={() => setIsEditingBio(true)} className="text-xs text-indigo-600 hover:underline p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/></svg>
                </button>
              )}
            </div>
            {isCurrentUser && isEditingBio ? (
              <textarea
                value={bio} onChange={(e) => setBio(e.target.value)} maxLength="50"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows="2"
              />
            ) : (
              <p className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-700 min-h-[42px]">{bio || "No bio set."}</p>
            )}
          </div>
        </div>
        
        {error && <p className="text-center text-sm text-red-500 mt-4">{error}</p>}
        
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-100">Close</button>
          {isCurrentUser && (
            <button onClick={handleSave} disabled={isLoading} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}