"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  Trophy, 
  Rocket, 
  PieChart, 
  Users, 
  Clock, 
  Award, 
  Zap,
  ArrowRight,
  GamepadIcon,
  BarChart
} from "lucide-react";
import ClientStatsDisplay from "@/components/ClientStatsDisplay";

// Define interface for PostgreSQL interval
interface PostgresInterval {
  hours?: number;
  minutes?: number;
  seconds?: number;
  days?: number;
  months?: number;
  years?: number;
}

// Helper function to format play time
function formatPlayTime(seconds?: number): string {
  if (!seconds) return "0m";
  
  console.log("Formatting play time from seconds:", seconds);
  
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  let formattedTime = "";
  
  if (days > 0) {
    formattedTime += `${days}d `;
  }
  
  if (hours > 0) {
    formattedTime += `${hours % 24}h `;
  }
  
  formattedTime += `${minutes % 60}m`;
  
  // For debugging
  console.log("Formatted play time:", {
    raw_seconds: seconds,
    total_minutes: minutes,
    total_hours: hours,
    days: days,
    formatted: formattedTime
  });
  
  return formattedTime;
}

// Helper function to format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
}

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }
  
  // Server-side data fetching (unlike the client utility)
  const { data: playerStats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  const { data: recentMatches } = await supabase
    .from('match_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);
    
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id);
    
  // Format the data
  const stats = {
    highScore: playerStats?.high_score || 0,
    gamesPlayed: playerStats?.games_played || 0,
    longestSnake: playerStats?.longest_snake || 0,
    totalPlayTime: playerStats?.total_play_time || 0,
    rankPosition: "#N/A", // Would require a more complex query
    achievements: achievements?.map(a => ({
      name: a.name,
      description: a.description,
      completed: true
    })) || [],
    recentMatches: recentMatches?.map(m => ({
      position: m.position || 0,
      score: m.score,
      date: m.created_at
    })) || []
  };

  // Add predefined achievements that aren't completed
  const allAchievements = [
    { name: "First Blood", description: "Defeat your first opponent" },
    { name: "Speed Demon", description: "Use boost 50 times" },
    { name: "Growing Pains", description: "Reach length 100" },
    { name: "Survivalist", description: "Play for 30 minutes without dying" }
  ];
  
  const completedAchievementNames = stats.achievements.map(a => a.name);
  
  allAchievements.forEach(achievement => {
    if (!completedAchievementNames.includes(achievement.name)) {
      stats.achievements.push({
        ...achievement,
        completed: false
      });
    }
  });

  // Extract username from email
  const username = user.email?.split('@')[0] || 'Player';

  // Check if database stats exist
  const hasServerStats = playerStats !== null;

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Hero section with welcome and play button */}
      <section className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-8">
        <div className="absolute inset-0 bg-black opacity-20 z-0"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome back, {username}!</h1>
            <p className="text-xl opacity-90 mb-4">Ready to slither your way to victory?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href="/game" 
                className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105 shadow-lg"
              >
                <GamepadIcon size={20} />
                Play Now
                <ArrowRight size={16} />
              </Link>
              <Link 
                href="/game/multiplayer" 
                className="inline-flex items-center gap-2 bg-indigo-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-800 transition-all transform hover:scale-105 shadow-lg"
              >
                <Users size={20} />
                Multiplayer
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Trophy size={64} className="text-yellow-300" />
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full filter blur-3xl opacity-30 -z-10 transform translate-x-1/4 translate-y-1/4"></div>
      </section>

      {/* Render stats based on whether server stats exist */}
      {hasServerStats ? (
        // Server stats section (original code)
        <>
          {/* Stats grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-yellow-500" size={20} />
                <h3 className="text-sm font-medium opacity-70">High Score</h3>
              </div>
              <p className="text-3xl font-bold">{stats.highScore.toLocaleString()}</p>
            </div>
            
            <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="text-blue-500" size={20} />
                <h3 className="text-sm font-medium opacity-70">Games Played</h3>
              </div>
              <p className="text-3xl font-bold">{stats.gamesPlayed}</p>
            </div>
            
            <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="text-purple-500" size={20} />
                <h3 className="text-sm font-medium opacity-70">Longest Snake</h3>
              </div>
              <p className="text-3xl font-bold">{stats.longestSnake}</p>
            </div>
            
            <div className="bg-accent/30 p-5 rounded-lg shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-green-500" size={20} />
                <h3 className="text-sm font-medium opacity-70">Play Time</h3>
              </div>
              <p className="text-3xl font-bold">{formatPlayTime(stats.totalPlayTime)}</p>
              <div className="mt-2 flex justify-end">
                <Link 
                  href="/protected/stats-debug" 
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Troubleshoot
                </Link>
              </div>
            </div>
          </section>

          {/* Two column layout for achievements and recent matches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Achievements section */}
            <section className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Award className="text-yellow-500" size={24} />
                  Achievements
                </h2>
                <span className="text-sm text-muted-foreground">
                  {stats.achievements.filter(a => a.completed).length}/{stats.achievements.length} Completed
                </span>
              </div>
              
              <div className="space-y-3">
                {stats.achievements.map((achievement, i) => (
                  <div key={i} className={`flex items-center p-3 rounded-lg ${achievement.completed ? 'bg-accent/50' : 'bg-muted/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${achievement.completed ? 'bg-green-500' : 'bg-muted'}`}>
                      {achievement.completed ? 
                        <Award size={16} className="text-white" /> : 
                        <Award size={16} className="text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${achievement.completed ? '' : 'text-muted-foreground'}`}>
                        {achievement.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent matches section */}
            <section className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="text-blue-500" size={24} />
                  Recent Matches
                </h2>
                <span className="text-sm text-muted-foreground">
                  Global Rank: {stats.rankPosition}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-xs text-muted-foreground mb-2 px-4">
                  <span>Position</span>
                  <span>Score</span>
                  <span>Date</span>
                </div>
                
                {stats.recentMatches.map((match, i) => (
                  <div key={i} className="grid grid-cols-3 py-3 px-4 rounded-lg bg-accent/30 items-center">
                    <span className="font-medium">#{match.position}</span>
                    <span>{match.score.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(match.date)}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row gap-2">
                  <Link 
                    href="/game" 
                    className="inline-flex flex-1 items-center justify-center gap-2 bg-primary text-primary-foreground font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Zap size={16} />
                    Play Again
                  </Link>
                  <Link 
                    href="/game/multiplayer" 
                    className="inline-flex flex-1 items-center justify-center gap-2 bg-accent text-accent-foreground font-medium py-2 px-4 rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    <Users size={16} />
                    Multiplayer
                  </Link>
                </div>
                <Link
                  href="/protected/multiplayer-stats"
                  className="inline-flex w-full mt-2 items-center justify-center gap-2 bg-muted/60 text-muted-foreground font-medium py-2 px-4 rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <BarChart size={16} />
                  View Multiplayer Stats
                </Link>
              </div>
            </section>
          </div>
        </>
      ) : (
        // Client-side stats display component
        <>
          <ClientStatsDisplay />
          
          {/* Add multiplayer stats button for client-side stats too */}
          <div className="mt-4">
            <Link
              href="/protected/multiplayer-stats"
              className="inline-flex w-full items-center justify-center gap-2 bg-muted/60 text-muted-foreground font-medium py-2 px-4 rounded-lg hover:bg-muted/80 transition-colors"
            >
              <BarChart size={16} />
              View Multiplayer Stats
            </Link>
          </div>
        </>
      )}

      {/* Tips and tricks section */}
      <section className="bg-card rounded-xl p-6 shadow-sm">
        <div className="flex items-center mb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            Pro Tips
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Boost for Speed</h3>
            <p className="text-sm text-muted-foreground">Press Space when your boost meter is full for a temporary speed boost!</p>
          </div>
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Corner Your Prey</h3>
            <p className="text-sm text-muted-foreground">Try to cut off other snakes by predicting their movement paths.</p>
          </div>
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Size Matters</h3>
            <p className="text-sm text-muted-foreground">Bigger snakes move slower but are worth more points when defeated.</p>
          </div>
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Stay Central</h3>
            <p className="text-sm text-muted-foreground">The center has more food, but also more competitors. Choose your strategy wisely!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
