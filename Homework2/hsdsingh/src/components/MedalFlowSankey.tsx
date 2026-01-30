import { useEffect, useRef, useState, type FC } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { MedalData } from '../utils/types';
import { loadAllSportData, LoadResult } from '../utils/loadCsv';
import { DATA_BASE, SPORT_FILES } from "../config/dataFiles";

interface DebugInfo extends Pick<LoadResult, 'totalRows' | 'failedFiles'> {
  sportFiles: string[];
  sportFilesCount: number;
  nodeCount: number;
  linkCount: number;
  testUrl?: string;
  fetchStatus?: string;
  fulfilledCount: number;
  failedCount: number;
}

const MARGIN = { top: 50, right: 100, bottom: 50, left: 130 };

interface SankeyNode {
  name: string;
  category: 'country' | 'sport' | 'medal';
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  index?: number;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  width?: number;
}

interface ProcessedData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const MedalFlowSankey: FC<{ topCountries: MedalData[] }> = ({ topCountries }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ProcessedData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    sportFiles: [],
    sportFilesCount: 0,
    nodeCount: 0,
    linkCount: 0,
    totalRows: 0,
    failedFiles: [],
    fulfilledCount: 0,
    failedCount: 0
  });

  // Resize observer effect
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

  // Data loading effect
  useEffect(() => {
    const loadData = async () => {
      if (!topCountries.length || !SPORT_FILES.length) return;

      setIsLoading(true);

      // Fetch sanity check
      const testUrl = `${DATA_BASE}/${encodeURIComponent(SPORT_FILES[0])}`;
      try {
        const response = await fetch(testUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.text();
        setDebugInfo(prev => ({ ...prev, testUrl, fetchStatus: 'ok' }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setDebugInfo(prev => ({ ...prev, testUrl, fetchStatus: msg }));
        setIsLoading(false);
        return;
      }

      try {
        const result = await loadAllSportData();
        const countries = topCountries.slice(0, 8).map(c => c.country_code);
        const sports = SPORT_FILES.map(f => f.replace(/\.csv$/i, '')).slice(0, 10);
        const medalTypes = ['Gold', 'Silver', 'Bronze'];

        const getCountry = (row: typeof result.data[string][number]) =>
          row.participant_country || '';

        const rankToMedal = (rank: number | null) => {
          if (rank === 1 || rank === 1.0) return 'Gold';
          if (rank === 2 || rank === 2.0) return 'Silver';
          if (rank === 3 || rank === 3.0) return 'Bronze';
          return '';
        };

        const getMedalType = (row: typeof result.data[string][number]) => {
          if (row.medal_type) return row.medal_type;
          return rankToMedal(row.rank ?? null);
        };

        const nodes: SankeyNode[] = [
          ...countries.map(c => ({ name: c, category: 'country' as const })),
          ...sports.map(s => ({ name: s, category: 'sport' as const })),
          ...medalTypes.map(m => ({ name: m, category: 'medal' as const }))
        ];

        const nodeMap = new Map<string, number>();
        nodes.forEach((node, index) => {
          nodeMap.set(node.name, index);
          node.index = index;
        });

        const links: SankeyLink[] = [];

        countries.forEach(country => {
          sports.forEach(sport => {
            const value = result.data[sport]
              ?.filter(d => getCountry(d) === country && getMedalType(d) !== '')
              .length ?? 0;
            if (value > 0) {
              links.push({
                source: nodeMap.get(country)!,
                target: nodeMap.get(sport)!,
                value
              });
            }
          });
        });

        sports.forEach(sport => {
          medalTypes.forEach(medal => {
            const value = result.data[sport]
              ?.filter(d => getMedalType(d) === medal)
              .length ?? 0;
            if (value > 0) {
              links.push({
                source: nodeMap.get(sport)!,
                target: nodeMap.get(medal)!,
                value
              });
            }
          });
        });

        const fulfilledCount = Object.keys(result.data).length;
        const failedCount = result.failedFiles.length;

        setData({ nodes, links });
        setDebugInfo(prev => ({
          ...prev,
          sportFiles: SPORT_FILES.slice(0, 5),
          sportFilesCount: SPORT_FILES.length,
          nodeCount: nodes.length,
          linkCount: links.length,
          totalRows: result.totalRows,
          failedFiles: result.failedFiles,
          fulfilledCount,
          failedCount
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
  }, [topCountries]);

  // Visualization rendering effect
  useEffect(() => {
    if (!data.nodes.length || !dimensions.width || !dimensions.height || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', '#fafbff');

    const width = dimensions.width - MARGIN.left - MARGIN.right;
    const height = dimensions.height - MARGIN.top - MARGIN.bottom;

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1);

    const sankeyGenerator = sankey<any, any>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);

    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    });

    const linkSelection = g.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke-width', (d: any) => Math.max(1, d.width || 0))
      .attr('stroke', '#cbd5e1')
      .attr('fill', 'none')
      .attr('opacity', 0.6);

    const nodeSelection = g.append('g')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', (d: any) => d.x0 || 0)
      .attr('y', (d: any) => d.y0 || 0)
      .attr('height', (d: any) => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', (d: any) => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', (d: any) => {
        if (d.category === 'medal') {
          switch (d.name) {
            case 'Gold': return '#d4af37';
            case 'Silver': return '#c0c0c0';
            case 'Bronze': return '#cd7f32';
            default: return '#d1d5db';
          }
        }
        return d.category === 'country' ? '#94a3b8' : '#9ca3af';
      })
      .attr('rx', 2);

    const labelThreshold = 6;
    const labelSelection = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', (d: any) => {
        if (d.category === 'country') return (d.x0 || 0) - 8;
        return (d.x1 || 0) + 8;
      })
      .attr('y', (d: any) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr('text-anchor', (d: any) => (d.category === 'country' ? 'end' : 'start'))
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 500)
      .style('fill', '#334155')
      .style('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .style('opacity', (d: any) => (d.value || 0) < labelThreshold ? 0 : 1)
      .text((d: any) => d.name);

    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', dimensions.width / 2)
      .attr('y', 22)
      .attr('fill', '#0f172a')
      .style('font-weight', 700)
      .text('Medal Flow: Countries → Sports → Medal Types');

    const tooltip = d3.select(tooltipRef.current);

    const resetHighlight = () => {
      linkSelection.attr('opacity', 0.6);
      nodeSelection.attr('opacity', 1);
      labelSelection.attr('opacity', (d: any) => (d.value || 0) < labelThreshold ? 0 : 1);
    };

    const highlightNode = (node: any) => {
      const connected = new Set<number>();
      linkSelection.each((link: any) => {
        if (link.source.index === node.index || link.target.index === node.index) {
          connected.add(link.source.index);
          connected.add(link.target.index);
        }
      });

      linkSelection.attr('opacity', (link: any) =>
        link.source.index === node.index || link.target.index === node.index ? 0.9 : 0.2
      );

      nodeSelection.attr('opacity', (d: any) =>
        connected.has(d.index) || d.index === node.index ? 1 : 0.2
      );

      labelSelection.attr('opacity', (d: any) => {
        if ((d.value || 0) < labelThreshold) return 0;
        return connected.has(d.index) || d.index === node.index ? 1 : 0.2;
      });
    };

    const highlightLink = (link: any) => {
      const connected = new Set<number>([link.source.index, link.target.index]);

      linkSelection.attr('opacity', (d: any) => (d === link ? 0.9 : 0.2));

      nodeSelection.attr('opacity', (d: any) =>
        connected.has(d.index) ? 1 : 0.2
      );

      labelSelection.attr('opacity', (d: any) => {
        if ((d.value || 0) < labelThreshold) return 0;
        return connected.has(d.index) ? 1 : 0.2;
      });
    };

    nodeSelection
      .on('mouseover', (event, d: any) => {
        highlightNode(d);
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.name}</strong><br/>Total: ${Math.round(d.value || 0)}`);
        const [x, y] = d3.pointer(event);
        tooltip
          .style('left', `${x + MARGIN.left + 12}px`)
          .style('top', `${y + MARGIN.top - 12}px`);
      })
      .on('mouseout', () => {
        resetHighlight();
        tooltip.style('opacity', 0);
      });

    linkSelection
      .on('mouseover', (event, d: any) => {
        highlightLink(d);
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.source.name} → ${d.target.name}</strong><br/>Value: ${Math.round(d.value || 0)}`);
        const [x, y] = d3.pointer(event);
        tooltip
          .style('left', `${x + MARGIN.left + 12}px`)
          .style('top', `${y + MARGIN.top - 12}px`);
      })
      .on('mouseout', () => {
        resetHighlight();
        tooltip.style('opacity', 0);
      });

  }, [data, dimensions]);

  const renderContent = () => {
    if (!dimensions.width || !dimensions.height) {
      return (
        <div className="chart-message">
          Waiting for container size... (w={dimensions.width}, h={dimensions.height})
        </div>
      );
    }

    if (isLoading) {
      return <div className="chart-message">Loading...</div>;
    }

    if (debugInfo.fetchStatus && debugInfo.fetchStatus !== 'ok') {
      return (
        <div className="chart-message error">
          Failed to load data: {debugInfo.fetchStatus}<br />
          <small>Ensure files are placed under React-Template/public/data/archive/ (Vite public)</small>
        </div>
      );
    }

    if (!data.nodes.length) {
      return <div className="chart-message">No data (nodes=0)</div>;
    }

    return (
      <>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
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
