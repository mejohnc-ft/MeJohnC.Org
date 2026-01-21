/**
 * Carousel3D Component
 *
 * CentrexStyle 3D flywheel card carousel.
 * Animated rotating cards with depth perspective.
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Carousel3DProps, CentrexColor } from '../schemas';

const colorMap: Record<CentrexColor, string> = {
  green: '#3dae2b',
  blue: '#0071ce',
  orange: '#ff8300',
  red: '#e1251b',
};

function getIconClass(iconName: string): string {
  const iconMap: Record<string, string> = {
    rocket: 'fa-solid fa-rocket',
    chart: 'fa-solid fa-chart-line',
    users: 'fa-solid fa-users',
    code: 'fa-solid fa-code',
    gear: 'fa-solid fa-gear',
    star: 'fa-solid fa-star',
    bolt: 'fa-solid fa-bolt',
    shield: 'fa-solid fa-shield',
  };
  return iconMap[iconName.toLowerCase()] || `fa-solid fa-${iconName}`;
}

export function Carousel3D({ cards, autoRotate = false, rotationSpeed = 5 }: Carousel3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoRotate);

  const totalCards = cards.length;
  const anglePerCard = 360 / totalCards;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalCards);
    }, rotationSpeed * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, totalCards, rotationSpeed]);

  const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % totalCards);

  return (
    <div className="w-full">
      {/* Carousel Stage */}
      <div
        className="relative h-[400px] mx-auto"
        style={{ perspective: '1500px' }}
      >
        <div
          className="relative w-80 h-full mx-auto"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {cards.map((card, index) => {
            const rotation = (index - currentIndex) * anglePerCard;
            const isActive = index === currentIndex;
            const color = colorMap[card.color || 'green'];

            return (
              <div
                key={index}
                className={cn(
                  'absolute w-full h-full bg-[#121212] border border-[#262626] rounded-2xl p-6',
                  'flex flex-col transition-all duration-500',
                  isActive ? 'opacity-100' : 'opacity-40'
                )}
                style={{
                  transform: `rotateY(${rotation}deg) translateZ(300px)`,
                  boxShadow: isActive
                    ? '0 20px 50px -12px rgba(0,0,0,0.9)'
                    : '0 10px 30px -12px rgba(0,0,0,0.5)',
                }}
              >
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <i className={getIconClass(card.icon)} />
                  </div>
                  <span className="text-lg font-bold text-[#e5e5e5]">{card.title}</span>
                </div>

                {/* Card Body */}
                <p className="text-sm text-[#a3a3a3] leading-relaxed mb-5 flex-grow">
                  {card.body}
                </p>

                {/* Stat Box */}
                {card.statValue && (
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div
                      className="text-xl font-bold bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${color}, ${color}88)`,
                      }}
                    >
                      {card.statValue}
                    </div>
                    {card.statLabel && (
                      <div className="text-xs text-[#a3a3a3] uppercase">
                        {card.statLabel}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 mt-5">
        <div className="flex items-center gap-5 bg-[#1a1a1a] px-6 py-2.5 rounded-full border border-[#262626]">
          <button
            onClick={goToPrev}
            className="w-11 h-11 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center text-[#e5e5e5] transition-all hover:bg-[#3dae2b] hover:border-[#3dae2b] hover:scale-110"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center text-[#e5e5e5] transition-all hover:bg-[#3dae2b] hover:border-[#3dae2b] hover:scale-110"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={goToNext}
            className="w-11 h-11 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center text-[#e5e5e5] transition-all hover:bg-[#3dae2b] hover:border-[#3dae2b] hover:scale-110"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex
                ? 'bg-[#3dae2b] w-6'
                : 'bg-[#262626] hover:bg-[#525252]'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default Carousel3D;
