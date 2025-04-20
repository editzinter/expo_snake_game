"use client";

import { useState, useEffect } from 'react';
import { gameSocketClient } from '@/lib/game/socket-client';
import { Trophy, ChevronUp, ChevronDown, Crown } from 'lucide-react';

interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
}

interface LeaderboardProps {
  playerCount?: number;
}

export default function Leaderboard({ playerCount }: LeaderboardProps) {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  
  // Listen for leaderboard updates
  useEffect(() => {
    const handleLeaderboardUpdate = (leaderboard: LeaderboardPlayer[]) => {
      setPlayers(leaderboard);
    };
    
    // Get current player ID
    setCurrentPlayerId(gameSocketClient.getPlayerId());
    
    // Add leaderboard listener
    gameSocketClient.addLeaderboardListener(handleLeaderboardUpdate);
    
    return () => {
      gameSocketClient.removeLeaderboardListener(handleLeaderboardUpdate);
    };
  }, []);
  
  // Display top 3 players if collapsed, or all players if expanded
  const displayedPlayers = isExpanded ? players : players.slice(0, 3);
  
  // Find current player's position
  const currentPlayerPosition = players.findIndex(p => p.id === currentPlayerId);
  const showCurrentPlayerSeparately = 
    currentPlayerPosition >= 0 && 
    currentPlayerPosition >= 3 && 
    !isExpanded;
    
  return (
    <div className="absolute top-20 left-4 w-64 bg-black/70 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden z-40">
      {/* Header */}
      <div className="flex items-center justify-between bg-indigo-600/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-white" />
          <h3 className="text-sm font-bold text-white">Leaderboard</h3>
          {playerCount !== undefined && (
            <span className="ml-2 bg-indigo-700 text-white text-xs px-2 py-0.5 rounded-full">
              {playerCount} Players
            </span>
          )}
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-indigo-200 transition-colors"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {/* Player list */}
      <div className="p-2 space-y-1">
        {players.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-2">
            No players yet
          </div>
        ) : (
          <>
            {displayedPlayers.map((player, index) => (
              <div 
                key={player.id} 
                className={`flex items-center px-2 py-1 rounded ${player.id === currentPlayerId ? 'bg-indigo-900/50 border border-indigo-500/50' : 'bg-gray-800/50'}`}
              >
                <div className="flex-none w-6 text-center">
                  {index === 0 ? (
                    <Crown size={16} className="text-yellow-400 mx-auto" />
                  ) : (
                    <span className={`text-xs font-bold ${index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-sm truncate text-white ml-2">
                  {player.name}
                </div>
                <div className="text-right text-xs font-bold text-indigo-300">
                  {player.score.toLocaleString()}
                </div>
              </div>
            ))}
            
            {/* Show current player if not in top 3 and board is collapsed */}
            {showCurrentPlayerSeparately && (
              <>
                <div className="border-t border-gray-700 my-1 pt-1">
                  <div 
                    className="flex items-center px-2 py-1 rounded bg-indigo-900/50 border border-indigo-500/50"
                  >
                    <div className="flex-none w-6 text-center">
                      <span className="text-xs font-bold text-gray-400">
                        {currentPlayerPosition + 1}
                      </span>
                    </div>
                    <div className="flex-1 text-sm truncate text-white ml-2">
                      {players[currentPlayerPosition].name}
                    </div>
                    <div className="text-right text-xs font-bold text-indigo-300">
                      {players[currentPlayerPosition].score.toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Player count */}
      {!isExpanded && players.length > 3 && (
        <div className="border-t border-gray-700 px-3 py-1 text-center text-xs text-gray-400">
          <button 
            onClick={() => setIsExpanded(true)}
            className="hover:text-white transition-colors"
          >
            Show all players ({players.length})
          </button>
        </div>
      )}
    </div>
  );
} 