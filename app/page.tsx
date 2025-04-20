import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-16rem)] w-full bg-gradient-to-b from-background to-accent/20">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            Snake.io
          </h1>
          <p className="text-lg md:text-xl mb-8 text-muted-foreground">
            A multiplayer snake game inspired by Slither.io
          </p>
          
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-12 text-center">
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <h3 className="font-bold">Multiplayer</h3>
              <p className="text-sm text-muted-foreground">Play with others in real-time</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <h3 className="font-bold">Growth</h3>
              <p className="text-sm text-muted-foreground">Eat pellets to grow longer</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <h3 className="font-bold">Competition</h3>
              <p className="text-sm text-muted-foreground">Climb the leaderboard</p>
            </div>
          </div>
          
          <Link 
            href="/game"
            className="inline-flex items-center justify-center rounded-md text-primary-foreground bg-primary px-6 sm:px-8 py-3 text-base sm:text-lg font-medium shadow-lg hover:bg-primary/90 transition-colors"
          >
            Play Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
      
      {/* Game Screenshots/Preview */}
      <section className="w-full py-12 bg-accent/10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Game Preview</h2>
          <div className="bg-card rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-video w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-4 sm:p-8 bg-black/30 backdrop-blur-sm rounded-lg text-white">
                  <p className="text-base sm:text-xl font-bold">Control your snake, eat pellets, and defeat other players!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How to Play */}
      <section className="w-full py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">How to Play</h2>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Controls</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">1</span>
                  <span>Use your mouse to control the direction of your snake</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">2</span>
                  <span>Move toward pellets to eat them and grow</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">3</span>
                  <span>Click to boost (coming soon)</span>
                </li>
              </ul>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Strategy</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">1</span>
                  <span>Avoid colliding with other snakes</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">2</span>
                  <span>Try to encircle other players to make them crash</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">3</span>
                  <span>The larger you get, the higher your score</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>Built with Next.js and HTML5 Canvas</p>
      </footer>
    </div>
  );
}
