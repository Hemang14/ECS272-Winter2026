import { MedalData, SportMedalData } from './types';
import { DATA_BASE, SPORT_FILES } from '../config/dataFiles';

export interface LoadResult {
  data: Record<string, SportMedalData[]>;
  failedFiles: string[];
  totalRows: number;
}

export const loadMedalTotalData = async (): Promise<MedalData[]> => {
  try {
    console.log('Loading medals_total.csv from:', `${DATA_BASE}/medals_total.csv`);
    const response = await fetch(`${DATA_BASE}/medals_total.csv`);
    
    if (!response.ok) {
      throw new Error(`Failed to load medals_total.csv: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0];
    
    return rows.slice(1)
      .filter(row => row.length === headers.length)
      .map(row => {
        const entry: Record<string, string> = {};
        headers.forEach((header, i) => entry[header] = row[i]);
        return {
          country_code: entry['country_code'] || '',
          country: entry['country'] || '',
          'Gold Medal': +(entry['Gold Medal'] || 0),
          'Silver Medal': +(entry['Silver Medal'] || 0),
          'Bronze Medal': +(entry['Bronze Medal'] || 0),
          Total: +(entry['Total'] || 0)
        };
      });
  } catch (error) {
    console.error('Error loading medal data:', error);
    throw error;
  }
};

export const loadSportData = async (filename: string): Promise<SportMedalData[]> => {
  try {
    const url = `${DATA_BASE}/${encodeURIComponent(filename)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0];

    return rows.slice(1)
      .filter(row => row.length === headers.length)
      .map(row => {
        const entry: Record<string, string> = {};
        headers.forEach((header, i) => entry[header] = row[i]);
        return {
          gender: entry['gender'] || '',
          event: entry['event'] || '',
          participant_code: entry['participant_code'] || '',
          participant_country: entry['participant_country'] || '',
          rank: +(entry['rank'] || 0),
          medal_type: (entry['medal_type'] || '') as 'Gold' | 'Silver' | 'Bronze' | '',
          result_mark: entry['result_mark'] || '',
          result_type: entry['result_type'] || ''
        };
      });
  } catch (error) {
    console.error(`Error loading sport data ${filename}:`, error);
    throw error;
  }
};

export const loadAllSportData = async (): Promise<LoadResult> => {
  const results = await Promise.allSettled(
    SPORT_FILES.map(async (filename: string) => {
      try {
        const data = await loadSportData(filename);
        return { filename: filename.replace('.csv', ''), data };
      } catch (error) {
        throw new Error(`Failed to load ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );

  const data: Record<string, SportMedalData[]> = {};
  const failedFiles: string[] = [];
  let totalRows = 0;

  results.forEach((result: PromiseSettledResult<{filename: string; data: SportMedalData[]}>, index: number) => {
    if (result.status === 'fulfilled') {
      data[result.value.filename] = result.value.data;
      totalRows += result.value.data.length;
    } else {
      failedFiles.push(SPORT_FILES[index]);
      console.error(`Failed to load ${SPORT_FILES[index]}: ${result.reason}`);
    }
  });

  return { data, failedFiles, totalRows };
};
