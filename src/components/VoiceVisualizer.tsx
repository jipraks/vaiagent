import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel?: number;
  className?: string;
}

// Helper function to get CSS variable value
const getCSSVariable = (variable: string): string => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  
  // Convert HSL values to proper color string
  if (value) {
    return `hsl(${value})`;
  }
  return '#000000'; // fallback
};

export const VoiceVisualizer = ({ isActive, audioLevel = 0, className }: VoiceVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Get CSS variable colors once
    const primaryColor = getCSSVariable('--primary');
    const secondaryColor = getCSSVariable('--secondary');
    const accentColor = getCSSVariable('--accent');
    const backgroundColor = getCSSVariable('--background');

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rotate the canvas
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);
      ctx.translate(-centerX, -centerY);

      // Create gradient disc
      const gradient = ctx.createConicGradient(0, centerX, centerY);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(0.25, accentColor);
      gradient.addColorStop(0.5, primaryColor);
      gradient.addColorStop(0.75, secondaryColor);
      gradient.addColorStop(1, primaryColor);

      // Draw main disc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw inner segments with audio reactivity
      const segments = 12;
      const segmentAngle = (Math.PI * 2) / segments;
      
      for (let i = 0; i < segments; i++) {
        const angle = i * segmentAngle;
        const nextAngle = (i + 1) * segmentAngle;
        
        const reactiveRadius = isActive ? radius * (0.9 - audioLevel * 0.1) : radius * 0.9;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, reactiveRadius, angle, nextAngle);
        ctx.closePath();
        
        const alpha = i % 2 === 0 ? 0.3 : 0.1;
        ctx.fillStyle = `${backgroundColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      }

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
      ctx.fillStyle = backgroundColor;
      ctx.fill();

      ctx.restore();

      // Update rotation
      if (isActive) {
        rotationRef.current += 0.01 + audioLevel * 0.02;
      } else {
        rotationRef.current += 0.002;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="w-full h-full max-w-[400px] max-h-[400px]"
      />
    </div>
  );
};
