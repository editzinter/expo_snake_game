"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Users, Wifi } from "lucide-react";

interface GameHeaderProps {
  onNameChange?: (name: string) => void;
  initialName?: string;
  isMultiplayer?: boolean;
}

const GameHeader = ({ 
  onNameChange, 
  initialName = "",
  isMultiplayer = false 
}: GameHeaderProps) => {
  const [playerName, setPlayerName] = useState<string>(initialName || "");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const router = useRouter();
  
  useEffect(() => {
    if (initialName && initialName !== playerName) {
      setPlayerName(initialName);
    }
  }, [initialName]);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
  };
  
  const handleNameSubmit = () => {
    setIsEditing(false);
    if (onNameChange && playerName.trim()) {
      onNameChange(playerName.trim());
    }
  };
  
  const handleNameBlur = () => {
    handleNameSubmit();
  };
  
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    }
  };
  
  const navigateHome = () => {
    router.push("/");
  };
  
  return (
    <header className="h-16 px-4 flex items-center justify-between bg-gradient-to-r from-indigo-900/70 to-purple-900/70 backdrop-blur-md shadow-lg border-b border-indigo-500/30">
      <div className="flex items-center space-x-4">
        <button 
          onClick={navigateHome}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-white transition-colors"
          aria-label="Go home"
        >
          <Home size={18} />
        </button>
        
        <h1 className="text-xl font-bold text-white">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            Snake.io
          </span>
        </h1>
        
        {/* Show game mode indicator */}
        {isMultiplayer && (
          <div className="flex items-center space-x-1 bg-indigo-600/50 px-2 py-1 rounded-full text-white text-xs">
            <Users size={12} />
            <span>Multiplayer</span>
            <Wifi size={12} className="animate-pulse text-green-400" />
          </div>
        )}
      </div>
      
      <div className="flex items-center">
        <div className="text-white mr-2">Playing as:</div>
        {isEditing ? (
          <input
            type="text"
            value={playerName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            autoFocus
            maxLength={15}
            className="bg-indigo-900/50 border border-indigo-400/30 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Enter your name"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-indigo-900/50 hover:bg-indigo-800/50 border border-indigo-400/30 rounded px-3 py-1 text-white transition-colors flex items-center space-x-2"
          >
            <span>{playerName || "Unknown Player"}</span>
            <span className="text-xs text-indigo-300">(click to edit)</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default GameHeader; 