import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MedalData, MEDAL_COLORS, MedalType } from '../utils/types';
import { loadMedalTotalData } from '../utils/loadCsv';
import { getCountryCode } from '../utils/countryUtils';

const MARGIN = { top: 20, right: 120, bottom: 45, left: 80 };
const TITLE_HEIGHT = 28;
const LEGEND_HEIGHT = 18;


interface Props {
  onDataLoaded?: (data: MedalData[]) => void;
  topN: number;
  selectedCountry: string | null;
  selectedMedalType: 'all' | 'gold' | 'silver' | 'bronze';
  onCountrySelect: (country: string | null) => void;
}

export const CountryMedalsStackedBar: React.FC<Props> = ({ 
  onDataLoaded, 
  topN,
  selectedCountry,
  selectedMedalType,
  onCountrySelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MedalData[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const medalData = await loadMedalTotalData();
        if (!medalData.length) {
          setError('No medal data loaded.');
          setData([]);
          return;
        }
        const top = medalData.sort((a: MedalData, b: MedalData) => b.Total - a.Total).slice(0, topN);
        setData(top);
        setError(null);
        if (onDataLoaded) {
          onDataLoaded(top);
        }
      } catch (error) {
        console.error('Failed to load medal totals:', error);
        setError('Failed to load medal totals.');
        setData([]);
      }
    };
    loadData();
  }, [onDataLoaded, topN]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    const parent = svgRef.current?.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!data.length || !dimensions.width || !dimensions.height || !svgRef.current) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      svg.append('rect')
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .attr('fill', '#fafbff');

      const width = dimensions.width - MARGIN.left - MARGIN.right;
      const height = dimensions.height - MARGIN.top - MARGIN.bottom - TITLE_HEIGHT - LEGEND_HEIGHT;
      const chartHeight = Math.max(0, height);
      const barHeight = Math.min(28, Math.max(18, (chartHeight / data.length) * 0.85));
      const paddingInner = Math.min(0.4, Math.max(0.15, barHeight / (barHeight + 8)));

      const g = svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top + TITLE_HEIGHT + LEGEND_HEIGHT})`);

    g.append('rect')
      .attr('width', width)
      .attr('height', chartHeight)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    const medalTypes = ['Gold Medal', 'Silver Medal', 'Bronze Medal'] as const;
    const medalTypeMap: Record<'gold' | 'silver' | 'bronze', MedalType> = {
      gold: 'Gold Medal',
      silver: 'Silver Medal',
      bronze: 'Bronze Medal'
    };
    const activeTypes = selectedMedalType === 'all'
      ? medalTypes
      : [medalTypeMap[selectedMedalType]];
    const singleMedalType = selectedMedalType === 'all'
      ? null
      : medalTypeMap[selectedMedalType];
    const stack = d3.stack<MedalData, MedalType>()
      .keys(activeTypes)
      .value((d, key) => d[key]);
    const stackedData = stack(data);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => selectedMedalType === 'all'
        ? d.Total
        : d[singleMedalType as MedalType]) || 0])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(data.map(d => getCountryCode(d.country)))
      .range([0, chartHeight])
      .paddingInner(paddingInner)
      .paddingOuter(0.1);

    const tooltip = d3.select(tooltipRef.current);

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickSize(-chartHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#d0d0d0')
      .attr('stroke-opacity', 0.6)
      .attr('shape-rendering', 'crispEdges');

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(5));

    xAxis.selectAll('text')
      .style('font-size', '12px')
      .attr('fill', '#333');

    xAxis.selectAll('path')
      .attr('stroke', '#888');

    xAxis.selectAll('line')
      .attr('stroke', '#888')
      .attr('opacity', 0.8);

    const xAxisLabel = selectedMedalType === 'all'
      ? 'Total medals'
      : `${medalTypeMap[selectedMedalType].replace(' Medal', '')} medals`;

    xAxis.append('text')
      .attr('x', width / 2)
      .attr('y', 36)
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(xAxisLabel);

    const yAxis = g.append('g')
      .call(d3.axisLeft(y));

    yAxis.selectAll('text')
      .style('font-size', '12px')
      .attr('fill', '#333');

    yAxis.selectAll('path')
      .attr('stroke', '#888');

    yAxis.selectAll('line')
      .attr('stroke', '#888')
      .attr('opacity', 0.8);

    const bars = g.selectAll<SVGGElement, d3.Series<MedalData, MedalType>>('.medal-group')
      .data(stackedData)
      .join('g')
      .attr('class', 'medal-group')
      .attr('fill', (d) => MEDAL_COLORS[d.key as MedalType]);

    bars.selectAll<SVGRectElement, d3.SeriesPoint<MedalData>>('rect')
      .data((d) => d)
      .join('rect')
      .attr('class', d => `bar-transition clickable${selectedCountry === getCountryCode(d.data.country) ? ' selected' : ''}`)
      .attr('y', (d) => y(getCountryCode(d.data.country)) || 0)
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .attr('x', d => x(d[0]))
      .attr('width', 0)
      .on('click', (event, d) => {
        event.preventDefault();
        const country = getCountryCode((d as any).data.country);
        onCountrySelect(selectedCountry === country ? null : country);
      })
      .on('mouseover', (event, d) => {
        const { Total } = (d as any).data;
        const gold = d.data['Gold Medal'];
        const silver = d.data['Silver Medal'];
        const bronze = d.data['Bronze Medal'];
        const medalValue = selectedMedalType === 'all'
          ? null
          : d.data[singleMedalType as MedalType];
        const tooltipHtml = selectedMedalType === 'all'
          ? `<strong>${getCountryCode(d.data.country)}</strong><br/>Gold: ${gold}<br/>Silver: ${silver}<br/>Bronze: ${bronze}<br/>Total: ${Total}`
          : `<strong>${getCountryCode(d.data.country)}</strong><br/>${medalTypeMap[selectedMedalType].replace(' Medal', '')}: ${medalValue}`;
        tooltip
          .style('opacity', 1)
          .html(tooltipHtml);
        const [xPos, yPos] = d3.pointer(event);
        tooltip
          .style('left', `${xPos + MARGIN.left + 10}px`)
          .style('top', `${yPos + MARGIN.top}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      })
      .transition()
      .duration(600)
      .attr('width', d => x(d[1]) - x(d[0]));

    const legend = svg
      .append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 12)
      .attr('text-anchor', 'start')
      .attr('transform', `translate(${dimensions.width - MARGIN.right + 10},${MARGIN.top + 8})`)
      .selectAll('g')
      .data(medalTypes)
      .join('g')
      .attr('transform', (_, i) => `translate(0,${i * 16})`);

    legend.append('rect')
      .attr('x', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', d => MEDAL_COLORS[d]);

    legend.append('text')
      .attr('x', 16)
      .attr('y', 6)
      .attr('dy', '0.32em')
      .attr('fill', '#333')
      .text(d => d.replace(' Medal', ''));

    legend
      .attr('opacity', d => (selectedMedalType === 'all' || d === singleMedalType ? 1 : 0.25));

    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 600)
      .attr('fill', '#111')
      .text('Medal Distribution by Country');

      svg.append('text')
        .attr('x', dimensions.width / 2)
        .attr('y', 36)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#555')
        .text(`Top ${topN} countries${selectedMedalType === 'all' ? ' — stacked by medal type' : ''}`);

      svg.append('text')
        .attr('x', dimensions.width / 2)
        .attr('y', 52)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#64748b')
        .text('Select a country by clicking a bar; click again to reset.');
    } catch (error) {
      console.error('Failed to render stacked bar chart:', error);
      setError('Failed to render stacked bar chart.');
    }

  }, [data, dimensions, selectedCountry, onCountrySelect, selectedMedalType]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {error && (
        <div className="chart-message error">{error}</div>
      )}
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
          border: '1px solid #ccc',
          color: '#111',
          padding: '6px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};
