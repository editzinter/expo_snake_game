import { 
  GameState, 
  Snake, 
  Food, 
  Point,
  PowerUp,
  PowerUpType
} from "../../lib/game/models";
import { TrailSystem } from "../../lib/game/trail";

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private screenWidth: number;
  private screenHeight: number;
  private mapWidth: number;
  private mapHeight: number;
  private darkMode: boolean;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1;
  private stars: {x: number, y: number, size: number, opacity: number}[] = [];
  private nebulae: {x: number, y: number, radius: number, color: string}[] = [];
  private frameCount: number = 0;
  private trailSystem: TrailSystem = new TrailSystem();
  private lastFoodCount: number = 0;
  private lastSnakes: Map<string, { alive: boolean, isBoosting: boolean }> = new Map();
  private lastSnakePositions: Map<string, Point[]> = new Map();

  constructor(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    screenHeight: number,
    mapWidth: number,
    mapHeight: number,
    darkMode: boolean = false
  ) {
    this.ctx = ctx;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.darkMode = darkMode;
    
    // Generate stars and nebulae for space background
    this.generateStars();
    this.generateNebulae();
  }

  // Generate stars for background
  private generateStars(): void {
    const starCount = Math.floor(this.mapWidth * this.mapHeight / 1000);
    this.stars = [];
    
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.mapWidth,
        y: Math.random() * this.mapHeight,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
  }
  
  // Generate nebulae for background
  private generateNebulae(): void {
    const nebulaCount = Math.floor(this.mapWidth * this.mapHeight / 1000000);
    this.nebulae = [];
    
    const colors = [
      'rgba(138, 43, 226, 0.1)', // Purple
      'rgba(0, 0, 139, 0.1)',    // Dark blue
      'rgba(75, 0, 130, 0.1)',   // Indigo
      'rgba(128, 0, 128, 0.1)',  // Purple
      'rgba(25, 25, 112, 0.1)',  // Midnight blue
      'rgba(65, 105, 225, 0.1)'  // Royal blue
    ];
    
    for (let i = 0; i < nebulaCount; i++) {
      this.nebulae.push({
        x: Math.random() * this.mapWidth,
        y: Math.random() * this.mapHeight,
        radius: Math.random() * 1000 + 500,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  // Update screen dimensions (e.g., on window resize)
  public updateDimensions(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    
    // Regenerate stars when dimensions change
    this.generateStars();
  }

  // Set camera position (typically centered on player)
  public setCameraPosition(x: number, y: number): void {
    this.cameraX = x;
    this.cameraY = y;
  }

  // Update theme
  public setDarkMode(darkMode: boolean): void {
    this.darkMode = darkMode;
  }

  // Set zoom level
  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.5, Math.min(2, zoom)); // Limit zoom between 0.5x and 2x
  }

  // Convert world coordinates to screen coordinates
  private worldToScreen(worldX: number, worldY: number): Point {
    return {
      x: (worldX - this.cameraX) * this.zoom + this.screenWidth / 2,
      y: (worldY - this.cameraY) * this.zoom + this.screenHeight / 2
    };
  }

  // Check if a point is visible on screen
  private isOnScreen(worldX: number, worldY: number, radius: number = 0): boolean {
    const screenPos = this.worldToScreen(worldX, worldY);
    return (
      screenPos.x + radius > 0 &&
      screenPos.x - radius < this.screenWidth &&
      screenPos.y + radius > 0 &&
      screenPos.y - radius < this.screenHeight
    );
  }

  // Draw space background
  private drawBackground(): void {
    // Base background color
    const bgColor = "#050515"; // Dark blue-black space color
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    
    // Draw nebulae
    for (const nebula of this.nebulae) {
      if (!this.isOnScreen(nebula.x, nebula.y, nebula.radius)) continue;
      
      const screenPos = this.worldToScreen(nebula.x, nebula.y);
      const screenRadius = nebula.radius * this.zoom;
      
      const gradient = this.ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, screenRadius
      );
      gradient.addColorStop(0, nebula.color.replace('0.1', '0.2'));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw stars
    for (const star of this.stars) {
      if (!this.isOnScreen(star.x, star.y)) continue;
      
      const screenPos = this.worldToScreen(star.x, star.y);
      
      // Twinkle effect based on frameCount
      const twinkle = Math.sin(this.frameCount / 20 + star.x * star.y) * 0.2 + 0.8;
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.frameCount++;
  }

  // Clear the canvas
  public clear(): void {
    this.drawBackground();
  }

  // Draw the grid background
  public drawGrid(): void {
    const gridSize = 50 * this.zoom;
    const gridColor = "rgba(255, 255, 255, 0.1)"; // Very subtle white grid

    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;

    // Calculate the visible area in world coordinates
    const leftEdge = this.cameraX - this.screenWidth / (2 * this.zoom);
    const rightEdge = this.cameraX + this.screenWidth / (2 * this.zoom);
    const topEdge = this.cameraY - this.screenHeight / (2 * this.zoom);
    const bottomEdge = this.cameraY + this.screenHeight / (2 * this.zoom);

    // Calculate grid start positions
    const startX = Math.floor(leftEdge / gridSize) * gridSize;
    const startY = Math.floor(topEdge / gridSize) * gridSize;

    // Draw vertical lines
    for (let x = startX; x <= rightEdge; x += gridSize) {
      const screenX = this.worldToScreen(x, 0).x;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.screenHeight);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = startY; y <= bottomEdge; y += gridSize) {
      const screenY = this.worldToScreen(0, y).y;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.screenWidth, screenY);
      this.ctx.stroke();
    }

    // Draw map boundaries with red danger zone border
    const borderWidth = 20 * this.zoom;
    const topLeft = this.worldToScreen(0, 0);
    const bottomRight = this.worldToScreen(this.mapWidth, this.mapHeight);
    
    // Outer red border - death zone
    this.ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    this.ctx.lineWidth = borderWidth;
    this.ctx.beginPath();
    this.ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    this.ctx.stroke();
    
    // Inner white border
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.rect(
      topLeft.x + borderWidth/2, 
      topLeft.y + borderWidth/2, 
      bottomRight.x - topLeft.x - borderWidth, 
      bottomRight.y - topLeft.y - borderWidth
    );
    this.ctx.stroke();
  }

  // Draw the minimap
  public drawMinimap(gameState: GameState, playerSnake?: Snake): void {
    const padding = 20;
    const size = 150;
    const x = this.screenWidth - size - padding;
    const y = this.screenHeight - size - padding;
    
    // Draw minimap background
    this.ctx.fillStyle = "rgba(5, 5, 21, 0.7)"; // Dark space-like background
    this.ctx.fillRect(x, y, size, size);
    
    // Draw border with glow
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = "rgba(65, 105, 225, 0.7)";
    this.ctx.strokeStyle = "rgba(100, 149, 237, 0.7)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, size, size);
    this.ctx.shadowBlur = 0;
    
    // Calculate scale factor
    const scaleX = size / this.mapWidth;
    const scaleY = size / this.mapHeight;
    
    // Draw food (as dots)
    for (const food of gameState.foods) {
      this.ctx.fillStyle = food.color;
      this.ctx.beginPath();
      this.ctx.arc(
        x + food.position.x * scaleX,
        y + food.position.y * scaleY,
        1.5, // Slightly larger for better visibility
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
    
    // Draw the red border zone on minimap
    this.ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, size, size);
    
    // Draw snakes (as lines with glow)
    for (const snake of gameState.snakes) {
      if (!snake.alive || snake.segments.length === 0) continue;
      
      const isPlayer = playerSnake && snake.id === playerSnake.id;
      
      // Create glow effect for player
      if (isPlayer) {
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = snake.color;
      }
      
      this.ctx.strokeStyle = isPlayer ? "#fff" : snake.color;
      this.ctx.lineWidth = isPlayer ? 2 : 1;
      
      this.ctx.beginPath();
      this.ctx.moveTo(
        x + snake.segments[0].x * scaleX,
        y + snake.segments[0].y * scaleY
      );
      
      for (let i = 1; i < snake.segments.length; i += 3) { // Skip some segments for performance
        this.ctx.lineTo(
          x + snake.segments[i].x * scaleX,
          y + snake.segments[i].y * scaleY
        );
      }
      
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // Reset shadow
    }
    
    // View area has been removed as requested
  }

  // Helper function to lighten a color
  private lightenColor(color: string, percent: number): string {
    // Only process hex colors
    if (!color.startsWith('#')) {
      return color;
    }
    
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);

    r = Math.min(255, r + Math.floor(percent / 100 * 255));
    g = Math.min(255, g + Math.floor(percent / 100 * 255));
    b = Math.min(255, b + Math.floor(percent / 100 * 255));

    return `rgb(${r}, ${g}, ${b})`;
  }

  // Draw a single food item
  public drawFood(food: Food): void {
    if (!this.isOnScreen(food.position.x, food.position.y, food.radius)) return;
    
    const screenPos = this.worldToScreen(food.position.x, food.position.y);
    const radius = food.radius * this.zoom;
    
    // Calculate pulse effect based on time
    const pulseRate = food.pulseRate || 1;
    const pulse = Math.sin(this.frameCount / (10 / pulseRate)) * 0.2 + 0.8;
    const pulseRadius = radius * pulse;
    
    // Glow effect based on food's glow intensity
    const glowIntensity = food.glowIntensity || 0.5;
    this.ctx.shadowBlur = radius * 2 * glowIntensity;
    this.ctx.shadowColor = food.color;
    
    // Draw the food with a gradient
    const gradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, pulseRadius
    );
    gradient.addColorStop(0, food.color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, pulseRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  // Draw a snake
  public drawSnake(snake: Snake): void {
    if (!snake.alive) return;

    const segments = snake.segments;
    if (segments.length === 0) return;

    // Check if any part of the snake is visible on screen
    let isVisible = false;
    for (const segment of segments) {
      if (this.isOnScreen(segment.x, segment.y, 10)) {
        isVisible = true;
        break;
      }
    }
    
    if (!isVisible) return;
    
    // Scale factor based on snake's scale property
    const scaleFactor = snake.scale || 1;
    
    // Snake pattern variables
    const pattern = snake.pattern || "solid";
    const secondaryColor = snake.secondaryColor || "#ffffff";
    const glowIntensity = snake.glowIntensity || 0.5;
    
    // Prepare for snake drawing with glow
    if (pattern === "glowing") {
      this.ctx.shadowBlur = 10 * glowIntensity;
      this.ctx.shadowColor = snake.color;
    }
    
    // Draw snake body segments
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!this.isOnScreen(segment.x, segment.y, 10)) continue;
      
      const screenPos = this.worldToScreen(segment.x, segment.y);
      
      // The head is larger and the body tapers down gradually
      let radius;
      if (i === 0) {
        radius = 12 * this.zoom * scaleFactor; // Head
      } else {
        // More gradual taper for longer appearance
        radius = Math.max(5, 12 - Math.sqrt(i) * 0.5) * this.zoom * scaleFactor;
      }

      // Apply different patterns
      if (pattern === "solid" || pattern === "glowing") {
        // Solid color with optional glow
        this.ctx.fillStyle = snake.color;
      } else if (pattern === "striped") {
        // Striped pattern (alternating colors)
        this.ctx.fillStyle = i % 2 === 0 ? snake.color : secondaryColor;
      } else if (pattern === "gradient") {
        // Gradient pattern from head to tail
        const gradientPosition = 1 - Math.min(1, i / segments.length);
        const gradient = this.ctx.createRadialGradient(
          screenPos.x, screenPos.y, 0,
          screenPos.x, screenPos.y, radius
        );
        gradient.addColorStop(0, this.lightenColor(snake.color, 30));
        gradient.addColorStop(1, snake.color);
        this.ctx.fillStyle = gradient;
      }
      
      // Draw segment
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw highlights/reflections for 3D effect
      if (i % 3 === 0) { // Add highlights every few segments
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        this.ctx.beginPath();
        this.ctx.arc(
          screenPos.x - radius * 0.3, 
          screenPos.y - radius * 0.3, 
          radius * 0.4, 
          0, Math.PI * 2
        );
        this.ctx.fill();
      }

      // Draw eyes on the head
      if (i === 0) {
        // Reset shadow for eyes
        const prevShadowBlur = this.ctx.shadowBlur;
        this.ctx.shadowBlur = 0;
        
        // Calculate eye positions based on direction
        const eyeOffset = 5 * this.zoom * scaleFactor;
        const eyeRadius = 2.5 * this.zoom * scaleFactor;
        
        // Default eye positions (looking right)
        let leftEye: Point = {
          x: screenPos.x + eyeOffset,
          y: screenPos.y - eyeOffset,
        };
        
        let rightEye: Point = {
          x: screenPos.x + eyeOffset,
          y: screenPos.y + eyeOffset,
        };
        
        // Adjust eye positions based on snake direction
        const dir = snake.direction;
        const angle = Math.atan2(dir.y, dir.x);
        
        leftEye = {
          x: screenPos.x + Math.cos(angle) * eyeOffset - Math.sin(angle) * eyeOffset,
          y: screenPos.y + Math.sin(angle) * eyeOffset + Math.cos(angle) * eyeOffset,
        };
        
        rightEye = {
          x: screenPos.x + Math.cos(angle) * eyeOffset + Math.sin(angle) * eyeOffset,
          y: screenPos.y + Math.sin(angle) * eyeOffset - Math.cos(angle) * eyeOffset,
        };
        
        // Draw eyes
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.beginPath();
        this.ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils
        this.ctx.fillStyle = "#000000";
        this.ctx.beginPath();
        this.ctx.arc(
          leftEye.x + Math.cos(angle) * eyeRadius * 0.3, 
          leftEye.y + Math.sin(angle) * eyeRadius * 0.3, 
          eyeRadius * 0.6, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(
          rightEye.x + Math.cos(angle) * eyeRadius * 0.3, 
          rightEye.y + Math.sin(angle) * eyeRadius * 0.3, 
          eyeRadius * 0.6, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Restore shadow settings
        this.ctx.shadowBlur = prevShadowBlur;
      }
    }
    
    // Reset shadow
    this.ctx.shadowBlur = 0;

    // Draw player name above the head with glow
    if (segments.length > 0) {
      const head = segments[0];
      const screenPos = this.worldToScreen(head.x, head.y);
      
      this.ctx.font = `bold ${12 * this.zoom}px Arial`;
      this.ctx.textAlign = "center";
      
      // Text glow for visibility
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      this.ctx.shadowBlur = 4;
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillText(snake.name, screenPos.x, screenPos.y - 20 * this.zoom);
      
      // Reset shadow
      this.ctx.shadowBlur = 0;
    }
  }

  // Draw the leaderboard
  public drawLeaderboard(leaderboard: GameState["leaderboard"]): void {
    const padding = 20;
    const lineHeight = 20;
    
    // Draw background with glass effect
    this.ctx.fillStyle = "rgba(5, 5, 21, 0.7)";
    this.ctx.fillRect(
      padding,
      padding,
      200,
      40 + leaderboard.length * lineHeight
    );
    
    // Glow border
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = "rgba(65, 105, 225, 0.5)";
    this.ctx.strokeStyle = "rgba(65, 105, 225, 0.7)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      padding,
      padding,
      200,
      40 + leaderboard.length * lineHeight
    );
    this.ctx.shadowBlur = 0;

    // Draw title with glow
    this.ctx.font = "bold 16px Arial";
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.textAlign = "center";
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = "rgba(65, 105, 225, 0.8)";
    this.ctx.fillText(
      "Leaderboard",
      padding + 100,
      padding + 25
    );
    this.ctx.shadowBlur = 0;

    // Draw entries with colorful ranking
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "left";
    
    leaderboard.forEach((entry, index) => {
      const y = padding + 50 + index * lineHeight;
      
      // Rank with color based on position
      let rankColor;
      if (index === 0) rankColor = "#FFD700"; // Gold
      else if (index === 1) rankColor = "#C0C0C0"; // Silver
      else if (index === 2) rankColor = "#CD7F32"; // Bronze
      else rankColor = "#FFFFFF"; // White
      
      this.ctx.fillStyle = rankColor;
      this.ctx.fillText(
        `${index + 1}.`,
        padding + 10,
        y
      );
      
      // Player name
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillText(
        entry.name,
        padding + 35,
        y
      );
      
      // Score with glow
      this.ctx.textAlign = "right";
      this.ctx.shadowBlur = 3;
      this.ctx.shadowColor = rankColor;
      this.ctx.fillText(
        `${entry.score}`,
        padding + 190,
        y
      );
      this.ctx.shadowBlur = 0;
      this.ctx.textAlign = "left";
    });
  }

  // Draw a game over message
  public drawGameOver(score: number): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // Game over panel with glass effect
    this.ctx.fillStyle = "rgba(5, 5, 21, 0.8)";
    this.ctx.fillRect(
      this.screenWidth / 2 - 200,
      this.screenHeight / 2 - 100,
      400,
      200
    );
    
    // Glow border
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "rgba(255, 0, 0, 0.7)";
    this.ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      this.screenWidth / 2 - 200,
      this.screenHeight / 2 - 100,
      400,
      200
    );
    
    // Title with glow
    this.ctx.font = "bold 36px Arial";
    this.ctx.fillStyle = "#FF0000";
    this.ctx.textAlign = "center";
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = "#FF0000";
    this.ctx.fillText(
      "Game Over",
      this.screenWidth / 2,
      this.screenHeight / 2 - 40
    );

    // Score with glow
    this.ctx.font = "24px Arial";
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = "#FFFFFF";
    this.ctx.fillText(
      `Your score: ${score}`,
      this.screenWidth / 2,
      this.screenHeight / 2 + 10
    );

    // Instruction
    this.ctx.font = "18px Arial";
    this.ctx.fillStyle = "#AAAAAA";
    this.ctx.shadowBlur = 0;
    this.ctx.fillText(
      "Click to play again",
      this.screenWidth / 2,
      this.screenHeight / 2 + 60
    );
  }

  // Add trail for a snake
  private addTrailForSnake(snake: Snake): void {
    if (!snake.alive || snake.segments.length === 0) return;
    
    const head = snake.segments[0];
    
    // Store last positions to detect movement
    if (!this.lastSnakePositions.has(snake.id)) {
      this.lastSnakePositions.set(snake.id, []);
    }
    
    const lastPositions = this.lastSnakePositions.get(snake.id) || [];
    
    // Only add trail if the snake has moved significantly
    if (lastPositions.length === 0 || 
        Math.abs(head.x - lastPositions[0].x) > 1 || 
        Math.abs(head.y - lastPositions[0].y) > 1) {
      
      // Add trail at the tail segments for a trailing effect
      const segmentInterval = Math.max(2, Math.floor(snake.segments.length / 10));
      
      // Limit the number of trail points for performance
      const maxTrailPoints = 20;
      let trailCount = 0;
      
      for (let i = segmentInterval; i < snake.segments.length && trailCount < maxTrailPoints; i += segmentInterval) {
        const segment = snake.segments[i];
        const radius = 10 - Math.sqrt(i) * 0.5; // Decrease radius for segments further from head
        
        this.trailSystem.addTrail(
          snake.id,
          segment,
          snake.color,
          radius * this.zoom
        );
        
        trailCount++;
      }
      
      // Update last position
      if (lastPositions.length >= 5) {
        lastPositions.pop(); // Remove oldest position
      }
      lastPositions.unshift({ ...head }); // Add new position at front
    }
  }

  // Track game state changes for trails
  private checkGameStateChanges(gameState: GameState, playerSnake?: Snake): void {
    // Save food count for tracking changes
    this.lastFoodCount = gameState.foods.length;

    // Check for player deaths to clear trails
    for (const snake of gameState.snakes) {
      const lastState = this.lastSnakes.get(snake.id);
      
      if (lastState && lastState.alive && !snake.alive) {
        // Snake was alive before but now is dead
        if (snake.segments.length > 0) {
          // Clear trails for dead snakes
          this.trailSystem.clearTrail(snake.id);
        }
      }
      
      // Update tracking state
      this.lastSnakes.set(snake.id, { 
        alive: snake.alive,
        isBoosting: snake.isBoosting
      });
    }
    
    // Add trails for all snakes
    for (const snake of gameState.snakes) {
      if (snake.alive) {
        this.addTrailForSnake(snake);
      }
    }
  }
  
  // Update visual effects
  public updateEffects(deltaTime: number): void {
    this.trailSystem.update(deltaTime);
  }

  // Draw danger warning if player is close to the border
  private drawDangerWarning(playerSnake: Snake): void {
    if (!playerSnake || !playerSnake.alive || playerSnake.segments.length === 0) return;
    
    const head = playerSnake.segments[0];
    
    // Distance from border
    const distanceFromLeft = head.x;
    const distanceFromRight = this.mapWidth - head.x;
    const distanceFromTop = head.y;
    const distanceFromBottom = this.mapHeight - head.y;
    
    // Danger zone threshold
    const dangerZone = 150;
    const criticalZone = 60;
    
    // Check if player is close to any border
    const isInDanger = 
      distanceFromLeft < dangerZone || 
      distanceFromRight < dangerZone || 
      distanceFromTop < dangerZone || 
      distanceFromBottom < dangerZone;
      
    if (!isInDanger) return;
    
    // Calculate danger level (higher = more danger)
    const dangerLevel = Math.min(1.0, 1.0 - (
      Math.min(
        distanceFromLeft, 
        distanceFromRight, 
        distanceFromTop, 
        distanceFromBottom
      ) / dangerZone
    ));
    
    // Draw pulsing red border around the screen
    this.ctx.save();
    
    // Determine which borders to highlight
    const highlightLeft = distanceFromLeft < dangerZone;
    const highlightRight = distanceFromRight < dangerZone;
    const highlightTop = distanceFromTop < dangerZone;
    const highlightBottom = distanceFromBottom < dangerZone;
    
    // Create pulsing effect
    const pulseRate = 0.3 + dangerLevel * 0.7; // Faster pulse when closer to border
    const pulse = (Math.sin(this.frameCount * pulseRate * 0.1) * 0.3 + 0.7) * dangerLevel;
    
    // Draw translucent red overlay at screen edges
    const borderWidth = 50 + pulse * 50;
    const alpha = 0.1 + pulse * 0.4;
    
    // Set gradient for each edge
    if (highlightLeft) {
      const gradient = this.ctx.createLinearGradient(0, 0, borderWidth, 0);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, borderWidth, this.screenHeight);
    }
    
    if (highlightRight) {
      const gradient = this.ctx.createLinearGradient(this.screenWidth, 0, this.screenWidth - borderWidth, 0);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(this.screenWidth - borderWidth, 0, borderWidth, this.screenHeight);
    }
    
    if (highlightTop) {
      const gradient = this.ctx.createLinearGradient(0, 0, 0, borderWidth);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.screenWidth, borderWidth);
    }
    
    if (highlightBottom) {
      const gradient = this.ctx.createLinearGradient(0, this.screenHeight, 0, this.screenHeight - borderWidth);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, this.screenHeight - borderWidth, this.screenWidth, borderWidth);
    }
    
    // Critical warning - flashing text
    if (distanceFromLeft < criticalZone || 
        distanceFromRight < criticalZone || 
        distanceFromTop < criticalZone || 
        distanceFromBottom < criticalZone) {
      
      // Flashing warning text
      if (Math.sin(this.frameCount * 0.3) > 0) {
        this.ctx.font = "bold 24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "#FF3333";
        this.ctx.shadowColor = "#FF0000";
        this.ctx.shadowBlur = 10;
        this.ctx.fillText("DANGER! BORDER APPROACHING", this.screenWidth / 2, 50);
      }
    }
    
    this.ctx.restore();
  }

  // Draw the boost meter UI for the player
  public drawBoostMeter(playerSnake: Snake): void {
    if (!playerSnake || !playerSnake.alive) return;
    
    const padding = 20;
    const meterWidth = 200;
    const meterHeight = 15; // Slightly increased height for better visibility
    const x = (this.screenWidth - meterWidth) / 2;
    const y = this.screenHeight - meterHeight - padding;
    
    // Helper function for drawing rounded rectangles
    const drawRoundedRect = (
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      width: number, 
      height: number, 
      radius: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };
    
    // Draw meter background with a more visible 3D effect
    this.ctx.fillStyle = "rgba(25, 25, 45, 0.8)";
    this.ctx.strokeStyle = "rgba(100, 100, 200, 0.9)";
    this.ctx.lineWidth = 2;
    drawRoundedRect(this.ctx, x, y, meterWidth, meterHeight, 7);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw inner shadow for 3D effect
    const gradient = this.ctx.createLinearGradient(x, y, x, y + meterHeight);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.3)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
    this.ctx.fillStyle = gradient;
    drawRoundedRect(this.ctx, x, y, meterWidth, meterHeight, 7);
    this.ctx.fill();
    
    // Calculate fill width based on boost meter value - with smooth animation
    // We'll use a simple easing for fill animation
    const targetFillWidth = (playerSnake.boostMeter / 100) * meterWidth;
    
    // Draw boost meter fill with enhanced glow effects
    if (targetFillWidth > 0) {
      // Different color based on whether boost is ready or active
      let color;
      if (playerSnake.isBoosting) {
        // Active boost color - intense gold/orange with pulsing
        const boostProgress = Math.max(0, (playerSnake.boostEndTime - Date.now()) / 5000);
        const pulse = Math.sin(this.frameCount * 0.4) * 0.3 + 0.7;
        
        // Color shifts from gold to red as boost depletes
        color = playerSnake.boostMeter >= 75 ? "#FFC107" : 
               playerSnake.boostMeter >= 50 ? "#FF9800" : 
               playerSnake.boostMeter >= 25 ? "#FF5722" : "#F44336";
        
        this.ctx.shadowBlur = 15 * pulse;
        this.ctx.shadowColor = color;
      } else if (playerSnake.boostMeter >= 100) {
        // Ready boost - gold with gentle pulsing
        const pulse = Math.sin(this.frameCount * 0.1) * 0.2 + 0.8;
        color = "#FFC107";
        this.ctx.shadowBlur = 10 * pulse;
        this.ctx.shadowColor = "#FFC107";
      } else {
        // Charging boost - blue with intensity based on fill level
        const fillRatio = playerSnake.boostMeter / 100;
        // Color gradient from dark blue to bright blue as it fills
        color = fillRatio < 0.3 ? "#2980b9" : 
               fillRatio < 0.6 ? "#3498db" : "#00b7ff";
        this.ctx.shadowBlur = 5 + (fillRatio * 5);
        this.ctx.shadowColor = color;
      }
      
      // Create gradient fill for 3D effect
      const fillGradient = this.ctx.createLinearGradient(x, y, x, y + meterHeight);
      fillGradient.addColorStop(0, color);
      fillGradient.addColorStop(0.5, this.lightenColor(color, 30));
      fillGradient.addColorStop(1, color);
      
      // Draw the fill with rounded corners
      this.ctx.fillStyle = fillGradient;
      
      // Draw rounded rectangle only for the filled part
      this.ctx.beginPath();
      if (targetFillWidth >= meterWidth - 7) {
        // Full fill with right rounded corners
        drawRoundedRect(this.ctx, x, y, targetFillWidth, meterHeight, 7);
      } else {
        // Partial fill with only left rounded corners
        this.ctx.moveTo(x + targetFillWidth, y);
        this.ctx.lineTo(x + targetFillWidth, y + meterHeight);
        this.ctx.lineTo(x + 7, y + meterHeight);
        this.ctx.arcTo(x, y + meterHeight, x, y + meterHeight - 7, 7);
        this.ctx.lineTo(x, y + 7);
        this.ctx.arcTo(x, y, x + 7, y, 7);
        this.ctx.lineTo(x + targetFillWidth, y);
        this.ctx.closePath();
      }
      this.ctx.fill();
      
      // Reset shadow
      this.ctx.shadowBlur = 0;
      
      // Add shine effect on top
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.beginPath();
      this.ctx.rect(x, y, targetFillWidth, meterHeight / 3);
      this.ctx.fill();
    }
    
    // Draw boost label with enhanced visibility
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    
    let label = "BOOST";
    if (playerSnake.isBoosting) {
      // Calculate remaining boost time with 1 decimal precision
      const timeLeft = Math.max(0, (playerSnake.boostEndTime - Date.now()) / 1000);
      const timeLeftDisplay = timeLeft.toFixed(1);
      label = `BOOST ${timeLeftDisplay}s`;
      
      // Add a pulse effect when boosting
      const pulse = Math.sin(this.frameCount * 0.3) * 0.3 + 0.7;
      this.ctx.shadowBlur = 12 * pulse;
      this.ctx.shadowColor = "#FFC107";
      
      // Text glow and shadow for better visibility
      this.ctx.fillStyle = "#FFFFFF";
    } else if (playerSnake.boostMeter >= 100) {
      label = "PRESS SPACE";
      
      // Pulsing text for ready boost
      const pulse = Math.sin(this.frameCount * 0.2) * 0.5 + 0.5;
      this.ctx.shadowBlur = 8 * pulse;
      this.ctx.shadowColor = "#FFC107";
      
      // Make text blink when ready
      if (Math.sin(this.frameCount * 0.1) > 0) {
        this.ctx.fillStyle = "#FFFFFF";
      } else {
        this.ctx.fillStyle = "#FFC107";
      }
    } else {
      // Show percentage with smoother animation
      const percent = Math.floor(playerSnake.boostMeter);
      label = `${percent}%`;
      
      // Normal text for charging boost
      this.ctx.shadowBlur = 3;
      this.ctx.shadowColor = "#000000";
      this.ctx.fillStyle = "#FFFFFF";
    }
    
    // Draw text on top of boost meter
    this.ctx.fillText(label, x + meterWidth / 2, y + meterHeight / 2);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  // Draw a power-up item
  public drawPowerUp(powerUp: PowerUp): void {
    if (!this.isOnScreen(powerUp.position.x, powerUp.position.y, powerUp.radius)) {
      return;
    }

    const screenPos = this.worldToScreen(powerUp.position.x, powerUp.position.y);
    const now = Date.now();
    const age = now - powerUp.spawnTime;
    const timeLeft = powerUp.expiryTime - now;
    const blinkSpeed = Math.max(0.5, Math.min(2, timeLeft / 5000)); // Blink faster as expiry approaches
    
    // Pulsing animation
    const pulseSize = 1 + 0.2 * Math.sin(age / (300 * blinkSpeed));
    const radius = powerUp.radius * this.zoom * pulseSize;
    
    // Base colors for power-up types
    const powerUpColors: Record<PowerUpType, {base: string, glow: string, icon: string}> = {
      shield: { 
        base: "#4FC3F7", 
        glow: "#29B6F6", 
        icon: "🛡️" 
      },
      magnet: { 
        base: "#BA68C8", 
        glow: "#AB47BC", 
        icon: "🧲" 
      },
      ghost: { 
        base: "#B0BEC5", 
        glow: "#90A4AE", 
        icon: "👻" 
      },
      giant: { 
        base: "#FFB74D", 
        glow: "#FFA726", 
        icon: "🔱" 
      }
    };
    
    const colorInfo = powerUpColors[powerUp.type];
    
    // External glow
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = colorInfo.glow;
    
    // Draw outer circle
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = colorInfo.base;
    this.ctx.fill();
    
    // Inner highlight
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius * 0.7, 0, Math.PI * 2);
    this.ctx.fillStyle = this.lightenColor(colorInfo.base, 30);
    this.ctx.fill();
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    
    // Draw icon text
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    const fontSize = Math.max(14, radius * 0.8);
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText(colorInfo.icon, screenPos.x, screenPos.y);
    
    // Draw time left indicator as a circular progress bar
    if (timeLeft < 10000) { // Only show countdown when less than 10 seconds left
      const progress = timeLeft / 30000; // 30 seconds is the total lifetime
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, radius * 1.3, 0, Math.PI * 2 * progress);
      this.ctx.strokeStyle = colorInfo.glow;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  // Draw active power-up effects on a snake
  public drawSnakePowerUpEffects(snake: Snake): void {
    if (!snake.activePowerUps.length) return;
    
    const now = Date.now();
    const head = snake.segments[0];
    const screenPos = this.worldToScreen(head.x, head.y);
    
    // Show power-up indicators above the snake's name
    this.ctx.font = `bold ${10 * this.zoom}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.shadowBlur = 3;
    
    let iconOffset = -30 * this.zoom;
    
    snake.activePowerUps.forEach(powerUp => {
      const timeLeft = powerUp.endTime - now;
      if (timeLeft <= 0) return;
      
      // Flash when the power-up is about to expire
      const isFlashing = timeLeft < 3000 && Math.floor(Date.now() / 200) % 2 === 0;
      if (isFlashing) return;
      
      // Icons for each power-up type
      const icons: Record<PowerUpType, string> = {
        shield: "🛡️",
        magnet: "🧲",
        ghost: "👻",
        giant: "🔱"
      };
      
      const glowColors: Record<PowerUpType, string> = {
        shield: "#29B6F6",
        magnet: "#AB47BC",
        ghost: "#90A4AE",
        giant: "#FFA726"
      };
      
      // Draw the icon
      this.ctx.shadowColor = glowColors[powerUp.type];
      this.ctx.fillText(
        icons[powerUp.type],
        screenPos.x,
        screenPos.y + iconOffset
      );
      
      iconOffset -= 15 * this.zoom;
    });
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  public render(gameState: GameState, playerSnake?: Snake, deltaTime: number = 16.67): void {
    // Check for state changes to trigger effects
    this.checkGameStateChanges(gameState, playerSnake);
    
    // Update trails only - no particles
    this.trailSystem.update(deltaTime);
    
    this.clear();
    this.drawGrid();
    
    // Draw trails first (under snakes)
    this.trailSystem.draw(this.ctx, this.cameraX, this.cameraY, this.zoom, this.screenWidth, this.screenHeight);
    
    // Draw all food
    for (const food of gameState.foods) {
      this.drawFood(food);
    }
    
    // Draw all power-ups
    gameState.powerUps.forEach(powerUp => {
      this.drawPowerUp(powerUp);
    });
    
    // Draw other snakes first
    for (const snake of gameState.snakes) {
      if (!playerSnake || snake.id !== playerSnake.id) {
        this.drawSnake(snake);
      }
    }
    
    // Draw player snake last (on top)
    if (playerSnake) {
      this.drawSnake(playerSnake);
    }
    
    // Draw danger warning if player is close to edge
    if (playerSnake) {
      this.drawDangerWarning(playerSnake);
    }
    
    // Draw minimap
    this.drawMinimap(gameState, playerSnake);
    
    // Draw leaderboard
    this.drawLeaderboard(gameState.leaderboard);
    
    // Draw boost meter if player snake exists
    if (playerSnake && playerSnake.alive) {
      this.drawBoostMeter(playerSnake);
    }
    
    // Draw game over if player is dead
    if (playerSnake && !playerSnake.alive) {
      this.drawGameOver(playerSnake.score);
    }

    // Draw all snakes
    gameState.snakes.forEach(snake => {
      // Skip dead snakes
      if (!snake.alive) return;
      
      // Draw power-up effects if any
      if (snake.activePowerUps.length > 0) {
        this.drawSnakePowerUpEffects(snake);
      }
    });
  }
} 