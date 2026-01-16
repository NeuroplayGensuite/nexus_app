'use client';

import PizzaParty from './PizzaParty';

interface CricketForgeProps {
  onComplete: (metrics: {
    subitizingThreshold: number;
    subitizingFailed: boolean;
    symbolicMappingSpeed: number;
    accuracy: number;
  }) => void;
}

export default function CricketForge({ onComplete }: CricketForgeProps) {
  return <PizzaParty onComplete={onComplete} />;
}
