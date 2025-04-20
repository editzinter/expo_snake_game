export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles: number = 1000; // Limit total particles for performance
  
  createExplosion(x: number, y: number, color: string, count: number, size: number = 3, speed: number = 3): void {
    // Limit particle count if we're approaching the max
    if (this.particles.length > this.maxParticles * 0.9) {
      count = Math.floor(count / 2); // Reduce the count
    }
    
    // Don't add particles if we're at the limit
    if (this.particles.length >= this.maxParticles) {
      return;
    }
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        size: Math.random() * size + 1,
        life: 1,
        maxLife: 1,
        alpha: 1
      });
    }
  }
  
  createFoodEffect(x: number, y: number, color: string): void {
    this.createExplosion(x, y, color, 15, 3, 2);
  }
  
  createDeathEffect(x: number, y: number): void {
    // Create a larger explosion with multiple colors
    this.createExplosion(x, y, '#FF5555', 20, 4, 4);
    this.createExplosion(x, y, '#FFAAAA', 10, 3, 3);
    this.createExplosion(x, y, '#FFFFFF', 15, 2, 5);
  }
  
  createBoostEffect(x: number, y: number, direction: { x: number, y: number }, speed: number, color: string): void {
    // Only create boost effect if moving fast enough
    if (speed < 3) return;
    
    // Limit particles for performance
    if (this.particles.length >= this.maxParticles) return;
    
    // Normalize direction
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length === 0) return;
    
    const normalizedDir = {
      x: direction.x / length,
      y: direction.y / length
    };
    
    // Create particles in the opposite direction of movement
    const particleCount = Math.min(Math.floor(speed * 2), 8); // Cap at 8 for performance
    
    for (let i = 0; i < particleCount; i++) {
      // Add randomness to the direction
      const angle = Math.atan2(-normalizedDir.y, -normalizedDir.x);
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5; // Spread angle
      
      // Random speed based on snake speed
      const particleSpeed = Math.random() * speed * 0.5;
      
      // Create a trail particle
      this.particles.push({
        x,
        y,
        vx: Math.cos(spreadAngle) * particleSpeed,
        vy: Math.sin(spreadAngle) * particleSpeed,
        color: color,
        size: Math.random() * 2 + 1,
        life: 0.5,
        maxLife: 0.5,
        alpha: 0.7
      });
    }
  }
  
  createBoostTrail(x: number, y: number, direction: { x: number, y: number }, color: string): void {
    // Skip if we're at the particle limit to maintain performance
    if (this.particles.length >= this.maxParticles) return;
    
    // Normalize direction for opposite trail effect
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length === 0) return;
    
    const normalizedDir = {
      x: direction.x / length,
      y: direction.y / length
    };
    
    // Create particles exactly at the position for better positioning
    // For boost, use fixed particle count for consistency
    const particleCount = 4; // Use fewer particles for better performance
    
    for (let i = 0; i < particleCount; i++) {
      // Create particles directly at the segment position with minimal spread
      // This ensures they appear to follow the snake precisely
      const angle = Math.atan2(-normalizedDir.y, -normalizedDir.x);
      const spreadAngle = angle + (Math.random() - 0.5) * 0.3; // Reduced spread
      
      // Lower particle speed for more controlled trail
      const particleSpeed = 1 + Math.random() * 1.5;
      
      // Random color variations based on main color
      let particleColor = color;
      if (color.startsWith('#')) {
        // Add white/bright variations
        if (Math.random() > 0.7) {
          particleColor = '#FFFFFF';
        }
      }
      
      // Create a trail particle with exact positioning
      this.particles.push({
        x: x, // Exact position
        y: y, // Exact position 
        vx: Math.cos(spreadAngle) * particleSpeed,
        vy: Math.sin(spreadAngle) * particleSpeed,
        color: particleColor,
        size: Math.random() * 2.5 + 2, // Slightly larger particles
        life: 0.7, // Longer life for more visible trail
        maxLife: 0.7,
        alpha: 0.9 // Higher initial alpha
      });
    }
  }
  
  update(deltaTime: number): void {
    const decay = deltaTime / 1000; // Convert to seconds
    
    // If we have too many particles, decay them faster
    const decayMultiplier = 
      this.particles.length > this.maxParticles * 0.8 ? 
        1.5 : // Faster decay when near capacity
        1.0;  // Normal decay otherwise
    
    // Use filter for particles
    this.particles = this.particles.filter(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Update life with decay rate
      particle.life -= decay * 0.5 * decayMultiplier;
      particle.alpha = particle.life;
      
      // Keep if still alive
      return particle.life > 0;
    });
  }
  
  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number, width: number, height: number): void {
    // Only draw particles that are in view
    const screenLeft = cameraX - width / 2 / zoom;
    const screenRight = cameraX + width / 2 / zoom;
    const screenTop = cameraY - height / 2 / zoom;
    const screenBottom = cameraY + height / 2 / zoom;
    
    // Batch drawing by setting common properties once
    ctx.save();
    
    // Draw particles in a single loop for better performance
    for (const particle of this.particles) {
      // Skip particles outside the view for performance
      if (
        particle.x < screenLeft - 10 ||
        particle.x > screenRight + 10 ||
        particle.y < screenTop - 10 ||
        particle.y > screenBottom + 10
      ) {
        continue;
      }
      
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Restore the context once after all particles
    ctx.restore();
  }
  
  clear(): void {
    this.particles = [];
  }
} 