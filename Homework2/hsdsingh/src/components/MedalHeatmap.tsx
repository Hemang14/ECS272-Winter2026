import { useEffect, useRef, useState, type FC } from 'react';
import * as d3 from 'd3';
import { MedalData } from '../utils/types';
import { DATA_BASE, SPORT_FILES } from "../config/dataFiles";

interface DebugInfo {
  sportFiles: string[];
  sportFilesCount: number;
  testUrl: string;
  fetchStatus: string;
  fulfilledCount: number;
  failedCount: number;
  totalRows: number;
  availableKeys: string[];
  medalField: string;
  medalVals: string[];
  rankVals: string[];
}

interface HeatmapData {
  sport: string;
  country: string;
  medals: number;
}

const MARGIN = { top: 60, right: 90, bottom: 80, left: 110 };
const LEGEND_WIDTH = 12;
const LEGEND_HEIGHT = 120;

export const MedalHeatmap: FC<{ topCountries: MedalData[] }> = ({ topCountries: _topCountries }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<HeatmapData[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    sportFiles: [],
    sportFilesCount: 0,
    testUrl: '',
    fetchStatus: '',
    fulfilledCount: 0,
    failedCount: 0,
    totalRows: 0,
    availableKeys: [],
    medalField: 'none',
    medalVals: [],
    rankVals: []
  });

  // Resize observer effect - runs on mount only
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Data loading effect - runs on mount only
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const testUrl = `${DATA_BASE}/${encodeURIComponent(SPORT_FILES[0])}`;
      setDebugInfo(prev => ({ ...prev, testUrl }));

      try {
        const response = await fetch(testUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.text();
        setDebugInfo(prev => ({ ...prev, fetchStatus: 'ok' }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setDebugInfo(prev => ({ ...prev, fetchStatus: msg }));
        setIsLoading(false);
        return;
      }

      try {
        const results = await Promise.allSettled(
          SPORT_FILES.map(filename => {
            const url = `${DATA_BASE}/${encodeURIComponent(filename)}`;
            return d3.csv(url) as Promise<Record<string, string>[]>;
          })
        );

        const fulfilled: Array<{ sport: string; rows: Record<string, string>[] }> = [];
        const failedFiles: string[] = [];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            fulfilled.push({
              sport: SPORT_FILES[index].replace(/\.csv$/i, ''),
              rows: result.value as Record<string, string>[]
            });
          } else {
            failedFiles.push(SPORT_FILES[index]);
          }
        });

        const totalRows = fulfilled.reduce((sum, entry) => sum + entry.rows.length, 0);
        const firstRow = fulfilled[0]?.rows?.[0];
        const availableKeys = firstRow ? Object.keys(firstRow).slice(0, 20) : [];

        const medalField = firstRow
          ? ("medal_type" in firstRow
              ? "medal_type"
              : "medal" in firstRow
                ? "medal"
                : "medalType" in firstRow
                  ? "medalType"
                  : "none")
          : "none";

        const medalValsSet = new Set<string>();
        const rankValsSet = new Set<string>();
        const countryMedals = new Map<string, number>();

        const isMedalValue = (value: unknown) => {
          const normalized = String(value ?? '').trim().toLowerCase();
          return normalized.includes('gold') || normalized.includes('silver') || normalized.includes('bronze');
        };

        const isMedalRank = (value: unknown) => {
          const normalized = String(value ?? '').trim();
          return normalized === '1' || normalized === '2' || normalized === '3' || normalized === '1.0' || normalized === '2.0' || normalized === '3.0';
        };

        const getCountry = (row: Record<string, string>) =>
          row.participant_country || row.country_code || row.country || '';

        fulfilled.forEach(({ rows }) => {
          rows.forEach(row => {
            if (row.rank) {
              rankValsSet.add(String(row.rank));
            }

            const country = getCountry(row);
            if (!country) return;

            if (medalField !== 'none') {
              const medalValue = row[medalField];
              medalValsSet.add(String(medalValue ?? ''));
              if (isMedalValue(medalValue)) {
                countryMedals.set(country, (countryMedals.get(country) || 0) + 1);
              }
              return;
            }

            if (isMedalRank(row.rank)) {
              countryMedals.set(country, (countryMedals.get(country) || 0) + 1);
            }
          });
        });

        const topCountriesLocal = Array.from(countryMedals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([country]) => country);

        const sports = SPORT_FILES.slice(0, 5).map(f => f.replace(/\.csv$/i, ''));
        const dataMatrix: HeatmapData[] = [];

        sports.forEach(sport => {
          const sportRows = fulfilled.find(entry => entry.sport === sport)?.rows || [];

          topCountriesLocal.forEach(country => {
            const count = sportRows.filter(row => {
              if (getCountry(row) !== country) return false;
              if (medalField !== 'none') {
                const medalValue = row[medalField];
                return isMedalValue(medalValue);
              }
              return isMedalRank(row.rank);
            }).length;

            dataMatrix.push({ sport, country, medals: count });
          });
        });

        setData(dataMatrix);
        setSelectedCountries(topCountriesLocal);
        setSelectedSports(sports);
        setDebugInfo(prev => ({
          ...prev,
          sportFiles: SPORT_FILES.slice(0, 5),
          sportFilesCount: SPORT_FILES.length,
          fulfilledCount: fulfilled.length,
          failedCount: failedFiles.length,
          totalRows,
          availableKeys,
          medalField,
          medalVals: Array.from(medalValsSet).slice(0, 20),
          rankVals: Array.from(rankValsSet).slice(0, 20)
        }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setDebugInfo(prev => ({
          ...prev,
          fetchStatus: `Error: ${msg}`
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Visualization rendering effect
  useEffect(() => {
    if (!data.length || !dimensions.width || !dimensions.height || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', '#fafbff');

    const width = dimensions.width - MARGIN.left - MARGIN.right;
    const height = dimensions.height - MARGIN.top - MARGIN.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    const shortenSport = (name: string) => {
      if (name.startsWith('Cycling BMX ')) return name.replace('Cycling BMX ', 'BMX ');
      if (name.startsWith('Cycling ')) return name.replace('Cycling ', '');
      return name;
    };

    // Get unique categories for scales
    const sports = Array.from(new Set(data.map(d => d.sport))).sort();
    const countries = Array.from(new Set(data.map(d => d.country))).sort();
    const sportLabels = new Map(sports.map(sport => [sport, shortenSport(sport)]));

    // Create scales
    const xScale = d3.scaleBand()
      .domain(sports)
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(countries)
      .range([0, height])
      .padding(0.1);

    const maxMedals = d3.max(data, d => d.medals) || 0;
    const colorScale = d3.scaleLinear<string>()
      .domain([0, Math.max(1, maxMedals)])
      .range(['#e6f0ff', '#08306b'])
      .interpolate(d3.interpolateRgb);

    // Add axes
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => sportLabels.get(String(d)) || String(d)));

    xAxis.selectAll('text')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .attr('fill', '#475569');

    xAxis.selectAll('path, line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1);

    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale));

    yAxis.selectAll('text')
      .style('font-size', '11px')
      .attr('fill', '#475569');

    yAxis.selectAll('path, line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1);

    // Add title
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', dimensions.width / 2)
      .attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f172a')
      .style('font-weight', 700)
      .text('Medal Distribution by Country and Sport');

    svg.append('text')
      .attr('class', 'axis-label')
      .attr('x', dimensions.width / 2)
      .attr('y', dimensions.height - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#334155')
      .style('font-size', '12px')
      .style('font-weight', 500)
      .text('Sport');

    svg.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -dimensions.height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#334155')
      .style('font-size', '12px')
      .style('font-weight', 500)
      .text('Country');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Add heatmap cells
    g.selectAll<SVGRectElement, HeatmapData>('rect')
      .data(data)
      .join('rect')
      .attr('x', d => xScale(d.sport) || 0)
      .attr('y', d => yScale(d.country) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', '#e6f0ff')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .transition()
      .duration(500)
      .attr('fill', d => colorScale(d.medals));

    // Add interaction
    g.selectAll<SVGRectElement, HeatmapData>('rect')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 1)
          .attr('opacity', 0.9);
        tooltip
          .style('opacity', 1)
          .html(`
            <div style="font-weight:600; color:#111;">${d.country}</div>
            <div style="color:#333;">${sportLabels.get(d.sport) || d.sport}: ${d.medals} medals</div>
          `);

        const [x, y] = d3.pointer(event);
        tooltip
          .style('left', `${x + MARGIN.left + 12}px`)
          .style('top', `${y + MARGIN.top - 12}px`);
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget)
          .attr('stroke', null)
          .attr('stroke-width', null)
          .attr('opacity', 1);
        tooltip.style('opacity', 0);
      });

    // Color legend
    const legendX = width + 28;
    const legendY = Math.max(0, (height - LEGEND_HEIGHT) / 2);
    const legendScale = d3.scaleLinear()
      .domain([0, Math.max(1, maxMedals)])
      .range([LEGEND_HEIGHT, 0]);

    const legendGroup = g.append('g')
      .attr('transform', `translate(${legendX},${legendY})`);

    const gradientId = 'heatmap-legend-gradient';
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colorScale(0.1));

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colorScale(Math.max(1, maxMedals)));

    legendGroup.append('rect')
      .attr('width', LEGEND_WIDTH)
      .attr('height', LEGEND_HEIGHT)
      .attr('fill', `url(#${gradientId})`)
      .attr('rx', 3);

    const legendAxis = legendGroup.append('g')
      .attr('transform', `translate(${LEGEND_WIDTH + 6},0)`)
      .call(d3.axisRight(legendScale).ticks(4));

    legendAxis.selectAll('text')
      .style('font-size', '11px')
      .attr('fill', '#334155');

    legendAxis.selectAll('path, line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1);

  }, [data, dimensions]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="chart-message">Loading...</div>;
    }

    if (debugInfo.fetchStatus && debugInfo.fetchStatus !== 'ok') {
      return (
        <div className="chart-message error">
          Failed to load data: {debugInfo.fetchStatus}<br />
          <small>Ensure CSVs are in public/data/archive and reachable at /data/archive/...</small>
        </div>
      );
    }

    const hasNonZero = data.some(cell => cell.medals > 0);
    if (debugInfo.totalRows === 0 && selectedCountries.length === 0 && selectedSports.length === 0) {
      return <div className="chart-message">No data (rows=0)</div>;
    }

    if (!hasNonZero && debugInfo.totalRows > 0) {
      return (
        <div className="chart-message">
          Loaded rows but medal field did not match. Check medalVals.
        </div>
      );
    }

    return (
      <>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%' }}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        />
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            opacity: 0,
            background: '#fff',
            border: '1px solid #d1d5db',
            color: '#111',
            padding: '6px 8px',
            borderRadius: '6px',
            boxShadow: '0 8px 16px rgba(15, 23, 42, 0.15)',
            fontSize: '12px',
            pointerEvents: 'none'
          }}
        />
      </>
    );
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        minHeight: '200px'
      }}
    >
      {renderContent()}
    </div>
  );
};
