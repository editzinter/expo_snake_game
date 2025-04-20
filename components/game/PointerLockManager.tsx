"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface PointerLockManagerProps {
  children: ReactNode;
  onLockChange?: (isLocked: boolean) => void;
  autoLock?: boolean;
  disabled?: boolean;
}

/**
 * A component that manages pointer lock functionality for game controls
 */
export default function PointerLockManager({
  children,
  onLockChange,
  autoLock = false,
  disabled = false
}: PointerLockManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // Handle pointer lock changes
  useEffect(() => {
    const handlePointerLockChange = () => {
      const newLockedState = document.pointerLockElement === containerRef.current;
      setIsLocked(newLockedState);
      onLockChange?.(newLockedState);
    };
    
    const handlePointerLockError = (e: Event) => {
      console.error("Pointer lock error:", e);
      setIsLocked(false);
      onLockChange?.(false);
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      
      // Release pointer lock when component unmounts
      if (document.pointerLockElement === containerRef.current) {
        document.exitPointerLock();
      }
    };
  }, [onLockChange]);
  
  // Request pointer lock
  const requestLock = useCallback(() => {
    if (disabled || !containerRef.current) return;
    
    try {
      containerRef.current.requestPointerLock();
    } catch (err) {
      console.error("Failed to request pointer lock:", err);
    }
  }, [disabled]);
  
  // Exit pointer lock
  const exitLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);
  
  // Handle click to lock
  const handleClick = useCallback(() => {
    if (!isLocked && !disabled) {
      requestLock();
    }
  }, [isLocked, disabled, requestLock]);
  
  // Auto lock on mount if needed
  useEffect(() => {
    if (autoLock && !disabled) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        requestLock();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoLock, disabled, requestLock]);
  
  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      style={{ 
        cursor: isLocked ? 'none' : 'default',
        width: '100%',
        height: '100%'
      }}
      className="relative overflow-hidden"
    >
      {children}
    </div>
  );
}

// Export hooks for external usage
export function usePointerLock() {
  const [isLocked, setIsLocked] = useState(false);
  
  const requestLock = useCallback((element: HTMLElement) => {
    try {
      element.requestPointerLock();
    } catch (err) {
      console.error("Failed to request pointer lock:", err);
    }
  }, []);
  
  const exitLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);
  
  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsLocked(!!document.pointerLockElement);
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);
  
  return { isLocked, requestLock, exitLock };
} 