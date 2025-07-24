import React, { useEffect, useState } from "react";

const Fireworks = ({ trigger, onComplete }) => {
  const [particles, setParticles] = useState([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      createFireworks();

      // Clean up after animation
      const timer = setTimeout(() => {
        setIsActive(false);
        setParticles([]);
        if (onComplete) onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger]);

  const createFireworks = () => {
    const newParticles = [];
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
      "#54a0ff",
    ];

    // Create multiple firework bursts
    for (let burst = 0; burst < 5; burst++) {
      const burstX = Math.random() * window.innerWidth;
      const burstY =
        Math.random() * (window.innerHeight * 0.7) + window.innerHeight * 0.15;

      for (let i = 0; i < 25; i++) {
        const angle = (Math.PI * 2 * i) / 25;
        const velocity = 4 + Math.random() * 3;
        const color = colors[Math.floor(Math.random() * colors.length)];

        newParticles.push({
          id: `${burst}-${i}`,
          x: burstX,
          y: burstY,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          color,
          life: 1,
          decay: 0.015 + Math.random() * 0.015,
          size: 4 + Math.random() * 4,
        });
      }
    }

    setParticles(newParticles);
    animateParticles();
  };

  const animateParticles = () => {
    setParticles((prevParticles) => {
      const updated = prevParticles
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.1, // gravity
          life: particle.life - particle.decay,
          size: particle.size * 0.99,
        }))
        .filter((particle) => particle.life > 0);

      if (updated.length > 0) {
        requestAnimationFrame(animateParticles);
      }

      return updated;
    });
  };

  if (!isActive) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: "absolute",
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: "50%",
            opacity: particle.life,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
            filter: "blur(0.5px)",
          }}
        />
      ))}

      {/* Celebration text */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "3rem",
          fontWeight: "bold",
          color: "#ff6b6b",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          animation: "bounce 0.6s ease-in-out",
        }}
      >
        🎉 COMPLETE! 🎉
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          40% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          60% {
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
};

export default Fireworks;
