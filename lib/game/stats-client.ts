import { createBrowserClient } from '@supabase/ssr';

// Fix cookie parsing issues by using a custom client creation function
const createSafeClient = () => {
  try {
    // Use default client with basic settings
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    
    // Force local storage mode
    if (typeof window !== 'undefined') {
      localStorage.setItem('forceLocalStorage', 'true');
      console.log("Forced local storage mode due to client creation error");
    }
    
    // Return a basic client that will be used only for checking auth status
    // but not for actual data operations (we'll use local storage instead)
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false, // Don't try to use cookies
          detectSessionInUrl: false // Don't try to detect session in URL
        }
      }
    );
  }
};

export interface GameStats {
  score: number;
  snakeLength: number;
  playTime?: number;
  position?: number;
  isMultiplayer?: boolean;
  kills?: number; // Track kills for multiplayer
}

export interface Achievement {
  name: string;
  description: string;
}

export interface MultiplayerStats {
  wins: number;
  defeats: number;
  totalGames: number;
  highestRank: number;
  averageRank: number;
  totalKills: number;
  killDeathRatio: number;
}

// Helper function to store local stats (when not authenticated)
const saveLocalStats = (stats: GameStats) => {
  try {
    // Get existing stats
    const storedStats = localStorage.getItem('localPlayerStats');
    console.log("Current local stats:", storedStats);
    
    let playerStats = storedStats ? JSON.parse(storedStats) : {
      high_score: 0,
      games_played: 0,
      longest_snake: 0,
      total_play_time: 0,
      last_played: new Date().toISOString()
    };
    
    // Update stats with new data
    playerStats.high_score = Math.max(playerStats.high_score, stats.score);
    playerStats.games_played += 1;
    playerStats.longest_snake = Math.max(playerStats.longest_snake, stats.snakeLength);
    playerStats.total_play_time += stats.playTime || 0;
    playerStats.last_played = new Date().toISOString();
    
    console.log("Updated local stats:", playerStats);
    
    // Save back to localStorage
    localStorage.setItem('localPlayerStats', JSON.stringify(playerStats));
    
    // Also save match history
    const storedMatches = localStorage.getItem('localMatchHistory');
    let matches = storedMatches ? JSON.parse(storedMatches) : [];
    
    // Add new match to beginning of array
    const newMatch = {
      score: stats.score,
      snake_length: stats.snakeLength,
      play_time: stats.playTime || 0,
      created_at: new Date().toISOString()
    };
    
    console.log("Adding new match to history:", newMatch);
    matches.unshift(newMatch);
    
    // Keep only last 5 matches
    if (matches.length > 5) {
      matches = matches.slice(0, 5);
    }
    
    localStorage.setItem('localMatchHistory', JSON.stringify(matches));
    
    // Show notification
    if (typeof window !== 'undefined') {
      // Display stats update on screen
      const statsDisplay = document.createElement('div');
      statsDisplay.style.position = 'fixed';
      statsDisplay.style.bottom = '20px';
      statsDisplay.style.left = '50%';
      statsDisplay.style.transform = 'translateX(-50%)';
      statsDisplay.style.padding = '10px 20px';
      statsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      statsDisplay.style.color = '#fff';
      statsDisplay.style.borderRadius = '5px';
      statsDisplay.style.zIndex = '9999';
      statsDisplay.style.fontFamily = 'sans-serif';
      statsDisplay.innerHTML = `
        <strong>Stats Updated</strong><br>
        Score: ${stats.score} | Snake Length: ${stats.snakeLength}<br>
        High Score: ${playerStats.high_score} | Games Played: ${playerStats.games_played}
      `;
      
      document.body.appendChild(statsDisplay);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (statsDisplay.parentNode) {
          statsDisplay.parentNode.removeChild(statsDisplay);
        }
      }, 3000);
    }
    
    console.log("Local stats saved successfully");
    return true;
  } catch (e) {
    console.error("Error saving local stats:", e);
    return false;
  }
};

// This function is no longer used for determining whether to use Supabase
// It now only checks if the environment variable is set to force local storage
const shouldForceLocalStorage = () => {
  try {
    // First check if we're forcing local-only mode via env var
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FORCE_LOCAL_STORAGE === 'true') {
      console.log("Force using local storage from environment variable");
      return true;
    }
    
    // Then check if we're forcing local-only mode via localStorage
    const forceLocalOnly = localStorage.getItem('forceLocalStorage') === 'true';
    if (forceLocalOnly) {
      console.log("Force using local storage only mode is enabled - clearing flag");
      // Clear the flag so it doesn't persist
      localStorage.removeItem('forceLocalStorage');
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("Error checking localStorage for force local storage setting:", e);
    return false;
  }
};

// Test database connection function - can be called to debug connection issues
export const testDatabaseConnection = async () => {
  try {
    const supabase = createSafeClient();
    
    // Step 1: Check session
    console.log("Testing database connection...");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log("Session check result:", {
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id,
      error: sessionError
    });
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      return { success: false, error: sessionError };
    }
    
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      console.error("No user ID found in session");
      return { success: false, error: "No user ID in session" };
    }
    
    // Step 2: Test simple query
    console.log("Testing table access...");
    
    // Try to query match_history table
    const { data: matchHistoryData, error: matchHistoryError } = await supabase
      .from('match_history')
      .select('count(*)')
      .limit(1);
    
    console.log("Match history table test:", {
      success: !matchHistoryError,
      data: matchHistoryData,
      error: matchHistoryError
    });
    
    // Try to query player_stats table  
    const { data: playerStatsData, error: playerStatsError } = await supabase
      .from('player_stats')
      .select('count(*)')
      .limit(1);
    
    console.log("Player stats table test:", {
      success: !playerStatsError,
      data: playerStatsData,
      error: playerStatsError
    });
    
    // Return overall status
    if (matchHistoryError || playerStatsError) {
      return { 
        success: false, 
        error: matchHistoryError || playerStatsError,
        matchHistoryResult: { data: matchHistoryData, error: matchHistoryError },
        playerStatsResult: { data: playerStatsData, error: playerStatsError }
      };
    }
    
    return { 
      success: true, 
      userId,
      matchHistoryResult: { data: matchHistoryData, error: matchHistoryError },
      playerStatsResult: { data: playerStatsData, error: playerStatsError }
    };
  } catch (error) {
    console.error("Test connection error:", error);
    return { success: false, error };
  }
};

// Add function to display stats
export const displayStats = () => {
  try {
    const localStats = localStorage.getItem('localPlayerStats');
    if (!localStats) {
      console.log("No local stats found");
      return null;
    }
    
    const stats = JSON.parse(localStats);
    console.log("Player stats:", stats);
    
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.right = '0';
    modalOverlay.style.bottom = '0';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '9999';
    modalOverlay.style.backdropFilter = 'blur(5px)';
    modalOverlay.style.transition = 'opacity 0.3s ease';
    
    // Create modal content
    const statsModal = document.createElement('div');
    statsModal.style.width = '350px';
    statsModal.style.backgroundColor = '#1f2937';
    statsModal.style.borderRadius = '16px';
    statsModal.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
    statsModal.style.overflow = 'hidden';
    statsModal.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    statsModal.style.transform = 'scale(0.95)';
    statsModal.style.transition = 'transform 0.3s ease';
    
    // Modal header
    const header = document.createElement('div');
    header.style.backgroundColor = '#111827';
    header.style.padding = '20px';
    header.style.borderBottom = '1px solid #374151';
    
    const title = document.createElement('h2');
    title.textContent = 'Game Over - Your Stats';
    title.style.margin = '0';
    title.style.color = '#ffffff';
    title.style.fontSize = '1.25rem';
    title.style.fontWeight = '700';
    title.style.textAlign = 'center';
    
    header.appendChild(title);
    
    // Format time for better display
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      } else {
        return `${remainingSeconds}s`;
      }
    };
    
    // Stats content
    const content = document.createElement('div');
    content.style.padding = '20px';
    
    const statItems = [
      { label: 'High Score', value: stats.high_score.toLocaleString() },
      { label: 'Games Played', value: stats.games_played.toLocaleString() },
      { label: 'Longest Snake', value: `${stats.longest_snake} segments` },
      { label: 'Total Play Time', value: formatTime(stats.total_play_time) },
      { label: 'Last Played', value: new Date(stats.last_played).toLocaleString() }
    ];
    
    // Multiplayer stats if available
    if (stats.multiplayer_games && stats.multiplayer_games > 0) {
      statItems.push(
        { label: 'Multiplayer Games', value: stats.multiplayer_games.toLocaleString() },
        { label: 'Multiplayer Kills', value: (stats.multiplayer_kills || 0).toLocaleString() }
      );
      
      if (stats.multiplayer_wins && stats.multiplayer_wins > 0) {
        statItems.push({ label: 'Multiplayer Wins', value: stats.multiplayer_wins.toLocaleString() });
      }
    }
    
    statItems.forEach(item => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.marginBottom = '12px';
      row.style.padding = '8px';
      row.style.borderRadius = '8px';
      row.style.backgroundColor = '#374151';
      
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.color = '#d1d5db';
      label.style.fontWeight = '500';
      
      const value = document.createElement('span');
      value.textContent = item.value;
      value.style.color = '#ffffff';
      value.style.fontWeight = '700';
      
      row.appendChild(label);
      row.appendChild(value);
      content.appendChild(row);
    });
    
    // Create footer with buttons
    const footer = document.createElement('div');
    footer.style.padding = '20px';
    footer.style.borderTop = '1px solid #374151';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'center';
    footer.style.gap = '10px';
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.style.backgroundColor = '#4f46e5';
    playAgainBtn.style.color = '#ffffff';
    playAgainBtn.style.border = 'none';
    playAgainBtn.style.padding = '8px 16px';
    playAgainBtn.style.borderRadius = '6px';
    playAgainBtn.style.fontWeight = '600';
    playAgainBtn.style.fontSize = '0.875rem';
    playAgainBtn.style.cursor = 'pointer';
    playAgainBtn.style.transition = 'background-color 0.2s';
    
    playAgainBtn.onmouseover = () => {
      playAgainBtn.style.backgroundColor = '#4338ca';
    };
    
    playAgainBtn.onmouseout = () => {
      playAgainBtn.style.backgroundColor = '#4f46e5';
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.backgroundColor = '#1f2937';
    closeBtn.style.color = '#d1d5db';
    closeBtn.style.border = '1px solid #374151';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.fontWeight = '600';
    closeBtn.style.fontSize = '0.875rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.transition = 'background-color 0.2s';
    
    closeBtn.onmouseover = () => {
      closeBtn.style.backgroundColor = '#374151';
    };
    
    closeBtn.onmouseout = () => {
      closeBtn.style.backgroundColor = '#1f2937';
    };
    
    // Event listeners for buttons
    playAgainBtn.onclick = () => {
      document.body.removeChild(modalOverlay);
      
      // Trigger a click event on the canvas to restart the game
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
    };
    
    closeBtn.onclick = () => {
      document.body.removeChild(modalOverlay);
    };
    
    // Close when clicking outside modal
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay);
      }
    };
    
    footer.appendChild(playAgainBtn);
    footer.appendChild(closeBtn);
    
    // Assemble modal
    statsModal.appendChild(header);
    statsModal.appendChild(content);
    statsModal.appendChild(footer);
    modalOverlay.appendChild(statsModal);
    
    // Add to body
    document.body.appendChild(modalOverlay);
    
    // Animation effect
    setTimeout(() => {
      statsModal.style.transform = 'scale(1)';
    }, 10);
    
    return stats;
  } catch (e) {
    console.error("Error displaying stats:", e);
    return null;
  }
};

// Helper function to check if user is authenticated
async function isAuthenticated(): Promise<boolean> {
  try {
    // Use the createSafeClient instead of createBrowserClient for more reliable results
    const supabase = createSafeClient();
    
    // Try session check first (more reliable)
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData?.session?.user;
    
    console.log("Auth check from isAuthenticated - session exists:", hasSession);
    
    if (hasSession) {
      return true;
    }
    
    // Fallback to getUser
    const { data } = await supabase.auth.getUser();
    const hasUser = !!data.user;
    
    console.log("Auth check from isAuthenticated - user exists:", hasUser);
    
    return hasUser;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

// Helper function to record match to local storage
function recordMatchLocal(stats: GameStats): void {
  saveLocalStats(stats);
  
  // Call displayStats to show current stats
  setTimeout(() => {
    displayStats();
  }, 1000);
}

export const gameStatsClient = {
  async recordMatch(stats: GameStats): Promise<void> {
    console.log("Recording match:", stats);
    
    // Force isMultiplayer to be a boolean
    stats.isMultiplayer = !!stats.isMultiplayer;
    
    // Try to save to database if authenticated
    if (await isAuthenticated()) {
      try {
        console.log("Authenticated! Attempting to save match to database...");
        
        // Use createSafeClient instead of createBrowserClient for more reliable results
        const supabase = createSafeClient();
        
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        if (!userId) {
          console.log("No authenticated user found in session, trying getUser...");
          const { data: userData } = await supabase.auth.getUser();
          
          if (!userData?.user) {
            console.log("No authenticated user found, falling back to local storage");
            recordMatchLocal(stats);
            return;
          }
        }
        
        // Get the user ID from session or user data
        const user = sessionData?.session?.user || (await supabase.auth.getUser()).data.user;
        
        if (!user) {
          console.log("No authenticated user found, falling back to local storage");
          recordMatchLocal(stats);
          return;
        }
        
        console.log("User found:", user.id, "- continuing with database save");
        
        // Get current stats
        const { data: currentStats, error: fetchError } = await supabase
          .from('player_stats')
          .select()
          .eq('user_id', user.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Error fetching player stats:", fetchError);
          recordMatchLocal(stats);
          return;
        }
        
        // Make sure we have a valid play time value
        const playTime = typeof stats.playTime === 'number' ? stats.playTime : 0;
        console.log("Play time to be recorded:", playTime, "seconds");
        console.log("isMultiplayer flag value:", stats.isMultiplayer);
        
        if (currentStats) {
          console.log("Current player stats:", {
            current_total_play_time: currentStats.total_play_time || 0,
            adding_play_time: playTime,
            new_total: (currentStats.total_play_time || 0) + playTime,
            current_multiplayer_games: currentStats.multiplayer_games || 0,
            is_recording_multiplayer: stats.isMultiplayer
          });
          
          // Initialize total_play_time if it doesn't exist
          if (typeof currentStats.total_play_time !== 'number') {
            currentStats.total_play_time = 0;
            console.log("Initializing missing total_play_time to 0");
          }
          
          // Update existing stats
          const updates = {
            games_played: currentStats.games_played + 1,
            high_score: Math.max(currentStats.high_score || 0, stats.score),
            longest_snake: Math.max(currentStats.longest_snake || 0, stats.snakeLength),
            total_play_time: currentStats.total_play_time + playTime,
            last_played: new Date().toISOString(),
            // Update multiplayer stats if applicable
            multiplayer_games: stats.isMultiplayer 
              ? (currentStats.multiplayer_games || 0) + 1 
              : (currentStats.multiplayer_games || 0),
            multiplayer_wins: stats.isMultiplayer && stats.position === 1
              ? (currentStats.multiplayer_wins || 0) + 1
              : (currentStats.multiplayer_wins || 0),
            multiplayer_kills: stats.isMultiplayer
              ? (currentStats.multiplayer_kills || 0) + (stats.kills || 0)
              : (currentStats.multiplayer_kills || 0),
            multiplayer_deaths: stats.isMultiplayer
              ? (currentStats.multiplayer_deaths || 0) + 1
              : (currentStats.multiplayer_deaths || 0),
          };
          
          // Update the player_stats table
          const { error: updateError } = await supabase
            .from('player_stats')
            .update(updates)
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error("Error updating player stats:", updateError);
            recordMatchLocal(stats);
            return;
          }
          
          console.log("Updated player stats successfully with new play time total:", updates.total_play_time);
        } else {
          // Create new stats
          const newStats = {
            user_id: user.id,
            games_played: 1,
            high_score: stats.score,
            longest_snake: stats.snakeLength,
            total_play_time: playTime,
            last_played: new Date().toISOString(),
            multiplayer_games: stats.isMultiplayer ? 1 : 0,
            multiplayer_wins: stats.isMultiplayer && stats.position === 1 ? 1 : 0,
            multiplayer_kills: stats.isMultiplayer ? (stats.kills || 0) : 0,
            multiplayer_deaths: stats.isMultiplayer ? 1 : 0,
          };
          
          console.log("Creating new player stats with initial play time:", playTime);
          
          const { error: insertError } = await supabase
            .from('player_stats')
            .insert(newStats);
          
          if (insertError) {
            console.error("Error inserting player stats:", insertError);
            recordMatchLocal(stats);
            return;
          }
          
          console.log("Created new player stats successfully");
        }
        
        // Record the match history
        const { error: matchError } = await supabase
          .from('match_history')
          .insert({
            user_id: user.id,
            score: stats.score,
            length: stats.snakeLength,
            play_time: playTime,
            position: stats.position,
            is_multiplayer: stats.isMultiplayer,
            kills: stats.kills || 0
          });
        
        if (matchError) {
          console.error("Error recording match history:", matchError);
        } else {
          console.log("Match history recorded successfully");
        }
        
        console.log("Match recorded in database successfully");
      } catch (error) {
        console.error("Error recording match to database:", error);
        recordMatchLocal(stats);
      }
    } else {
      // Not authenticated, save to local storage
      recordMatchLocal(stats);
    }
  },
  
  async unlockAchievement(achievement: Achievement) {
    // Always save achievement locally first for redundancy
    const storedAchievements = localStorage.getItem('localAchievements');
    let achievements = storedAchievements ? JSON.parse(storedAchievements) : [];
    
    if (!achievements.some((a: { name: string }) => a.name === achievement.name)) {
      achievements.push({
        ...achievement,
        completed_at: new Date().toISOString()
      });
      localStorage.setItem('localAchievements', JSON.stringify(achievements));
      console.log(`Achievement "${achievement.name}" saved locally`);
    }
    
    // Check if we're in force local storage mode from env var only
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FORCE_LOCAL_STORAGE === 'true') {
      console.log("Using local storage only mode for achievements (env var)");
      return;
    }
    
    // Always attempt to save to Supabase
    try {
      console.log(`Attempting to save achievement "${achievement.name}" to Supabase...`);
      
      // Create Supabase client
      const supabase = createSafeClient();
      
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      console.log("Achievement auth check:", {
        hasSession: !!sessionData?.session,
        userId: userId
      });
      
      if (!userId) {
        console.log("No authenticated session, achievement saved locally only");
        return;
      }
      
      // Check if achievement already exists in Supabase
      const { data: existingAchievement } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('name', achievement.name)
        .single();
      
      // If it doesn't exist, insert it
      if (!existingAchievement) {
        try {
          const { error } = await supabase.from('achievements').insert({
            user_id: userId,
            name: achievement.name,
            description: achievement.description
          });
          
          if (error) {
            console.error("Error saving achievement to Supabase:", error);
            return;
          }
          
          console.log(`Achievement "${achievement.name}" saved to Supabase`);
        } catch (error) {
          console.error("Error inserting achievement:", error);
        }
      } else {
        console.log(`Achievement "${achievement.name}" already exists in Supabase`);
      }
    } catch (error) {
      console.error("Error processing achievement:", error);
    }
  },
  
  async getPlayerStats() {
    // Get local stats first
    let localStats = null;
    try {
      const localStatsStr = localStorage.getItem('localPlayerStats');
      if (localStatsStr) {
        localStats = JSON.parse(localStatsStr);
        console.log("Retrieved local stats:", localStats);
      } else {
        console.log("No local stats found");
      }
    } catch (error) {
      console.error("Error getting local player stats:", error);
    }
    
    // Also try to get stats from Supabase
    try {
      console.log("Attempting to fetch player stats from Supabase...");
      const supabase = createSafeClient();
      
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        console.log("No authenticated user, returning local stats only");
        return localStats;
      }
      
      // Fetch stats from Supabase
      const { data: dbStats, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching stats from Supabase:", error);
        return localStats;
      }
      
      if (dbStats) {
        console.log("Retrieved stats from Supabase:", dbStats);
        
        // Merge with local stats if needed (taking the higher value for each stat)
        if (localStats) {
          console.log("Merging Supabase stats with local stats");
          return {
            high_score: Math.max(dbStats.high_score || 0, localStats.high_score || 0),
            games_played: Math.max(dbStats.games_played || 0, localStats.games_played || 0),
            longest_snake: Math.max(dbStats.longest_snake || 0, localStats.longest_snake || 0),
            total_play_time: Math.max(dbStats.total_play_time || 0, localStats.total_play_time || 0),
            last_played: new Date(Math.max(
              new Date(dbStats.last_played || 0).getTime(),
              new Date(localStats.last_played || 0).getTime()
            )).toISOString()
          };
        }
        
        return dbStats;
      }
      
      console.log("No stats found in Supabase, returning local stats");
      return localStats;
    } catch (error) {
      console.error("Error retrieving stats from Supabase:", error);
      return localStats;
    }
  },
  
  async getRecentMatches(limit = 5) {
    // Get local matches first
    let localMatches = [];
    try {
      const localMatchesStr = localStorage.getItem('localMatchHistory');
      if (localMatchesStr) {
        localMatches = JSON.parse(localMatchesStr);
        console.log("Retrieved local matches:", localMatches);
      } else {
        console.log("No local match history found");
      }
    } catch (error) {
      console.error("Error getting local match history:", error);
    }
    
    // Also try to get matches from Supabase
    try {
      console.log("Attempting to fetch match history from Supabase...");
      const supabase = createSafeClient();
      
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        console.log("No authenticated user, returning local matches only");
        return localMatches.slice(0, limit);
      }
      
      // Fetch matches from Supabase
      const { data: dbMatches, error } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error("Error fetching matches from Supabase:", error);
        return localMatches.slice(0, limit);
      }
      
      if (dbMatches && dbMatches.length > 0) {
        console.log("Retrieved matches from Supabase:", dbMatches);
        
        // Format the Supabase match data to match local format
        const formattedDbMatches = dbMatches.map(match => ({
          position: match.position || 0,
          score: match.score,
          date: match.created_at
        }));
        
        // Merge with local matches
        if (localMatches.length > 0) {
          console.log("Merging Supabase matches with local matches");
          
          // Combine both sets of matches
          const allMatches = [...formattedDbMatches, ...localMatches];
          
          // Sort by date (newest first)
          allMatches.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          // Remove duplicates (based on date/time being very close)
          const uniqueMatches = [];
          const usedTimes = new Set<string>();
          
          for (const match of allMatches) {
            const dateTime = new Date(match.date).getTime();
            // Check if there's already a match within 5 seconds
            let isDuplicate = false;
            
            // Convert Set to Array for iteration
            const timeArray = Array.from(usedTimes);
            for (const timeStr of timeArray) {
              const time = parseInt(timeStr);
              if (Math.abs(time - dateTime) < 5000) { // Within 5 seconds
                isDuplicate = true;
                break;
              }
            }
            
            if (!isDuplicate) {
              usedTimes.add(dateTime.toString());
              uniqueMatches.push(match);
            }
          }
          
          return uniqueMatches.slice(0, limit);
        }
        
        return formattedDbMatches;
      }
      
      console.log("No matches found in Supabase, returning local matches");
      return localMatches.slice(0, limit);
    } catch (error) {
      console.error("Error retrieving matches from Supabase:", error);
      return localMatches.slice(0, limit);
    }
  },
  
  async getAchievements() {
    // Get local achievements first
    let localAchievements = [];
    try {
      const localAchievementsStr = localStorage.getItem('localAchievements');
      if (localAchievementsStr) {
        localAchievements = JSON.parse(localAchievementsStr);
        console.log("Retrieved local achievements:", localAchievements);
      } else {
        console.log("No local achievements found");
      }
    } catch (error) {
      console.error("Error getting local achievements:", error);
    }
    
    // Also try to get achievements from Supabase
    try {
      console.log("Attempting to fetch achievements from Supabase...");
      const supabase = createSafeClient();
      
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        console.log("No authenticated user, returning local achievements only");
        return localAchievements;
      }
      
      // Fetch achievements from Supabase
      const { data: dbAchievements, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error("Error fetching achievements from Supabase:", error);
        return localAchievements;
      }
      
      if (dbAchievements && dbAchievements.length > 0) {
        console.log("Retrieved achievements from Supabase:", dbAchievements);
        
        // Format the Supabase achievement data to match local format
        const formattedDbAchievements = dbAchievements.map(achievement => ({
          name: achievement.name,
          description: achievement.description,
          completed: true,
          completed_at: achievement.created_at
        }));
        
        // Merge with local achievements
        if (localAchievements.length > 0) {
          console.log("Merging Supabase achievements with local achievements");
          
          // Create a map of achievement names to avoid duplicates
          const achievementMap = new Map<string, any>();
          
          // Add Supabase achievements first (they take priority)
          formattedDbAchievements.forEach((achievement: any) => {
            achievementMap.set(achievement.name, achievement);
          });
          
          // Add local achievements that aren't in Supabase
          localAchievements.forEach((achievement: any) => {
            if (!achievementMap.has(achievement.name)) {
              achievementMap.set(achievement.name, achievement);
            }
          });
          
          // Convert map back to array
          return Array.from(achievementMap.values());
        }
        
        return formattedDbAchievements;
      }
      
      console.log("No achievements found in Supabase, returning local achievements");
      return localAchievements;
    } catch (error) {
      console.error("Error retrieving achievements from Supabase:", error);
      return localAchievements;
    }
  },
  
  // Get multiplayer stats for the current user
  async getMultiplayerStats(): Promise<MultiplayerStats | null> {
    // Try to get from database if authenticated
    try {
      console.log("Retrieving multiplayer stats...");
      
      const supabase = createSafeClient();
      
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        console.log("No authenticated user found for multiplayer stats");
        return null;
      }
      
      // Query the database for player_stats
      const { data: playerStats, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching player stats for multiplayer:", error);
        return null;
      }
      
      if (!playerStats) {
        console.log("No player stats found for multiplayer");
        return null;
      }
      
      console.log("Retrieved multiplayer stats:", playerStats);
      
      // Calculate additional stats
      // Fetch all match history to get highest position
      const { data: matches, error: matchError } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_multiplayer', true)
        .order('created_at', { ascending: false });
      
      if (matchError) {
        console.error("Error fetching match history for multiplayer:", matchError);
        // Continue with partial stats
      }
      
      // Calculate highest and average rank
      let highestRank = 999;
      let totalRank = 0;
      let rankCount = 0;
      
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          if (match.position) {
            highestRank = Math.min(highestRank, match.position);
            totalRank += match.position;
            rankCount++;
          }
        });
      }
      
      // Avoid division by zero
      const averageRank = rankCount > 0 ? totalRank / rankCount : 0;
      
      // Calculate kills from multiplayer_kills field or sum from matches if available
      let kills = playerStats.multiplayer_kills || 0;
      
      // If multiplayer_kills is not available, try to sum from matches
      if (!playerStats.multiplayer_kills && matches && matches.length > 0) {
        kills = matches.reduce((total, match) => total + (match.kills || 0), 0);
      }
      
      const deaths = playerStats.multiplayer_deaths || 0;
      const kdr = deaths > 0 ? kills / deaths : kills;
      
      // For debugging
      console.log("Calculated multiplayer stats:", {
        games: playerStats.multiplayer_games || 0,
        wins: playerStats.multiplayer_wins || 0,
        kills,
        deaths,
        kdr,
        highestRank: highestRank !== 999 ? highestRank : 0,
        averageRank: averageRank || 0
      });
      
      return {
        wins: playerStats.multiplayer_wins || 0,
        defeats: (playerStats.multiplayer_games || 0) - (playerStats.multiplayer_wins || 0),
        totalGames: playerStats.multiplayer_games || 0,
        highestRank: highestRank !== 999 ? highestRank : 0,
        averageRank: averageRank || 0,
        totalKills: kills,
        killDeathRatio: parseFloat(kdr.toFixed(2))
      };
    } catch (error) {
      console.error("Error getting multiplayer stats:", error);
      return null;
    }
  },

  // Get multiplayer match history
  async getMultiplayerMatches(limit = 10) {
    try {
      console.log("Attempting to fetch multiplayer match history...");
      const supabase = createSafeClient();
      
      // Get the current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      if (!userId) {
        console.log("No authenticated user, returning empty multiplayer matches");
        return [];
      }
      
      // Fetch matches from Supabase
      const { data: matches, error } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_multiplayer', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error("Error fetching multiplayer matches:", error);
        return [];
      }
      
      if (matches && matches.length > 0) {
        console.log("Retrieved multiplayer matches:", matches);
        
        // Format the Supabase match data
        const formattedMatches = matches.map(match => ({
          position: match.position || 0,
          score: match.score,
          kills: match.kills || 0,
          date: match.created_at
        }));
        
        return formattedMatches;
      }
      
      console.log("No multiplayer matches found");
      return [];
    } catch (error) {
      console.error("Error retrieving multiplayer matches:", error);
      return [];
    }
  }
};
