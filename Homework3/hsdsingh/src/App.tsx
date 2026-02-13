import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CountryMedalsStackedBar } from './components/CountryMedalsStackedBar';
import { MedalHeatmap } from './components/MedalHeatmap';
import { MedalFlowSankey } from './components/MedalFlowSankey';
import { MedalData } from './utils/types';

import './App.css';

const MEDAL_SEQUENCE: Array<'all' | 'gold' | 'silver' | 'bronze'> = ['all', 'gold', 'silver', 'bronze'];

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }>{
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-message error" style={{ padding: '24px' }}>
          Failed to render dashboard: {this.state.message || 'Unknown error'}
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [topCountries, setTopCountries] = useState<MedalData[]>([]);
  const [topN, setTopN] = useState(12);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedMedalType, setSelectedMedalType] = useState<'all' | 'gold' | 'silver' | 'bronze'>('all');
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const storyIntervalRef = useRef<number | null>(null);


  const handleDataLoaded = useCallback((data: MedalData[]) => {
    const sorted = [...data].sort((a, b) => b.Total - a.Total);
    setTopCountries(sorted);
  }, []);

  const medalLabel = selectedMedalType[0].toUpperCase() + selectedMedalType.slice(1);
  const selectedLabel = selectedCountry ?? 'All';

  useEffect(() => {
    if (!isStoryPlaying) {
      if (storyIntervalRef.current) {
        window.clearInterval(storyIntervalRef.current);
        storyIntervalRef.current = null;
      }
      return;
    }

    if (!storyIntervalRef.current) {
      storyIntervalRef.current = window.setInterval(() => {
        setSelectedMedalType(prev => {
          const currentIndex = MEDAL_SEQUENCE.indexOf(prev);
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % MEDAL_SEQUENCE.length;
          return MEDAL_SEQUENCE[nextIndex];
        });
      }, 2500);
    }

    return () => {
      if (storyIntervalRef.current) {
        window.clearInterval(storyIntervalRef.current);
        storyIntervalRef.current = null;
      }
    };
  }, [isStoryPlaying]);

  return (
    <ErrorBoundary>
      <div className="dashboard">
      <div className="card-block">
        <div className="overview card">
          <div className="section-label">Overview</div>
          <div className="filter-annotation">
            <span>Selected: {selectedLabel}</span>
            <span>Medal: {medalLabel}</span>
          </div>
          <div className="controls-container">
            <div className="control-row">
              <label htmlFor="top-n" className="control-label">Top N Countries:</label>
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
            <div className="control-row">
              <label htmlFor="medal-type" className="control-label">Medal Type:</label>
              <select
                id="medal-type"
                className="control-select medal-select"
                value={selectedMedalType}
                onChange={(event) => setSelectedMedalType(event.target.value as 'all' | 'gold' | 'silver' | 'bronze')}
              >
                <option value="all">All</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </select>
              <button
                type="button"
                className="story-button"
                onClick={() => setIsStoryPlaying(prev => !prev)}
              >
                {isStoryPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
            {selectedCountry && (
              <button 
                className="clear-button"
                onClick={() => setSelectedCountry(null)}
              >
                Clear Selection
              </button>
            )}
          </div>
          <div className="visualization-container">
            <CountryMedalsStackedBar 
              topN={topN} 
              onDataLoaded={handleDataLoaded}
              selectedCountry={selectedCountry}
              selectedMedalType={selectedMedalType}
              onCountrySelect={setSelectedCountry}
            />
          </div>
        </div>
      </div>
      <div className="detail-views">
        <div className="card-block">
          <div className="heatmap card">
            <div className="section-label">Context</div>
            <div className="filter-annotation">
              <span>Selected: {selectedLabel}</span>
              <span>Medal: {medalLabel}</span>
            </div>
            <div className="visualization-container">
              <MedalHeatmap 
                topCountries={topCountries} 
                selectedCountry={selectedCountry}
                selectedMedalType={selectedMedalType}
              />
            </div>
          </div>
        </div>
        <div className="card-block">
          <div className="sankey card">
            <div className="section-label">Focus</div>
            <div className="filter-annotation">
              <span>Selected: {selectedLabel}</span>
              <span>Medal: {medalLabel}</span>
            </div>
            <div className="visualization-container">
              <MedalFlowSankey 
                topCountries={topCountries} 
                selectedCountry={selectedCountry}
                selectedMedalType={selectedMedalType}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
