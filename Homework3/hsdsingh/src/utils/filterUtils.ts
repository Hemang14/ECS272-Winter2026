import { MedalType } from '../App';
import { MedalData } from './types';

export const filterMedalsByType = (data: Record<string, number>[], medalType: MedalType): Record<string, number>[] => {
  if (medalType === 'all') return data;
  
  return data.map(row => {
    const filtered: Record<string, number> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key.toLowerCase().includes(medalType.toLowerCase())) {
        filtered[key] = value;
      } else {
        filtered[key] = 0;
      }
    });
    return filtered;
  });
};

export const filterBySelectedCountries = (data: any[], selectedCountries: string[], countryKey = 'country'): any[] => {
  if (!selectedCountries.length) return data;
  return data.filter(row => selectedCountries.includes(row[countryKey]));
};

export const getTopSportsByMedals = (sportData: Record<string, number>[], n = 12): string[] => {
  const sportTotals = new Map<string, number>();
  
  sportData.forEach(row => {
    Object.entries(row).forEach(([sport, count]) => {
      if (sport !== 'country' && sport !== 'country_code') {
        sportTotals.set(sport, (sportTotals.get(sport) || 0) + count);
      }
    });
  });
  
  return Array.from(sportTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([sport]) => sport);
};

export const getTopCountriesByMedals = (data: MedalData[], n = 12): string[] => {
  return [...data]
    .sort((a, b) => b.Total - a.Total)
    .slice(0, n)
    .map(d => d.country);
};
