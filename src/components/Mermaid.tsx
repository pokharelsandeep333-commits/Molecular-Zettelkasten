"use client";

import React, { useEffect, useState, useId } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const id = useId().replace(/:/g, '');
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      try {
        const uniqueId = `mermaid-${id}-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        setSvgContent(svg);
      } catch (error) {
        console.error("Failed to render Mermaid chart:", error);
        setSvgContent(`<div class="text-red-500 text-xs font-mono">Error rendering diagram</div>`);
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart, id]);

  return (
    <div 
      className="flex justify-center my-6 p-4 bg-surface-container rounded-lg border border-whisper-border overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svgContent || '<div class="text-muted-steel animate-pulse text-xs">Rendering diagram...</div>' }}
    />
  );
};
