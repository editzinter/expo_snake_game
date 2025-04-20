import { Point } from './models';

export interface TrailSegment {
  position: Point;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class TrailSystem {
  private trails: Map<string, TrailSegment[]> = new Map();
  
  // Add a trail segment for a snake
  public addTrail(snakeId: string, position: Point, color: string, radius: number): void {
    if (!this.trails.has(snakeId)) {
      this.trails.set(snakeId, []);
    }
    
    const trail = this.trails.get(snakeId);
    
    // Add new trail segment
    trail?.push({
      position: { ...position },
      color,
      radius,
      alpha: 0.7,
      life: 1.0,
      maxLife: 1.0
    });
    
    // Limit trail length to avoid performance issues
    const maxTrailLength = 40;
    if (trail && trail.length > maxTrailLength) {
      // Remove oldest segments
      trail.splice(0, trail.length - maxTrailLength);
    }
  }
  
  // Clear trails for a specific snake
  public clearTrail(snakeId: string): void {
    this.trails.delete(snakeId);
  }
  
  // Clear all trails
  public clearAllTrails(): void {
    this.trails.clear();
  }
  
  // Update all trails
  public update(deltaTime: number): void {
    const decayRate = deltaTime / 1000 * 0.5; // Adjust trail decay speed
    
    // Use Array.from to convert Map entries to an array for iteration
    Array.from(this.trails.entries()).forEach(([snakeId, trail]) => {
      // Update each trail segment
      for (let i = trail.length - 1; i >= 0; i--) {
        const segment = trail[i];
        
        // Reduce life
        segment.life -= decayRate;
        segment.alpha = segment.life;
        
        // Remove dead segments
        if (segment.life <= 0) {
          trail.splice(i, 1);
        }
      }
      
      // Remove empty trails
      if (trail.length === 0) {
        this.trails.delete(snakeId);
      }
    });
  }
  
  // Draw all trails
  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number, width: number, height: number): void {
    // Only draw trails that are in view
    const screenLeft = cameraX - width / 2 / zoom;
    const screenRight = cameraX + width / 2 / zoom;
    const screenTop = cameraY - height / 2 / zoom;
    const screenBottom = cameraY + height / 2 / zoom;
    
    // Use Array.from to convert Map values to an array for iteration
    Array.from(this.trails.values()).forEach(trail => {
      for (const segment of trail) {
        // Skip segments outside the view
        if (
          segment.position.x < screenLeft - segment.radius ||
          segment.position.x > screenRight + segment.radius ||
          segment.position.y < screenTop - segment.radius ||
          segment.position.y > screenBottom + segment.radius
        ) {
          continue;
        }
        
        // Draw trail segment with glow
        ctx.save();
        
        // Glow effect
        ctx.shadowBlur = segment.radius * 2;
        ctx.shadowColor = segment.color;
        ctx.globalAlpha = segment.alpha * 0.3;
        
        // Draw outer glow
        ctx.fillStyle = segment.color;
        ctx.beginPath();
        ctx.arc(segment.position.x, segment.position.y, segment.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw inner trail
        ctx.globalAlpha = segment.alpha * 0.7;
        ctx.beginPath();
        ctx.arc(segment.position.x, segment.position.y, segment.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    });
  }
} 