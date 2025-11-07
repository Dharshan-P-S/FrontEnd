import React, { useState } from 'react';

export default function AttachmentModal({ onClose, onSend, isLoading }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // --- Cloudinary Config ---
  const CLOUDINARY_CLOUD_NAME = 'duzgpmzhp';
  const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Limit is 10MB.');
      return;
    }

    setFile(selectedFile);
    setError('');

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl('');
    }
  };

  const handleSend = async () => {
    if (!file) {
      setError('Please select a file to send.');
      return;
    }

    setUploading(true);

    try {
      // 1️⃣ Determine the Cloudinary resource type
      let resourceType = 'raw';
      if (file.type.startsWith('image/')) resourceType = 'image';
      else if (file.type.startsWith('video/')) resourceType = 'video';

      // 2️⃣ Prepare form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      // 3️⃣ Upload directly to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      // 4️⃣ Construct correct URL for raw files (PDF, DOCX, etc.)
      let fileUrl = data.secure_url;
      if (resourceType === 'raw' && !fileUrl.includes('/raw/upload/')) {
        fileUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
      }

      // 5️⃣ Send message info back to chat
      onSend({
        fileUrl,
        fileName: file.name,
        fileType: file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
          ? 'video'
          : 'document',
        caption,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-light-container dark:bg-dark-container rounded-lg p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Send Attachment</h2>

        {previewUrl && (
          <div className="mb-4 bg-light-bg dark:bg-dark-bg p-4 rounded-md">
            <img
              src={previewUrl}
              alt="File preview"
              className="max-h-64 w-auto mx-auto rounded-md"
            />
          </div>
        )}

        {file && !previewUrl && (
          <div className="mb-4 p-4 bg-light-bg dark:bg-dark-bg rounded-md text-center">
            <p className="font-semibold">Selected file:</p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {file.name}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption... (optional)"
            maxLength="1000"
            className="w-full rounded-md border-gray-300 dark:bg-dark-bg dark:border-dark-border focus:ring-light-accent focus:border-light-accent"
          />
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 mt-4">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-light-border dark:border-dark-border"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!file || uploading || isLoading}
            className="px-4 py-2 rounded-md bg-light-accent dark:bg-dark-accent text-white disabled:bg-opacity-50"
          >
            {uploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
