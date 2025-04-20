import ClientGame from "../client-game";

export const metadata = {
  title: "Snake.io Multiplayer",
  description: "Play against others in this multiplayer snake game inspired by Slither.io",
};

export default function MultiplayerGamePage() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <ClientGame mode="multiplayer" />
    </div>
  );
} 