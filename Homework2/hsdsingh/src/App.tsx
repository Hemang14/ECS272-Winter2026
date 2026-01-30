import { useState, useCallback } from 'react';
import { CountryMedalsStackedBar } from './components/CountryMedalsStackedBar';
import { MedalHeatmap } from './components/MedalHeatmap';
import { MedalFlowSankey } from './components/MedalFlowSankey';
import { MedalData } from './utils/types';

import './App.css';

function App() {
  const [topCountries, setTopCountries] = useState<MedalData[]>([]);
  const [topN, setTopN] = useState(12);

  const handleDataLoaded = useCallback((data: MedalData[]) => {
    const sorted = [...data].sort((a, b) => b.Total - a.Total);
    setTopCountries(sorted);
  }, []);

  return (
    <div className="dashboard">
      <div className="card-block">
        <div className="overview card">
          <div className="section-label">Overview</div>
          <div className="control-row">
            <label htmlFor="top-n" className="control-label">Top N:</label>
            <select
              id="top-n"
              className="control-select"
              value={topN}
              onChange={(event) => setTopN(Number(event.target.value))}
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={15}>15</option>
            </select>
          </div>
          <div className="visualization-container">
            <CountryMedalsStackedBar topN={topN} onDataLoaded={handleDataLoaded} />
          </div>
        </div>
      </div>
      <div className="detail-views">
        <div className="card-block">
          <div className="heatmap card">
            <div className="section-label">Context</div>
            <div className="visualization-container">
              <MedalHeatmap topCountries={topCountries.slice(0, 10)} />
            </div>
          </div>
        </div>
        <div className="card-block">
          <div className="sankey card">
            <div className="section-label">Focus</div>
            <div className="visualization-container">
              <MedalFlowSankey topCountries={topCountries.slice(0, 8)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
