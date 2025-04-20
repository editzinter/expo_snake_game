"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, PieChart, Rocket, Clock, Award, Users, RefreshCw } from "lucide-react";
import { gameStatsClient } from "@/lib/game/stats-client";

// Define types for stats
interface PlayerStats {
  high_score?: number;
  games_played?: number;
  longest_snake?: number;
  total_play_time?: number;
  last_played?: string;
}

interface Achievement {
  name: string;
  description: string;
  completed: boolean;
  completed_at?: string;
}

interface MatchResult {
  position: number;
  score: number;
  date: string;
}

export default function ClientStatsDisplay() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to format play time
  function formatPlayTime(seconds?: number): string {
    if (!seconds) return "0m";
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  // Helper function to format date
  function formatDate(dateStr?: string): string {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Get player stats from gameStatsClient
      console.log("Fetching player stats...");
      const playerStats = await gameStatsClient.getPlayerStats();
      console.log("Player stats fetched:", playerStats);
      setStats(playerStats);
      
      // Get achievements from gameStatsClient
      console.log("Fetching achievements...");
      const playerAchievements = await gameStatsClient.getAchievements();
      console.log("Achievements fetched:", playerAchievements);
      setAchievements(playerAchievements);
      
      // Get recent matches from gameStatsClient
      console.log("Fetching recent matches...");
      const matchHistory = await gameStatsClient.getRecentMatches(10); // Increased from 5 to 10
      console.log("Recent matches fetched:", matchHistory);
      setRecentMatches(matchHistory);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Add predefined achievements that aren't completed
  const allAchievements = [
    { name: "First Blood", description: "Defeat your first opponent" },
    { name: "Speed Demon", description: "Use boost 50 times" },
    { name: "Growing Pains", description: "Reach length 100" },
    { name: "Survivalist", description: "Play for 30 minutes without dying" }
  ];
  
  // Merge predefined and completed achievements
  const mergedAchievements = [...achievements];
  const completedAchievementNames = achievements.map(a => a.name);
  
  allAchievements.forEach(achievement => {
    if (!completedAchievementNames.includes(achievement.name)) {
      mergedAchievements.push({
        ...achievement,
        completed: false
      });
    }
  });

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      {/* Stats grid with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Stats</h2>
        <button 
          onClick={handleRefresh}
          className="p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-yellow-500" size={20} />
            <h3 className="text-sm font-medium opacity-70">High Score</h3>
          </div>
          <p className="text-3xl font-bold">{stats?.high_score?.toLocaleString() || 0}</p>
        </div>
        
        <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="text-blue-500" size={20} />
            <h3 className="text-sm font-medium opacity-70">Games Played</h3>
          </div>
          <p className="text-3xl font-bold">{stats?.games_played || 0}</p>
        </div>
        
        <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="text-purple-500" size={20} />
            <h3 className="text-sm font-medium opacity-70">Longest Snake</h3>
          </div>
          <p className="text-3xl font-bold">{stats?.longest_snake || 0}</p>
        </div>
        
        <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-green-500" size={20} />
            <h3 className="text-sm font-medium opacity-70">Play Time</h3>
          </div>
          <p className="text-3xl font-bold">{formatPlayTime(stats?.total_play_time)}</p>
        </div>
      </section>

      {/* Two column layout for achievements and recent matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Achievements */}
        <section className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="text-amber-500" size={24} />
              Achievements
            </h2>
            <span className="text-xs bg-accent/50 px-2 py-1 rounded-full">
              {mergedAchievements.filter(a => a.completed).length}/{mergedAchievements.length}
            </span>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {mergedAchievements.map((achievement, index) => (
              <div key={index} className={`flex items-center p-3 rounded-lg ${achievement.completed ? 'bg-success/10' : 'bg-accent/30'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${achievement.completed ? 'bg-success/20 text-success' : 'bg-accent/50 text-muted-foreground'}`}>
                  <Award size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{achievement.name}</h3>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${achievement.completed ? 'bg-success' : 'bg-accent/50'}`}></div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Recent Matches */}
        <section className="bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-indigo-500" size={24} />
              Recent Matches
            </h2>
          </div>
          
          {recentMatches && recentMatches.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {recentMatches.map((match, index) => (
                <div key={index} className="flex items-center p-3 rounded-lg bg-accent/30">
                  <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center mr-3">
                    <span className="font-bold text-muted-foreground">#{match.position}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{match.score.toLocaleString()} points</h3>
                    <p className="text-xs text-muted-foreground">{formatDate(match.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-2">No match history yet</p>
              <p className="text-sm">Play your first game to see your match history!</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
} 