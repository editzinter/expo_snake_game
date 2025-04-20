"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Database, Wrench } from "lucide-react";
import { ensurePlayTimeField } from "@/app/actions";

export default async function StatsDebugPage(props: { 
  searchParams: Promise<{ fix?: string }> 
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  let fixResult = { success: false, message: "" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Server-side data fetching
  const { data: playerStats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Run fix if requested
  if (searchParams.fix === "play-time") {
    fixResult = await ensurePlayTimeField();
  }

  // Extract username from email
  const username = user.email?.split('@')[0] || 'Player';

  // Format play time for display
  function formatTime(seconds?: number): string {
    if (!seconds && seconds !== 0) return "undefined";
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m (${seconds}s)` : `${minutes}m (${seconds}s)`;
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <section className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-slate-600 to-slate-800 text-white p-8">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Stats Debug Panel</h1>
            <p className="text-xl opacity-90 mb-4">Diagnose and fix play time tracking issues for {username}</p>
            <Link
              href="/protected"
              className="inline-flex items-center gap-2 bg-white/20 text-white font-medium py-2 px-4 rounded-lg hover:bg-white/30 transition-all"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Wrench size={32} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Fix result message */}
      {searchParams.fix && (
        <div className={`p-4 rounded-lg ${fixResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <p className="font-medium">Fix attempt result: {fixResult.message}</p>
        </div>
      )}

      {/* Database Information */}
      <section className="bg-card rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="text-blue-500" size={24} />
          Database Values
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Raw Total Play Time Value</p>
              <p className="font-mono text-lg">
                {playerStats?.total_play_time !== undefined ? 
                  playerStats.total_play_time.toString() : 'null'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This is the raw value stored in the database (in seconds)
              </p>
            </div>
            
            <div className="p-4 bg-accent/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Formatted Play Time</p>
              <p className="font-mono text-lg">
                {formatTime(playerStats?.total_play_time)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This is how the play time is displayed in the UI
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-accent/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Database Column Type</p>
            <p className="font-mono text-lg">
              {typeof playerStats?.total_play_time === 'number' ? 'integer' : 
                playerStats?.total_play_time === null ? 'NULL' : 
                typeof playerStats?.total_play_time}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The column type should be integer to properly store seconds
            </p>
          </div>
          
          <div className="p-4 bg-accent/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Full Player Stats Object</p>
            <pre className="font-mono text-xs overflow-auto p-2 bg-muted/40 rounded max-h-60">
              {JSON.stringify(playerStats, null, 2)}
            </pre>
          </div>
        </div>
      </section>

      {/* Debug Actions */}
      <section className="bg-card rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Wrench className="text-orange-500" size={24} />
          Debug Actions
        </h2>
        
        <div className="space-y-2">
          <Link 
            href="/protected/stats-debug?fix=play-time"
            className="inline-flex w-full items-center justify-center gap-2 bg-orange-100 text-orange-800 font-medium py-3 px-4 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <Clock size={16} />
            Fix Play Time Tracking
          </Link>
          
          <Link 
            href="/protected"
            className="inline-flex w-full items-center justify-center gap-2 bg-muted text-muted-foreground font-medium py-3 px-4 rounded-lg hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft size={16} />
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
} 