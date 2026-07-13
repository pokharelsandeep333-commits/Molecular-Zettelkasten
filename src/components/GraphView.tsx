import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { GraphData, GraphNode } from '@/app/page';

// Dynamically import 2D graph to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphViewProps {
  graphData: GraphData;
  activeNoteSlug: string | null;
  onNodeClick: (slug: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ graphData, activeNoteSlug, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-abyssal-bg">
      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#09090b" // Abyssal Background
          nodeRelSize={5}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeColor={(node: any) =>
            (node as GraphNode).id === activeNoteSlug ? '#06B6D4' : '#a1a1aa'
          }
          linkColor={() => 'rgba(255,255,255,0.1)'}
          linkWidth={1}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onNodeClick={(node: any) => onNodeClick((node as GraphNode).id)}
          // Draw a label next to the node (optional, like Obsidian)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw Node
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.id === activeNoteSlug ? '#06B6D4' : '#a1a1aa';
            ctx.fill();

            // Draw Label (only if zoomed in a bit or active)
            if (globalScale > 1 || node.id === activeNoteSlug) {
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = node.id === activeNoteSlug ? '#fafafa' : '#a1a1aa';
              ctx.fillText(label, node.x, node.y + 8);
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-steel">
          Loading graph...
        </div>
      )}
    </div>
  );
};
