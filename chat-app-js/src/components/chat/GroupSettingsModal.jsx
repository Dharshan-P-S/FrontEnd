import React, { useState } from 'react';
import { useSocket } from '../../context/SocketProvider';

export default function GroupSettingsModal({ conversation, onClose }) {
    const [groupName, setGroupName] = useState(conversation.groupName);
    const [groupDescription, setGroupDescription] = useState(conversation.groupDescription || '');
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(conversation.groupAvatarUrl || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const socket = useSocket();

    const CLOUDINARY_CLOUD_NAME = "duzgpmzhp";
    const CLOUDINARY_UPLOAD_PRESET = "ml_default";
    const defaultAvatar = (seed) => `https://api.dicebear.com/8.x/initials/svg?seed=${seed || '?'}`;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size < 1048576) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        } else if (file) {
            setError('Image must be under 1MB.');
        }
    };

    const handleSaveChanges = async () => {
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

        socket.emit('update_group_info', {
            conversationId: conversation._id,
            groupName,
            groupDescription,
            groupAvatarUrl: finalAvatarUrl
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Edit Group Info</h2>
                <div className="space-y-4">
                    <div className="text-center">
                        <img src={previewUrl || defaultAvatar(groupName)} alt="Group Avatar Preview" className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-gray-300"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Change Group Picture (Max 1MB)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Group Name</label>
                        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Group Description</label>
                        <textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows="3" />
                    </div>
                </div>
                {error && <p className="text-center text-sm text-red-500 mt-4">{error}</p>}
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border">Cancel</button>
                    <button onClick={handleSaveChanges} disabled={isLoading} className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:bg-indigo-300">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}