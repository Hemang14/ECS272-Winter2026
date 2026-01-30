export interface MedalData {
  country_code: string;
  country: string;
  "Gold Medal": number;
  "Silver Medal": number;
  "Bronze Medal": number;
  Total: number;
}

export interface SportMedalData {
  gender: string;
  event: string;
  participant_code: string;
  participant_country: string;
  rank: number;
  medal_type: 'Gold' | 'Silver' | 'Bronze' | '';
  result_mark: string;
  result_type: string;
}

export const MEDAL_COLORS = {
  "Gold Medal": "#d4af37",
  "Silver Medal": "#c0c0c0",
  "Bronze Medal": "#cd7f32",
} as const;

export type MedalType = keyof typeof MEDAL_COLORS;

export interface StackedBarData {
  key: MedalType;
  data: MedalData;
}

export const SPORT_LIST = [
  "Swimming",
  "Athletics",
  "Judo",
  "Shooting",
  // Add more sports here as needed
] as const;

export type Sport = typeof SPORT_LIST[number];

export interface Dimensions {
  width: number;
  height: number;
}
