// Game types and models

export interface Point {
  x: number;
  y: number;
}

// PowerUp types that can be collected
export type PowerUpType = "shield" | "magnet" | "ghost" | "giant";

// PowerUp item that appears on the map
export interface PowerUp {
  id: string;
  position: Point;
  type: PowerUpType;
  radius: number;
  duration: number; // Duration in milliseconds
  spawnTime: number; // When it was spawned
  expiryTime: number; // When it disappears if not collected
}

// Active power-up effect on a snake
export interface ActivePowerUp {
  type: PowerUpType;
  endTime: number; // When the effect ends
}

export interface Snake {
  id: string;
  name: string;
  color: string;
  segments: Point[];
  direction: Point;
  speed: number;
  baseSpeed: number; // Base speed without boost
  score: number;
  alive: boolean;
  // Visual enhancement properties
  pattern?: "solid" | "striped" | "gradient" | "glowing";
  secondaryColor?: string;
  glowIntensity?: number;
  scale?: number;
  boostMeter: number; // Current boost meter level (0-100)
  isBoosting: boolean; // Whether boost is currently active
  boostEndTime: number; // Timestamp when boost will end
  kills: number; // Add kill tracking for multiplayer
  lastKill?: string; // Keep track of the last player killed
  activePowerUps: ActivePowerUp[]; // Currently active power-ups
}

export interface Food {
  id: string;
  position: Point;
  value: number;
  color: string;
  radius: number;
  // Visual enhancement properties
  glowIntensity?: number;
  pulseRate?: number;
}

export interface GameState {
  width: number;
  height: number;
  snakes: Snake[];
  foods: Food[];
  powerUps: PowerUp[]; // Power-ups on the map
  leaderboard: {
    id: string;
    name: string;
    score: number;
  }[];
}

export interface PlayerInput {
  id: string;
  direction: Point;
}

// Helper functions for game logic
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function normalizeVector(p: Point): Point {
  const length = Math.sqrt(p.x * p.x + p.y * p.y);
  if (length === 0) return { x: 0, y: 0 };
  return {
    x: p.x / length,
    y: p.y / length,
  };
}

export function createSnake(id: string, name: string, position: Point): Snake {
  // Enhanced color palette with vibrant cosmic colors
  const colors = [
    "#FF5252", "#FF4081", "#E040FB", "#7C4DFF", 
    "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", 
    "#64FFDA", "#69F0AE", "#B2FF59", "#EEFF41",
    "#FFFF00", "#FFD740", "#FFAB40", "#FF6E40",
    "#8A2BE2", "#9370DB", "#BA55D3", "#DA70D6",
    "#00FFFF", "#00BFFF", "#1E90FF", "#4169E1"
  ];
  
  // Secondary colors for patterns and gradients
  const secondaryColors = [
    "#FFFFFF", "#FFD700", "#FF8C00", "#FF1493",
    "#9400D3", "#4B0082", "#0000FF", "#00FF00"
  ];
  
  // Pattern types for visual variety
  const patterns = ["solid", "striped", "gradient", "glowing"];
  
  // Random color selection
  const colorIndex = Math.floor(Math.random() * colors.length);
  const color = colors[colorIndex];
  
  // Secondary color that complements the main color
  const secondaryColor = secondaryColors[Math.floor(Math.random() * secondaryColors.length)];
  
  // Choose a random pattern
  const pattern = patterns[Math.floor(Math.random() * patterns.length)] as "solid" | "striped" | "gradient" | "glowing";
  
  // Generate segments for the snake
  const segments: Point[] = [];
  const segmentCount = 10; // Initial snake length
  
  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      x: position.x - i,
      y: position.y,
    });
  }
  
  return {
    id,
    name,
    color,
    segments,
    direction: { x: 1, y: 0 }, // Start moving right
    speed: 3,
    baseSpeed: 3, // Default base speed
    score: 0,
    alive: true,
    // Visual enhancements
    pattern,
    secondaryColor,
    glowIntensity: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
    scale: Math.random() * 0.2 + 0.9, // 0.9 - 1.1 size variation
    boostMeter: 0,
    isBoosting: false,
    boostEndTime: 0,
    kills: 0,
    lastKill: undefined,
    activePowerUps: [] // Initialize with no active power-ups
  };
}

export function createFood(id: string, position: Point): Food {
  // Enhanced cosmic-themed food colors
  const colors = [
    "#FFC107", "#FF9800", "#FF5722", "#F44336", // Reds/Oranges
    "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", // Purples/Blues
    "#00BCD4", "#009688", "#4CAF50", "#8BC34A", // Teals/Greens
    "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", // Yellows/Ambers
    "#00FFFF", "#1E90FF", "#7FFFD4", "#FF1493"  // Cyan/Pink/Aqua
  ];
  
  const value = Math.floor(Math.random() * 3) + 1; // 1-3 points
  const baseRadius = Math.floor(Math.random() * 3) + 3; // 3-5 base radius
  
  // Scale radius by value so more valuable food is larger
  const radius = baseRadius * Math.sqrt(value);
  
  return {
    id,
    position,
    value,
    color: colors[Math.floor(Math.random() * colors.length)],
    radius,
    // Visual enhancements
    glowIntensity: Math.random() * 0.7 + 0.3, // 0.3 - 1.0
    pulseRate: Math.random() * 2 + 1 // 1-3 (speed of pulsing)
  };
}

// Create a new power-up
export function createPowerUp(id: string, position: Point): PowerUp {
  const types: PowerUpType[] = ["shield", "magnet", "ghost", "giant"];
  const type = types[Math.floor(Math.random() * types.length)];
  
  return {
    id,
    position,
    type,
    radius: 10, // Power-ups are larger than regular food
    duration: 10000, // 10 seconds duration when collected
    spawnTime: Date.now(),
    expiryTime: Date.now() + 30000 // Disappears after 30 seconds if not collected
  };
}

export function createEmptyGameState(width: number, height: number): GameState {
  return {
    width,
    height,
    snakes: [],
    foods: [],
    powerUps: [], // Initialize empty power-ups array
    leaderboard: [],
  };
} 