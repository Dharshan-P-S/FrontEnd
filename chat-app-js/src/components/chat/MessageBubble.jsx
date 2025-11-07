import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import './TickTooltip.css';

const SingleTickSVG = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>);
const DoubleTickSVG = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>);

const MessageTicks = ({ status }) => {
    const tooltipContent = (
        <div className="tick-tooltip">
            <div className="tick-tooltip-item"><SingleTickSVG className="sent-tick" /> <span>Sent</span></div>
            <div className="tick-tooltip-item"><DoubleTickSVG className="delivered-tick" /> <span>Delivered</span></div>
            <div className="tick-tooltip-item"><DoubleTickSVG className="read-tick" /> <span>Read</span></div>
        </div>
    );
    let currentTicks = null;
    if (status === 'read') {
        currentTicks = <DoubleTickSVG className="text-light-accent dark:text-dark-accent" />;
    } else if (status === 'delivered') {
        currentTicks = <DoubleTickSVG className="text-light-text-secondary dark:text-dark-text-secondary" />;
    } else if (status === 'sent') {
        currentTicks = <SingleTickSVG className="text-light-text-secondary dark:text-dark-text-secondary" />;
    } else {
        return (
            <div className="tick-icon-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="animate-spin text-light-text-secondary dark:text-dark-text-secondary"><path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".5"/><path fill="currentColor" d="M12 4a8 8 0 0 0-8 8a.5.5 0 0 0 .5.5a.5.5 0 0 0 .5-.5a7 7 0 0 1 7-7a.5.5 0 0 0 .5-.5a.5.5 0 0 0-.5-.5Z"><animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path></svg>
            </div>
        );
    }
    return <div className="tick-icon-container">{currentTicks}{tooltipContent}</div>;
};

const FileIcon = ({ fileUrl }) => {
    const extension = fileUrl?.split('.').pop().toLowerCase().split('?')[0] || '';
    const iconSize = "w-10 h-10 flex-shrink-0 text-light-text-secondary dark:text-dark-text-secondary";
    switch (extension) {
        case 'pdf': return <svg className={iconSize} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-3M9.5 11.5c0 .83-.67 1.5-1.5 1.5H7v2H5.5V9H8c.83 0 1.5.67 1.5 1.5v1m-1.5-1H7v1h1v-1m3 4.5H11v-6h1.5v6m3.5-5.04c.33-.45.78-.76 1.34-.87c.43-.09.9-.09 1.33.09c.47.2.85.56 1.09.99c.24.44.34.94.34 1.48v1.85h-1.5v-1.9c0-.33-.07-.63-.2-.88c-.13-.25-.33-.45-.59-.56c-.26-.11-.56-.13-.84-.06c-.28.07-.52.21-.7.42c-.18.21-.29.47-.32.76H16v4.5h-1.5v-4.5h-.04Z"/></svg>;
        case 'ppt': case 'pptx': return <svg className={iconSize} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm2 4h12v2H6zm0 4h12v2H6zm0 4h9v2H6z"/></svg>;
        case 'doc': case 'docx': return <svg className={iconSize} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 9H7v-2h6zm3-4H7V5h9zm-3 7H7v-2h6z"/></svg>;
        default: return <svg className={iconSize} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
    }
};

const FileAttachment = ({ fileName, fileUrl }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleSaveAs = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', fileName || 'download');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg">
            <div className="flex items-center gap-3">
                <FileIcon fileUrl={fileUrl} />
                <span className="truncate text-sm font-medium text-light-text dark:text-dark-text">{fileName}</span>
            </div>
            <div className="mt-3 flex items-center justify-end gap-4">
                <button 
                    onClick={handleSaveAs}
                    disabled={isDownloading}
                    className="text-xs font-semibold text-light-accent dark:text-dark-accent hover:underline disabled:opacity-50"
                >
                    {isDownloading ? 'DOWNLOADING...' : 'SAVE AS'}
                </button>
            </div>
        </div>
    );
};

const ReactionPicker = ({ onSelectEmoji, isOwnMessage }) => {
    const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const pickerPosition = isOwnMessage ? 'right-0' : 'left-0';
    return (
        <div className={`absolute top-full ${pickerPosition} bg-light-container dark:bg-dark-container p-1 rounded-full shadow-lg border border-light-border dark:border-dark-border flex gap-1 z-20`}>
            {commonReactions.map(emoji => (
                <button 
                    key={emoji} 
                    onClick={() => onSelectEmoji(emoji)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-xl transition-transform transform hover:scale-125"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};

const ReactionButton = ({ onClick }) => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onClick} className="p-1 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10s10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8s8 3.589 8 8s-3.589 8-8 8z"/><path fill="currentColor" d="M14.5 9a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3zM9.5 9a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3z"/><path fill="currentColor" d="M12 17.5c-2.336 0-4.478-1.043-5.933-2.733c-.226-.26-.118-.654.195-.758c.313-.104.646.017.765.26c1.196 1.344 2.993 2.231 4.973 2.231c1.983 0 3.784-.891 4.978-2.235c.119-.242.453-.364.764-.258c.313-.104.425.501.198.761C16.48 16.457 14.336 17.5 12 17.5z"/></svg>
        </button>
    </div>
);

export default function MessageBubble({ message, isOwnMessage, senderName, onReact }) {
  const [showPicker, setShowPicker] = useState(false);
  const { _id, text, timestamp, status, fileUrl, fileName, fileType, reactions } = message;
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerRef]);

  const alignmentClass = isOwnMessage ? 'items-end' : 'items-start';
  const styleClasses = isOwnMessage
    ? 'bg-sent-light dark:bg-sent-dark rounded-br-none text-light-text dark:text-dark-text'
    : 'bg-light-container dark:bg-dark-container rounded-bl-none text-light-text dark:text-dark-text';

  const handleReact = (emoji) => {
      onReact(_id, emoji);
      setShowPicker(false);
  };

  const aggregatedReactions = reactions?.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) { acc[reaction.emoji] = { count: 0, users: [] }; }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(reaction.username);
      return acc;
  }, {});
  
  const hasReactions = aggregatedReactions && Object.keys(aggregatedReactions).length > 0;

  const isDisplayableImage = fileType === 'image' && !fileUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className={`flex w-full items-start gap-2 group ${isOwnMessage ? 'justify-end' : 'justify-start'} ${hasReactions ? 'mb-4' : ''}`}>
        {!isOwnMessage && (
            <div className="relative">
                <ReactionButton onClick={() => setShowPicker(!showPicker)} />
                {showPicker && <div ref={pickerRef}><ReactionPicker onSelectEmoji={handleReact} isOwnMessage={isOwnMessage} /></div>}
            </div>
        )}

        <div className={`relative flex flex-col`}>
            {senderName && !isOwnMessage && (
                <span className="text-xs font-bold text-light-accent dark:text-dark-accent ml-3 mb-1">{senderName}</span>
            )}
            <div className={`max-w-xs sm:max-w-md lg:max-w-lg rounded-xl shadow-sm ${styleClasses}`}>
                {fileUrl && (
                    <div className="p-1">
                        {isDisplayableImage ? (
                            <img src={fileUrl} alt={fileName || 'Attachment'} className="rounded-lg w-full max-w-xs cursor-pointer" onClick={() => window.open(fileUrl, '_blank')}/>
                        ) : (
                            <div className="p-2"><FileAttachment fileName={fileName || 'file'} fileUrl={fileUrl} /></div>
                        )}
                    </div>
                )}
                {text && (<p className="break-words text-base text-light-text dark:text-dark-text px-3 pt-2 pb-1">{text}</p>)}
                <div className="flex items-center justify-end gap-1 text-[11px] text-light-text-secondary dark:text-dark-text-secondary px-3 pb-1.5">
                    <span>{timestamp ? format(new Date(timestamp), 'h:mm a') : ''}</span>
                    {isOwnMessage && <MessageTicks status={status} />}
                </div>
            </div>
            
            {hasReactions && (
                <div className={`absolute -bottom-4 ${isOwnMessage ? 'right-2' : 'left-2'} flex items-center gap-1`}>
                    {Object.entries(aggregatedReactions).map(([emoji, {count, users}]) => (
                        <div key={emoji} title={users.join(', ')} className="cursor-pointer bg-light-container dark:bg-dark-container rounded-full shadow px-1.5 py-0.5 text-xs flex items-center gap-1 border border-light-border dark:border-dark-border">
                            <span>{emoji}</span>
                            <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary">{count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {isOwnMessage && (
            <div className="relative">
                <ReactionButton onClick={() => setShowPicker(!showPicker)} />
                {showPicker && <div ref={pickerRef}><ReactionPicker onSelectEmoji={handleReact} isOwnMessage={isOwnMessage} /></div>}
            </div>
        )}
    </div>
  );
}