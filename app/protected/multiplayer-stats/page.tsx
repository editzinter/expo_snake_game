"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MultiplayerStatsDisplay from "@/components/MultiplayerStatsDisplay";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

export default async function MultiplayerStatsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Extract username from email
  const username = user.email?.split('@')[0] || 'Player';

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header section */}
      <section className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8">
        <div className="absolute inset-0 bg-black opacity-10 z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Multiplayer Statistics</h1>
            <Link
              href="/protected"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
          <p className="text-xl opacity-90">
            Track your performance against other players
          </p>
        </div>
      </section>

      {/* Multiplayer stats section */}
      <MultiplayerStatsDisplay />

      {/* Tips for multiplayer section */}
      <section className="bg-card rounded-xl p-6 shadow-sm">
        <div className="flex items-center mb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-indigo-500" size={24} />
            Multiplayer Tips
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Team Up Strategically</h3>
            <p className="text-sm text-muted-foreground">In crowded areas, consider temporary alliances with other players to take down larger opponents.</p>
          </div>
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Edge Control</h3>
            <p className="text-sm text-muted-foreground">Use the map edges to your advantage - trap opponents against them for easy kills.</p>
          </div>
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Save Your Boost</h3>
            <p className="text-sm text-muted-foreground">Keep your boost ready for critical moments like escaping larger players or closing in for a kill.</p>
          </div>
          <div className="bg-accent/30 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Track Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Keep an eye on the top players to avoid them early and target them when you're stronger.</p>
          </div>
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/game/multiplayer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          <Users size={20} />
          Play Multiplayer Now
        </Link>
        <Link
          href="/protected"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 px-6 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
} 