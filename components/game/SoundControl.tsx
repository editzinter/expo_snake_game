"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Music, Info } from "lucide-react";
import { soundManager } from "@/lib/audio/SoundManager";

const SoundControl = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [showControls, setShowControls] = useState(false);
  const [showInfoMessage, setShowInfoMessage] = useState(false);

  useEffect(() => {
    // Initialize state from sound manager
    setIsMuted(soundManager.isMutedStatus());
  }, []);

  const handleToggleMute = useCallback(() => {
    const newMuteState = soundManager.toggleMute();
    setIsMuted(newMuteState);
  }, []);

  const handleMusicVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMusicVolume(newVolume);
    soundManager.setMusicVolume(newVolume);
  }, []);

  const handleSfxVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setSfxVolume(newVolume);
    soundManager.setSfxVolume(newVolume);
  }, []);

  const toggleControlsVisibility = useCallback(() => {
    setShowControls(!showControls);
  }, [showControls]);

  const handleTestSfx = useCallback(() => {
    soundManager.playRandomFoodSound();
  }, []);

  const toggleInfoMessage = useCallback(() => {
    setShowInfoMessage(!showInfoMessage);
  }, [showInfoMessage]);

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="flex flex-col items-end">
        {/* Info message for placeholder sounds */}
        {showInfoMessage && (
          <div className="mb-2 p-3 bg-black/70 backdrop-blur-sm rounded-lg w-64 text-xs text-white">
            <p className="mb-2 text-yellow-300 font-semibold">Sound Files Notice</p>
            <p className="mb-2">
              The sound files in this project are placeholders. To experience the full game with sound:
            </p>
            <ol className="list-decimal pl-4 mb-2 space-y-1">
              <li>Download audio files for games (see README in public/sounds folder)</li>
              <li>Add them to the public/sounds directory with matching filenames</li>
              <li>Refresh the page</li>
            </ol>
            <button 
              onClick={toggleInfoMessage}
              className="mt-1 px-2 py-1 bg-gray-700 rounded text-center w-full hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        )}
        
        {/* Expanded volume controls */}
        {showControls && (
          <div className="mb-2 p-3 bg-black/70 backdrop-blur-sm rounded-lg flex flex-col gap-2 w-48">
            <div className="flex items-center gap-2">
              <Music size={16} className="text-indigo-400" />
              <span className="text-xs text-white mr-2">Music</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={musicVolume}
                onChange={handleMusicVolumeChange}
                className="w-full accent-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-cyan-400" />
              <span className="text-xs text-white mr-2">SFX</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={sfxVolume}
                onChange={handleSfxVolumeChange}
                className="w-full accent-cyan-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button 
                className="text-xs text-gray-300 hover:text-white px-2 py-1 bg-gray-800/50 rounded"
                onClick={handleTestSfx}
              >
                Test Sound
              </button>
              
              <button 
                className="text-xs text-yellow-300 hover:text-yellow-200 px-2 py-1 rounded flex items-center gap-1"
                onClick={toggleInfoMessage}
              >
                <Info size={12} />
                Info
              </button>
            </div>
          </div>
        )}
        
        {/* Main sound button */}
        <button
          onClick={toggleControlsVisibility}
          className="group relative bg-indigo-900/60 hover:bg-indigo-800/80 text-white p-2 rounded-lg"
        >
          <span className="sr-only">Sound Controls</span>
          <div onClick={handleToggleMute} className="flex items-center justify-center w-8 h-8">
            {isMuted ? (
              <VolumeX size={18} className="text-red-400" />
            ) : (
              <Volume2 size={18} className="text-cyan-400" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default SoundControl; 