import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MedalData, MEDAL_COLORS, MedalType, Dimensions } from '../utils/types';
import { loadMedalTotalData } from '../utils/loadCsv';

const MARGIN = { top: 20, right: 120, bottom: 45, left: 80 };
const TITLE_HEIGHT = 28;
const LEGEND_HEIGHT = 18;

type StackData = d3.Series<MedalData, MedalType>[];

interface Props {
  onDataLoaded?: (data: MedalData[]) => void;
  topN: number;
}

export const CountryMedalsStackedBar: React.FC<Props> = ({ onDataLoaded, topN }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MedalData[]>([]);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const loadData = async () => {
      const medalData = await loadMedalTotalData();
      const top = medalData.sort((a, b) => b.Total - a.Total).slice(0, topN);
      setData(top);
      if (onDataLoaded) {
        onDataLoaded(top);
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

    if (svgRef.current) {
      resizeObserver.observe(svgRef.current.parentElement!);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!data.length || !dimensions.width || !dimensions.height || !svgRef.current) return;

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
    const stack = d3.stack<MedalData, MedalType>()
      .keys(medalTypes)
      .value((d, key) => d[key]);
    const stackedData = stack(data);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Total) || 0])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.country_code))
      .range([0, chartHeight])
      .paddingInner(paddingInner)
      .paddingOuter(0.1);

    const tooltip = d3.select(tooltipRef.current);

    // Gridlines
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

    // Add X axis
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

    xAxis.append('text')
      .append('text')
      .attr('x', width / 2)
      .attr('y', 36)
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Total medals');

    // Add Y axis
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

    // Add stacked bars
    const bars = g.selectAll<SVGGElement, d3.Series<MedalData, MedalType>>('.medal-group')
      .data(stackedData)
      .join('g')
      .attr('class', 'medal-group')
      .attr('fill', d => MEDAL_COLORS[d.key as MedalType]);

    bars.selectAll<SVGRectElement, d3.SeriesPoint<MedalData>>('rect')
      .data(d => d)
      .join('rect')
      .attr('y', d => y(d.data.country_code) || 0)
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .attr('x', d => x(d[0]))
      .attr('width', 0)
      .on('mouseover', (event, d) => {
        const { country_code, Total } = d.data;
        const gold = d.data['Gold Medal'];
        const silver = d.data['Silver Medal'];
        const bronze = d.data['Bronze Medal'];
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${country_code}</strong><br/>Gold: ${gold}<br/>Silver: ${silver}<br/>Bronze: ${bronze}<br/>Total: ${Total}`
          );
        const [xPos, yPos] = d3.pointer(event);
        tooltip
          .style('left', `${xPos + MARGIN.left + 10}px`)
          .style('top', `${yPos + MARGIN.top}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      })
      .transition()
      .duration(700)
      .attr('width', d => x(d[1]) - x(d[0]));

    // Add legend inside SVG (top-right)
    const legend = svg
      .append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 12)
      .attr('text-anchor', 'start')
      .attr('transform', `translate(${dimensions.width - MARGIN.right + 10},${MARGIN.top + 8})`)
      .selectAll('g')
      .data(medalTypes)
      .join('g')
      .attr('transform', (d, i) => `translate(0,${i * 16})`);

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

    // Add title + subtitle
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
      .text('Top 12 countries — stacked by medal type');

  }, [data, dimensions]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
