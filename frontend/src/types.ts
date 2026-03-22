import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Tab = 'home' | 'shelter' | 'route' | 'time';

export interface WeatherData {
  wbgt: number;
  temp: number;
  rain: number;
  status: 'SAFE' | 'CAUTION' | 'DANGER';
  lastUpdated: string;
}

export interface Shelter {
  id: string;
  name: string;
  distance: string;
  time: string;
  isOpen: boolean;
  lat: number;
  lng: number;
}

export interface TimeWindow {
  time: string;
  temp: number;
  condition: string;
  score: number;
  type: 'optimal' | 'endurance' | 'warning';
}
