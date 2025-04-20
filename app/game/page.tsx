import ClientGame from "./client-game";

export const metadata = {
  title: "Snake.io Game",
  description: "A single player snake game inspired by Slither.io",
};

export default function GamePage() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <ClientGame mode="offline" />
    </div>
  );
} 