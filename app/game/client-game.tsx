"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { isServerReachable } from "@/lib/utils";

// Import components with dynamic loading to prevent SSR issues with canvas
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
});

const GameHeader = dynamic(() => import("@/components/game/GameHeader"), {
  ssr: false,
});

interface ClientGameProps {
  mode?: "offline" | "multiplayer";
}

/**
 * ClientGame component - Renders the game in either offline or multiplayer mode
 * 
 * Offline Mode:
 * - All game logic is handled client-side
 * - No server communication
 * - Player has complete authority over game state
 * - Suitable for practice, low-latency play, or when server is unavailable
 * 
 * Multiplayer Mode:
 * - Game logic runs primarily on the server
 * - Server has authority over game state to prevent cheating
 * - Client only handles rendering and input
 * - Client performs prediction between server updates for responsive feel
 * - Uses WebSockets for real-time communication
 */
export default function ClientGame({ mode = "offline" }: ClientGameProps) {
  const [playerName, setPlayerName] = useState<string>("");
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [serverError, setServerError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const isMultiplayer = mode === "multiplayer";
  const router = useRouter();

  // Check server connection for multiplayer mode
  useEffect(() => {
    if (isMultiplayer) {
      const checkServerConnection = async () => {
        setIsChecking(true);
        try {
          // Get hostname dynamically
          const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
            `http://${hostname}:3002`;
          
          console.log(`Checking connection to game server at ${socketUrl}...`);
          const isReachable = await isServerReachable(socketUrl);
          
          if (!isReachable) {
            console.error("Game server is not reachable");
            setServerError("Unable to connect to the multiplayer server. Please try again later.");
            
            // Redirect to home after 5 seconds
            setTimeout(() => {
              router.push('/');
            }, 5000);
          } else {
            console.log("Successfully connected to game server");
          }
        } catch (error) {
          console.error("Error checking server connection:", error);
          setServerError("An error occurred while connecting to the multiplayer server");
          
          // Redirect to home after 5 seconds
          setTimeout(() => {
            router.push('/');
          }, 5000);
        } finally {
          setIsChecking(false);
        }
      };
      
      checkServerConnection();
    }
  }, [isMultiplayer, router]);

  // Set dimensions after component mounts (client-side only)
  useEffect(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleNameChange = useCallback((name: string) => {
    setPlayerName(name);
  }, []);

  const handleHeaderNameChange = useCallback((name: string) => {
    setPlayerName(name);
  }, []);

  // If checking server or server error occurred in multiplayer mode, show appropriate UI
  if (isMultiplayer && (isChecking || serverError)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-900 text-white">
        {isChecking ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Connecting to Multiplayer Server</h2>
            <p>Please wait while we establish a connection...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Connection Error</h2>
            <p className="text-center max-w-md mb-4">{serverError}</p>
            <p className="text-sm text-zinc-400">Redirecting to home page in a few seconds...</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Return to Home Now
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Floating semi-transparent header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <Suspense fallback={<div className="h-16 bg-background/50 backdrop-blur-sm border-b"></div>}>
          <GameHeader 
            onNameChange={handleHeaderNameChange} 
            initialName={playerName} 
            isMultiplayer={isMultiplayer}
          />
        </Suspense>
      </div>
      
      {/* Show a banner indicating the current mode */}
      {isMultiplayer && (
        <div className="absolute top-16 left-0 right-0 bg-primary/80 text-primary-foreground text-center py-1 text-sm z-10">
          Multiplayer Mode - Playing on Server
        </div>
      )}
      
      <main className="absolute inset-0">
        <Suspense fallback={<div className="w-full h-full bg-accent animate-pulse"></div>}>
          <GameCanvas 
            width={dimensions.width} 
            height={dimensions.height} 
            onPlayerNameChange={handleNameChange}
            forceOnlineMode={isMultiplayer}
          />
        </Suspense>
      </main>
    </div>
  );
} 