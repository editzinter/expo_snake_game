"use client";

import { useState, useEffect, useRef } from 'react';
import { gameSocketClient, ChatMessageEvent } from '@/lib/game/socket-client';
import { MessageCircle, Send, X, Users } from 'lucide-react';

interface ChatBoxProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChatBox({ visible, onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(visible);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Update visibility based on props
  useEffect(() => {
    setIsOpen(visible);
  }, [visible]);
  
  // Listen for chat messages
  useEffect(() => {
    // Add chat listener
    const handleChatMessage = (message: ChatMessageEvent) => {
      setMessages(prev => [...prev, message]);
    };
    
    gameSocketClient.addChatListener(handleChatMessage);
    
    return () => {
      gameSocketClient.removeChatListener(handleChatMessage);
    };
  }, []);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a new message
  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;
    
    gameSocketClient.sendChatMessage(newMessage);
    setNewMessage('');
  };
  
  // Handle pressing Enter to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute bottom-20 right-4 w-72 bg-black/80 backdrop-blur-md rounded-lg shadow-lg overflow-hidden z-50 border border-indigo-600/30">
      {/* Header */}
      <div className="flex items-center justify-between bg-indigo-600 px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-white" />
          <h3 className="text-sm font-bold text-white">Multiplayer Chat</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-white hover:text-indigo-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Messages */}
      <div className="max-h-60 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-4">
            <Users size={20} className="mx-auto mb-1 opacity-50" />
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="text-sm">
              <div className="flex items-start gap-1">
                <span className="text-gray-400 text-xs">{formatTime(msg.timestamp)}</span>
                <span className="font-semibold text-indigo-300">{msg.playerName}:</span>
                <span className="text-white break-words flex-1">{msg.message}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t border-gray-700 p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={100}
          />
          <button
            onClick={handleSendMessage}
            disabled={newMessage.trim() === ''}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-1 rounded"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
} 