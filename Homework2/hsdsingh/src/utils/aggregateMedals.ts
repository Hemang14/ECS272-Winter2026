import { MedalData, SportMedalData } from './types';

export const getTopCountries = (medalData: MedalData[], limit: number = 15): MedalData[] => {
  return [...medalData]
    .sort((a, b) => b.Total - a.Total)
    .slice(0, limit);
};

export const aggregateSportMedals = (
  sportData: Record<string, SportMedalData[]>,
  countries: string[]
): Array<{ sport: string; country: string; medals: number }> => {
  const result: Array<{ sport: string; country: string; medals: number }> = [];

  Object.entries(sportData).forEach(([sport, data]) => {
    countries.forEach(country => {
      const medals = data.filter(
        d => d.participant_country === country && 
        ['Gold', 'Silver', 'Bronze'].includes(d.medal_type)
      ).length;

      result.push({ sport, country, medals });
    });
  });

  return result;
};

export const prepareSankeyData = (
  sportData: Record<string, SportMedalData[]>,
  countries: string[]
) => {
  // This will be implemented in the next phase
  return {
    nodes: [],
    links: []
  };
};
