import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Snake,
  Food,
  Point,
  PlayerInput,
  distance,
  normalizeVector,
  createSnake,
  createFood,
  createEmptyGameState,
} from './models';

// Constants for game configuration
const FOOD_COUNT = 500; // Increased food for larger map
const SPECIAL_FOOD_CHANCE = 0.05; // 5% chance for special high-value food
const FOOD_SPAWN_INTERVAL = 50; // ms - spawn food more frequently
const TICK_RATE = 1000 / 60; // 60 fps
const COLLISION_DISTANCE = 10;
const FOOD_COLLISION_DISTANCE = 15;
const BORDER_DANGER_ZONE = 30; // Distance from map edge that is dangerous

// Define event types for sound events
export type GameEventType = 'foodCollect' | 'specialFoodCollect' | 'playerDeath' | 'playerDeathBorder' | 'boostStart' | 'boostEnd' | 'playerKill';
export type GameEventListener = (event: GameEventType, data?: any) => void;

// Add QuadTree implementation for spatial partitioning
class QuadTree {
  private boundary: { x: number, y: number, width: number, height: number };
  private capacity: number;
  private objects: Array<{ id: string, x: number, y: number, radius?: number }>;
  private divided: boolean;
  private northwest: QuadTree | null;
  private northeast: QuadTree | null;
  private southwest: QuadTree | null;
  private southeast: QuadTree | null;

  constructor(boundary: { x: number, y: number, width: number, height: number }, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.objects = [];
    this.divided = false;
    this.northwest = null;
    this.northeast = null;
    this.southwest = null;
    this.southeast = null;
  }

  // Subdivide this quadtree into four equal parts
  subdivide() {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.width / 2;
    const h = this.boundary.height / 2;

    this.northwest = new QuadTree({ x: x, y: y, width: w, height: h }, this.capacity);
    this.northeast = new QuadTree({ x: x + w, y: y, width: w, height: h }, this.capacity);
    this.southwest = new QuadTree({ x: x, y: y + h, width: w, height: h }, this.capacity);
    this.southeast = new QuadTree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);

    this.divided = true;
  }

  // Insert an object into the quadtree
  insert(object: { id: string, x: number, y: number, radius?: number }): boolean {
    // Check if this object is within the boundary
    if (!this.contains(object)) {
      return false;
    }

    // If there's space in this quadtree and it's not divided, add the object here
    if (this.objects.length < this.capacity && !this.divided) {
      this.objects.push(object);
      return true;
    }

    // Otherwise, subdivide and then add the object to whichever quadrant will accept it
    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northwest!.insert(object) ||
      this.northeast!.insert(object) ||
      this.southwest!.insert(object) ||
      this.southeast!.insert(object)
    );
  }

  // Check if a point is within the boundary
  contains(point: { x: number, y: number }): boolean {
    return (
      point.x >= this.boundary.x &&
      point.x <= this.boundary.x + this.boundary.width &&
      point.y >= this.boundary.y &&
      point.y <= this.boundary.y + this.boundary.height
    );
  }

  // Query all objects that could collide with the given area
  query(range: { x: number, y: number, width: number, height: number }, found: Array<{ id: string, x: number, y: number, radius?: number }> = []): Array<{ id: string, x: number, y: number, radius?: number }> {
    // If the range doesn't intersect this quad, return empty array
    if (!this.intersects(range)) {
      return found;
    }

    // Check objects at this level
    for (let i = 0; i < this.objects.length; i++) {
      if (this.objectInRange(this.objects[i], range)) {
        found.push(this.objects[i]);
      }
    }

    // If this quad is divided, check children
    if (this.divided) {
      this.northwest!.query(range, found);
      this.northeast!.query(range, found);
      this.southwest!.query(range, found);
      this.southeast!.query(range, found);
    }

    return found;
  }

  // Check if the range intersects this quad
  intersects(range: { x: number, y: number, width: number, height: number }): boolean {
    return !(
      range.x > this.boundary.x + this.boundary.width ||
      range.x + range.width < this.boundary.x ||
      range.y > this.boundary.y + this.boundary.height ||
      range.y + range.height < this.boundary.y
    );
  }

  // Check if an object is within the search range
  objectInRange(object: { x: number, y: number, radius?: number }, range: { x: number, y: number, width: number, height: number }): boolean {
    // Use radius if available, or default to point check
    const radius = object.radius || 0;
    return (
      object.x + radius >= range.x &&
      object.x - radius <= range.x + range.width &&
      object.y + radius >= range.y &&
      object.y - radius <= range.y + range.height
    );
  }

  // Clear all objects from the quadtree
  clear() {
    this.objects = [];
    
    if (this.divided) {
      this.northwest!.clear();
      this.northeast!.clear();
      this.southwest!.clear();
      this.southeast!.clear();
      
      this.divided = false;
      this.northwest = null;
      this.northeast = null;
      this.southwest = null;
      this.southeast = null;
    }
  }
}

export class GameEngine {
  private state: GameState;
  private lastTick: number = 0;
  private foodSpawnCounter: number = 0;
  private eventListeners: GameEventListener[] = [];
  private quadtree: QuadTree | null;
  
  constructor(width: number, height: number) {
    this.state = createEmptyGameState(width, height);
    
    // Initialize food
    this.spawnInitialFood();

    // Initialize the quadtree with the world boundaries
    this.quadtree = new QuadTree({ 
      x: 0, 
      y: 0, 
      width: width, 
      height: height 
    }, 8); // Capacity of 8 objects per quad before subdividing
  }
  
  // Add an event listener
  public addEventListener(listener: GameEventListener): void {
    this.eventListeners.push(listener);
  }
  
  // Remove an event listener
  public removeEventListener(listener: GameEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }
  
  // Emit an event to all listeners
  private emitEvent(event: GameEventType, data?: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error("Error in game event listener:", error);
      }
    });
  }
  
  // Initialize the game with food
  private spawnInitialFood(): void {
    for (let i = 0; i < FOOD_COUNT; i++) {
      this.spawnFood();
    }
  }
  
  // Spawn a new food at a random position
  private spawnFood(): void {
    const position: Point = {
      x: Math.random() * this.state.width,
      y: Math.random() * this.state.height,
    };
    
    // Create special high-value food occasionally
    const isSpecial = Math.random() < SPECIAL_FOOD_CHANCE;
    const food = createFood(uuidv4(), position);
    
    // Make special food larger, more valuable, and more visually distinct
    if (isSpecial) {
      food.value *= 3; // Triple the value
      food.radius *= 1.5; // 50% larger
      food.glowIntensity = 1.0; // Maximum glow
      food.pulseRate = 3.0; // Fast pulse rate
    }
    
    this.state.foods.push(food);
  }

  // Spawn food at a specific position
  private spawnFoodAt(position: Point, value: number = 1): void {
    const food = createFood(uuidv4(), position);
    
    // Adjust value to passed parameter
    food.value = value;
    
    // Adjust radius based on value
    food.radius = 3 + value;
    
    this.state.foods.push(food);
  }
  
  // Add a new player to the game
  public addPlayer(name: string): string {
    const id = uuidv4();
    
    // Spawn player away from edges
    const padding = 200;
    const position: Point = {
      x: padding + Math.random() * (this.state.width - padding * 2),
      y: padding + Math.random() * (this.state.height - padding * 2),
    };
    
    const snake = createSnake(id, name, position);
    this.state.snakes.push(snake);
    
    return id;
  }
  
  // Remove a player from the game
  public removePlayer(id: string): void {
    this.state.snakes = this.state.snakes.filter(snake => snake.id !== id);
    this.updateLeaderboard();
  }
  
  // Update player direction based on input
  public handlePlayerInput(input: PlayerInput): void {
    const snake = this.state.snakes.find(s => s.id === input.id);
    if (snake && snake.alive) {
      // Get the normalized direction
      const normalizedDirection = normalizeVector(input.direction);
      
      // Adjust speed based on input magnitude - allows for speed control
      const inputMagnitude = Math.sqrt(input.direction.x * input.direction.x + input.direction.y * input.direction.y);
      const speedFactor = Math.min(1, inputMagnitude / 100); // Cap at normal speed
      
      // Calculate base speed (without boost)
      snake.baseSpeed = 2 + speedFactor * 2; // Base speed between 2-4 based on input
      
      // Apply boost if active
      if (snake.isBoosting) {
        snake.speed = snake.baseSpeed * 2; // 2x speed boost
      } else {
        snake.speed = snake.baseSpeed;
      }
      
      // Set direction
      snake.direction = normalizedDirection;
    }
  }
  
  // Activate boost for a player
  public activateBoost(playerId: string): boolean {
    const snake = this.state.snakes.find(s => s.id === playerId);
    if (!snake || !snake.alive || snake.boostMeter < 100 || snake.isBoosting) {
      return false; // Can't boost
    }
    
    // Activate boost
    snake.isBoosting = true;
    snake.speed = snake.baseSpeed * 2; // Double the speed
    snake.boostEndTime = Date.now() + 5000; // 5 seconds from now
    
    // Emit boost start event
    this.emitEvent('boostStart', { playerId: snake.id });
    
    return true;
  }
  
  // Check if boost has ended
  private checkBoostStatus(): void {
    const now = Date.now();
    
    for (const snake of this.state.snakes) {
      if (snake.isBoosting && now >= snake.boostEndTime) {
        // Boost has ended
        snake.isBoosting = false;
        snake.speed = snake.baseSpeed;
        snake.boostMeter = 0; // Reset boost meter
        
        // Emit boost end event
        this.emitEvent('boostEnd', { playerId: snake.id });
      }
    }
  }
  
  // Main game loop - updates game state
  public update(deltaTime: number): void {
    // Only update at the tick rate
    this.lastTick += deltaTime;
    if (this.lastTick < TICK_RATE) return;
    this.lastTick = 0;
    
    // Check boost status
    this.checkBoostStatus();
    
    // Update snakes
    this.updateSnakes(deltaTime);
    
    // Update the quadtree with current positions of all objects
    this.updateSpatialPartitioning();
    
    // Check for snake-food collisions using the quadtree
    this.checkFoodCollisions();
    
    // Check for snake-snake collisions using the quadtree
    this.checkSnakeCollisions();
    
    // Spawn new food periodically
    this.foodSpawnCounter += deltaTime;
    if (this.foodSpawnCounter >= FOOD_SPAWN_INTERVAL) {
      this.foodSpawnCounter = 0;
      if (this.state.foods.length < FOOD_COUNT) {
        this.spawnFood();
      }
    }
    
    // Update leaderboard
    this.updateLeaderboard();
  }
  
  // Update the positions of all snakes
  private updateSnakes(deltaTime: number): void {
    for (const snake of this.state.snakes) {
      if (!snake.alive) continue;
      
      // Calculate movement based on direction and speed
      const movement = {
        x: snake.direction.x * snake.speed,
        y: snake.direction.y * snake.speed,
      };
      
      // Move the head
      const newHead: Point = {
        x: snake.segments[0].x + movement.x,
        y: snake.segments[0].y + movement.y,
      };
      
      // Handle border danger zone and collision
      const isTooCloseToEdge = 
        newHead.x < BORDER_DANGER_ZONE || 
        newHead.x > this.state.width - BORDER_DANGER_ZONE ||
        newHead.y < BORDER_DANGER_ZONE || 
        newHead.y > this.state.height - BORDER_DANGER_ZONE;
      
      // Kill snake if it's in the border danger zone
      if (isTooCloseToEdge) {
        // Before killing the snake, drop food at its location
        this.dropFoodFromSnake(snake);
        
        // Kill the snake
        snake.alive = false;
        
        // Emit death by border event
        this.emitEvent('playerDeathBorder', { playerId: snake.id });
        
        // Skip the rest of this iteration
        continue;
      }
      
      // Add new head to the beginning of segments
      snake.segments.unshift(newHead);
      
      // Remove the last segment (tail) if not growing
      snake.segments.pop();
    }
  }
  
  // Drop food items where a snake died
  private dropFoodFromSnake(snake: Snake): void {
    // Calculate the number of food items to drop based on snake length
    const foodCount = Math.ceil(snake.segments.length / 5); // One food per 5 segments
    
    // Select segments to drop food at, distribute evenly
    const segmentIndices = [];
    for (let i = 0; i < foodCount; i++) {
      const index = Math.floor(i * (snake.segments.length / foodCount));
      segmentIndices.push(index);
    }
    
    // Drop food at selected segments
    for (const index of segmentIndices) {
      const segment = snake.segments[index];
      
      // Small random offset to spread the food out a bit
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      
      const position = {
        x: segment.x + offsetX,
        y: segment.y + offsetY
      };
      
      // Food value proportional to snake size
      const value = Math.floor(Math.random() * 2) + 1; // 1-2 value
      
      this.spawnFoodAt(position, value);
    }
    
    // Drop a special high-value food at the head
    if (snake.segments.length > 0) {
      const head = snake.segments[0];
      
      this.spawnFoodAt({
        x: head.x,
        y: head.y
      }, 3); // High value food
    }
  }
  
  // Update the spatial partitioning structure with current game objects
  private updateSpatialPartitioning(): void {
    if (!this.quadtree) return;
    
    // Clear and rebuild the quadtree
    this.quadtree.clear();
    
    // Add snake heads to the quadtree
    for (const snake of this.state.snakes) {
      if (snake.alive && snake.segments.length > 0) {
        const head = snake.segments[0];
        this.quadtree.insert({ 
          id: snake.id, 
          x: head.x, 
          y: head.y, 
          radius: 5 // Collision radius for snake head
        });
      }
    }
    
    // Add food to the quadtree
    for (const food of this.state.foods) {
      this.quadtree.insert({ 
        id: food.id, 
        x: food.position.x, 
        y: food.position.y, 
        radius: food.radius
      });
    }
  }

  // Modified method to use quadtree for food collision detection
  private checkFoodCollisions(): void {
    if (!this.quadtree) return;
    
    for (const snake of this.state.snakes) {
      if (!snake.alive || snake.segments.length === 0) continue;
      
      const head = snake.segments[0];
      
      // Query the quadtree for potential collisions in the area around the snake head
      const searchArea = { 
        x: head.x - 10, 
        y: head.y - 10, 
        width: 20, 
        height: 20 
      };
      
      const potentialCollisions = this.quadtree.query(searchArea);
      
      // Check collisions only with food items
      for (let i = 0; i < this.state.foods.length; i++) {
        const food = this.state.foods[i];
        
        // Skip if this food isn't in our potential collisions
        if (!potentialCollisions.some(obj => obj.id === food.id)) continue;
        
        // Check actual collision
        const dx = head.x - food.position.x;
        const dy = head.y - food.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5 + food.radius) {
          // Food is collected
          this.collectFood(snake, i);
          // Since we've removed this food, we need to break to avoid index issues
          break;
        }
      }
    }
  }

  // Method to handle a snake collecting food
  private collectFood(snake: Snake, foodIndex: number): void {
    const food = this.state.foods[foodIndex];
    
    // Snake eats food
    snake.score += food.value;
    
    // Add new segments to the snake (growth)
    const tail = snake.segments[snake.segments.length - 1];
    
    // Growth proportional to food value
    for (let i = 0; i < food.value; i++) {
      snake.segments.push({ ...tail });
    }
    
    // Update boost meter for special food
    if (food.value > 2) {
      // Special food increases boost meter by 25%
      snake.boostMeter = Math.min(100, snake.boostMeter + 25);
      this.emitEvent('specialFoodCollect', { 
        playerId: snake.id, 
        foodValue: food.value,
        boostMeter: snake.boostMeter
      });
    } else {
      // Regular food increases boost meter by a tiny amount (5%)
      snake.boostMeter = Math.min(100, snake.boostMeter + 5);
      this.emitEvent('foodCollect', { 
        playerId: snake.id, 
        foodValue: food.value,
        boostMeter: snake.boostMeter
      });
    }
    
    // Remove the eaten food
    this.state.foods.splice(foodIndex, 1);
  }

  // Modified method to use quadtree for snake collision detection
  private checkSnakeCollisions(): void {
    if (!this.quadtree) return;
    
    for (let i = 0; i < this.state.snakes.length; i++) {
      const snake = this.state.snakes[i];
      if (!snake.alive || snake.segments.length === 0) continue;
      
      const head = snake.segments[0];
      
      // Query the quadtree for potential collisions in the area around the snake head
      const searchArea = { 
        x: head.x - 10, 
        y: head.y - 10, 
        width: 20, 
        height: 20 
      };
      
      const potentialCollisions = this.quadtree.query(searchArea);
      
      // Check collisions with other snakes
      for (let j = 0; j < this.state.snakes.length; j++) {
        if (i === j) continue; // Skip self
        
        const otherSnake = this.state.snakes[j];
        if (!otherSnake.alive) continue;
        
        // Skip if this snake's head isn't in our potential collisions
        if (!potentialCollisions.some(obj => obj.id === otherSnake.id)) continue;
        
        // Check collision with other snake's segments
        // Start from 0 to check head-to-head collisions
        for (let k = 0; k < otherSnake.segments.length; k++) {
          const segment = otherSnake.segments[k];
          
          const dx = head.x - segment.x;
          const dy = head.y - segment.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // If it's a head-to-head collision, the larger snake wins
          if (k === 0 && distance < 10) {
            if (snake.segments.length > otherSnake.segments.length) {
              this.killSnake(j, snake);
              break;
            } else if (snake.segments.length < otherSnake.segments.length) {
              this.killSnake(i, otherSnake);
              break;
            } else {
              // If they're the same size, both die
              this.killSnake(i);
              this.killSnake(j);
              break;
            }
          }
          // Otherwise, if colliding with any segment (including head), the moving snake dies
          else if (distance < 10) {
            this.killSnake(i, otherSnake);
            break;
          }
        }
      }
      
      // Also check collision with own segments (except the head)
      for (let k = 2; k < snake.segments.length; k++) {
        const segment = snake.segments[k];
        
        const dx = head.x - segment.x;
        const dy = head.y - segment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 10) {
          this.killSnake(i);
          break;
        }
      }
    }
  }
  
  // Update the leaderboard
  private updateLeaderboard(): void {
    const leaderboard = this.state.snakes
      .map(snake => ({
        id: snake.id,
        name: snake.name,
        score: snake.score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
    
    this.state.leaderboard = leaderboard;
  }
  
  // Get the current game state
  public getState(): GameState {
    return this.state;
  }

  // Get a player's rank in the game
  public getPlayerRank(playerId: string): number {
    const state = this.getState();
    
    // Sort snakes by score
    const sortedSnakes = [...state.snakes].sort((a, b) => b.score - a.score);
    
    // Find the player's position (0-based)
    const playerIndex = sortedSnakes.findIndex(snake => snake.id === playerId);
    
    // Return 1-based position, or 0 if not found
    return playerIndex >= 0 ? playerIndex + 1 : 0;
  }

  private killSnake(index: number, killer?: Snake): void {
    const snake = this.state.snakes[index];
    if (!snake || !snake.alive) return;
    
    // Set snake to dead
    snake.alive = false;
    
    // If there's a killer, increment their score based on the dead snake's length
    if (killer && killer.id !== snake.id) {
      const scoreGain = Math.floor(snake.segments.length * 10);
      killer.score += scoreGain;
      killer.kills += 1; // Increment kill count
      killer.lastKill = snake.id; // Track the last player killed
      
      // Create a kill event
      this.emitEvent('playerKill', { 
        playerId: killer.id, 
        killedId: snake.id,
        scoreGain,
        at: { 
          x: snake.segments[0].x, 
          y: snake.segments[0].y 
        }
      });
    }
    
    // Convert snake segments to food particles and add them to the state
    for (let i = 0; i < snake.segments.length; i++) {
      if (i % 3 === 0) { // Only create food for every 3rd segment to reduce lag
        this.state.foods.push({
          id: `food-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          position: { x: snake.segments[i].x, y: snake.segments[i].y },
          value: 1,
          color: snake.color,
          radius: 3,
          glowIntensity: 0.5
        });
      }
    }
    
    // Create death event
    this.emitEvent('playerDeath', { 
      playerId: snake.id,
      at: { 
        x: snake.segments[0].x, 
        y: snake.segments[0].y 
      },
      killerId: killer?.id
    });
  }
} 