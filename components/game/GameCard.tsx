import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GameCard() {
  return (
    <div className="rounded-lg border p-6 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">Snake.io</h3>
          <p className="text-sm text-muted-foreground">
            A multiplayer browser game inspired by Slither.io
          </p>
        </div>
        
        <div className="border rounded-md p-3 bg-accent/20">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col text-sm">
              <span className="font-semibold">Game Type</span>
              <span className="text-xs text-muted-foreground">Multiplayer</span>
            </div>
            <div className="flex flex-col text-sm">
              <span className="font-semibold">Controls</span>
              <span className="text-xs text-muted-foreground">Mouse</span>
            </div>
            <div className="flex flex-col text-sm">
              <span className="font-semibold">Tech</span>
              <span className="text-xs text-muted-foreground">Canvas/WebSockets</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            <span className="text-xs text-muted-foreground">Online</span>
          </span>
          
          <Link
            href="/game"
            className="inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 text-sm"
          >
            Play Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
} 