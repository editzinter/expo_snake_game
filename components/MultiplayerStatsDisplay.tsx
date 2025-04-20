"use client";

import { useState, useEffect, useCallback } from "react";
import { gameStatsClient, MultiplayerStats } from "@/lib/game/stats-client";
import { Trophy, Users, Swords, Target, Medal, BarChart, ShieldAlert, RefreshCw, TrendingUp, Calendar } from "lucide-react";

interface MultiplayerMatch {
  position: number;
  score: number;
  kills: number;
  date: string;
}

export default function MultiplayerStatsDisplay() {
  const [stats, setStats] = useState<MultiplayerStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<MultiplayerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to format date
  function formatDate(dateStr?: string): string {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch multiplayer stats
      console.log("Fetching multiplayer stats...");
      const multiplayerStats = await gameStatsClient.getMultiplayerStats();
      console.log("Multiplayer stats retrieved:", multiplayerStats);
      setStats(multiplayerStats);
      
      // Fetch recent multiplayer matches
      console.log("Fetching recent multiplayer matches...");
      const matchHistory = await gameStatsClient.getMultiplayerMatches(10);
      console.log("Recent multiplayer matches retrieved:", matchHistory);
      setRecentMatches(matchHistory);
    } catch (error) {
      console.error("Error fetching multiplayer data:", error);
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

  if (loading && !refreshing) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-8 bg-muted/60 w-48 rounded mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/40 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-indigo-500" size={24} />
            Multiplayer Stats
          </h2>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No multiplayer data available yet. Try playing some multiplayer games!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-indigo-500" size={24} />
            Multiplayer Stats
          </h2>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-accent/30 p-4 rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-500" size={18} />
              <h3 className="text-sm font-medium opacity-70">Wins</h3>
            </div>
            <p className="text-2xl font-bold">{stats.wins}</p>
          </div>
          
          <div className="bg-accent/30 p-4 rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Medal className="text-blue-500" size={18} />
              <h3 className="text-sm font-medium opacity-70">Highest Rank</h3>
            </div>
            <p className="text-2xl font-bold">#{stats.highestRank > 0 ? stats.highestRank : 'N/A'}</p>
          </div>
          
          <div className="bg-accent/30 p-4 rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Swords className="text-red-500" size={18} />
              <h3 className="text-sm font-medium opacity-70">Eliminations</h3>
            </div>
            <p className="text-2xl font-bold">{stats.totalKills}</p>
          </div>
          
          <div className="bg-accent/30 p-4 rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <BarChart className="text-green-500" size={18} />
              <h3 className="text-sm font-medium opacity-70">K/D Ratio</h3>
            </div>
            <p className="text-2xl font-bold">{stats.killDeathRatio}</p>
          </div>
        </div>

        {/* Additional stats in two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="text-purple-500" size={18} />
                <h3 className="font-medium">Average Rank</h3>
              </div>
              <p className="font-bold">
                {stats.averageRank > 0 ? `#${stats.averageRank.toFixed(1)}` : 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-red-500" size={18} />
                <h3 className="font-medium">Defeats</h3>
              </div>
              <p className="font-bold">{stats.defeats}</p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-500" size={18} />
                <h3 className="font-medium">Total Games</h3>
              </div>
              <p className="font-bold">{stats.totalGames}</p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-500" size={18} />
                <h3 className="font-medium">Win Rate</h3>
              </div>
              <p className="font-bold">
                {stats.totalGames > 0 
                  ? `${((stats.wins / stats.totalGames) * 100).toFixed(1)}%` 
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Multiplayer Matches */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-indigo-500" size={24} />
            Recent Matches
          </h2>
        </div>
        
        {recentMatches && recentMatches.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {recentMatches.map((match, index) => (
              <div key={index} className="flex items-center p-3 rounded-lg bg-accent/30">
                <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center mr-3">
                  <span className="font-bold text-muted-foreground">#{match.position || 'N/A'}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{match.score.toLocaleString()} points</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(match.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Swords size={12} />
                      {match.kills} eliminations
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-2">No match history yet</p>
            <p className="text-sm">Play your first multiplayer game to see your match history!</p>
          </div>
        )}
      </div>
    </div>
  );
} 