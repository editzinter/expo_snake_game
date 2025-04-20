export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.5;
  private isAudioAvailable: boolean = true;

  private constructor() {
    this.initSounds();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initSounds() {
    try {
      // Check if Web Audio API is supported
      // @ts-ignore - webkitAudioContext might not be in all TypeScript definitions
      if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
        console.warn('Web Audio API is not supported in this browser');
        this.isAudioAvailable = false;
        return;
      }

      // Background music
      this.backgroundMusic = this.createAudio('/sounds/space-ambient.mp3');
      if (this.backgroundMusic) {
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.musicVolume;
      }

      // Food collection sounds
      this.createAndAddSound('food-collect-1', '/sounds/food-collect-1.mp3');
      this.createAndAddSound('food-collect-2', '/sounds/food-collect-2.mp3');
      this.createAndAddSound('food-collect-3', '/sounds/food-collect-3.mp3');
      
      // Special food collection
      this.createAndAddSound('special-food', '/sounds/special-food.mp3');
      
      // Death sounds
      this.createAndAddSound('death', '/sounds/death.mp3');
      this.createAndAddSound('death-border', '/sounds/death-border.mp3');
      
      // Other game sounds
      this.createAndAddSound('game-start', '/sounds/game-start.mp3');
      
      // Set volume for all sound effects
      this.sounds.forEach(sound => {
        sound.volume = this.sfxVolume;
      });
    } catch (error) {
      console.warn('Error initializing sounds:', error);
      this.isAudioAvailable = false;
    }
  }

  private createAudio(src: string): HTMLAudioElement | null {
    try {
      const audio = new Audio(src);
      
      // Add error handler
      audio.addEventListener('error', (e) => {
        console.warn(`Error loading audio file ${src}:`, e);
      });
      
      return audio;
    } catch (error) {
      console.warn(`Error creating audio for ${src}:`, error);
      return null;
    }
  }

  private createAndAddSound(name: string, src: string): void {
    const audio = this.createAudio(src);
    if (audio) {
      this.sounds.set(name, audio);
    }
  }

  public playBackgroundMusic(): void {
    if (this.isMuted || !this.backgroundMusic || !this.isAudioAvailable) return;
    
    // Try to play music with a catch for browsers that block autoplay
    try {
      this.backgroundMusic.play().catch(error => {
        console.warn('Background music autoplay was prevented:', error);
      });
    } catch (error) {
      console.warn('Error playing background music:', error);
    }
  }

  public stopBackgroundMusic(): void {
    if (!this.backgroundMusic || !this.isAudioAvailable) return;
    
    try {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    } catch (error) {
      console.warn('Error stopping background music:', error);
    }
  }

  public playSound(soundName: string): void {
    if (this.isMuted || !this.isAudioAvailable) return;
    
    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }
    
    // Clone the audio to allow overlapping sounds
    try {
      const soundClone = sound.cloneNode(true) as HTMLAudioElement;
      soundClone.volume = this.sfxVolume;
      
      soundClone.play().catch(error => {
        console.warn(`Sound '${soundName}' play was prevented:`, error);
      });
    } catch (error) {
      console.warn(`Error playing sound '${soundName}':`, error);
    }
  }

  public playRandomFoodSound(): void {
    if (this.isMuted || !this.isAudioAvailable) return;
    
    const soundIndex = Math.floor(Math.random() * 3) + 1;
    this.playSound(`food-collect-${soundIndex}`);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
    
    return this.isMuted;
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    if (this.backgroundMusic && this.isAudioAvailable) {
      this.backgroundMusic.volume = this.musicVolume;
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, volume));
    if (this.isAudioAvailable) {
      this.sounds.forEach(sound => {
        sound.volume = this.sfxVolume;
      });
    }
  }

  public isMutedStatus(): boolean {
    return this.isMuted;
  }

  public isAudioSupported(): boolean {
    return this.isAudioAvailable;
  }
}

export const soundManager = SoundManager.getInstance(); 