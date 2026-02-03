'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

export function ParticlesBackground() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setEngineReady(true);
    });
  }, []);

  if (!mounted || !engineReady) return null;

  const isDark = theme === 'dark';

  return (
    <Particles
      id="tsparticles"
      className="fixed inset-0 z-0 pointer-events-none"
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: { enable: true, mode: 'push' },
            onHover: { enable: true, mode: 'repulse' },
            resize: {},
          },
          modes: {
            push: { quantity: 4 },
            repulse: { distance: 200, duration: 0.4 },
          },
        },
        particles: {
          color: {
            value: isDark
              ? ['#9945ff', '#14f195', '#8b5cf6']
              : ['#8b5cf6', '#a78bfa', '#6366f1'],
          },
          links: {
            color: isDark ? '#9945ff' : '#8b5cf6',
            distance: 150,
            enable: true,
            opacity: isDark ? 0.3 : 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1,
            outModes: { default: 'bounce' },
          },
          number: {
            density: {
              enable: true,
              width: 800,
              height: 800,
            },
            value: 80,
          },
          opacity: { value: isDark ? 0.5 : 0.3 },
          shape: { type: 'circle' },
          size: { value: { min: 1, max: 5 } },
        },
        detectRetina: true,
      }}
    />
  );
}