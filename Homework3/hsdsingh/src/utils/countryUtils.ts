export const countryMapping: Record<string, string> = {
  'USA': 'United States',
  'CHN': 'China',
  'GBR': 'Great Britain',
  'FRA': 'France',
  'AUS': 'Australia',
  'JPN': 'Japan',
  'ITA': 'Italy',
  'NED': 'Netherlands',
  'GER': 'Germany',
  'KOR': 'Korea',
  'CAN': 'Canada',
  'NZL': 'New Zealand'
};

export const getCountryName = (code: string): string => {
  return countryMapping[code] || code;
};

export const getCountryCode = (name: string): string => {
  const entry = Object.entries(countryMapping).find(([_, fullName]) => fullName === name);
  return entry ? entry[0] : name;
};
