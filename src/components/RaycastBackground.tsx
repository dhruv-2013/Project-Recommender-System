import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

const RaycastBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.min(120, Math.floor((canvas.width * canvas.height) / 8000));
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.9 + 0.3,
          hue: Math.random() * 60 + 200, // Blue to purple range
        });
      }
      
      particlesRef.current = particles;
    };

    const drawParticle = (particle: Particle) => {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      
      // Dynamic hue based on mouse position
      const mouseDistance = Math.sqrt(
        Math.pow(particle.x - mouseRef.current.x, 2) + 
        Math.pow(particle.y - mouseRef.current.y, 2)
      );
      const hueShift = Math.max(0, 200 - mouseDistance / 5);
      const dynamicHue = particle.hue + hueShift;
      
      // Create gradient for particle
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      gradient.addColorStop(0, `hsl(${dynamicHue}, 70%, 60%)`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawConnections = () => {
      const particles = particlesRef.current;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            const opacity = (150 - distance) / 150 * 0.3;
            
            // Dynamic color based on mouse proximity
            const mouseDistance = Math.sqrt(
              Math.pow((particles[i].x + particles[j].x) / 2 - mouseRef.current.x, 2) + 
              Math.pow((particles[i].y + particles[j].y) / 2 - mouseRef.current.y, 2)
            );
            const hue = 220 + Math.sin(Date.now() * 0.001) * 40 + Math.max(0, 100 - mouseDistance / 3);
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = `hsl(${hue}, 70%, 80%)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    const updateParticles = () => {
      const particles = particlesRef.current;
      
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Subtle opacity animation
        particle.opacity += Math.sin(Date.now() * 0.001 + particle.x * 0.01) * 0.002;
        particle.opacity = Math.max(0.1, Math.min(0.8, particle.opacity));
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background gradient with mouse-responsive colors
      const mouseX = mouseRef.current.x / canvas.width;
      const mouseY = mouseRef.current.y / canvas.height;
      
      const gradient = ctx.createRadialGradient(
        mouseRef.current.x, mouseRef.current.y, 0,
        mouseRef.current.x, mouseRef.current.y, Math.max(canvas.width, canvas.height)
      );
      
      gradient.addColorStop(0, `rgba(${Math.floor(mouseX * 30)}, ${Math.floor(mouseY * 30)}, ${Math.floor(30 + mouseX * 20)}, 0.95)`);
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      updateParticles();
      drawConnections();
      
      // Draw particles
      particlesRef.current.forEach(drawParticle);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    resizeCanvas();
    createParticles();
    animate();

    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default RaycastBackground;