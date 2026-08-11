"use client";

import React, { useEffect, useState, useId } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base', 
  themeVariables: {
    background: 'transparent',
    primaryColor: 'transparent',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#ffffff',
    lineColor: '#ffffff',
    secondaryColor: 'transparent',
    tertiaryColor: 'transparent',
    textColor: '#ffffff',
    noteTextColor: '#ffffff',
    noteBkgColor: 'transparent',
    noteBorderColor: '#ffffff',
    actorTextColor: '#ffffff',
    actorBkg: 'transparent',
    actorBorder: '#ffffff',
    messageTextColor: '#ffffff',
    signalTextColor: '#ffffff',
    nodeTextColor: '#ffffff',
    labelTextColor: '#ffffff',
    clusterBkg: 'transparent',
    clusterBorder: '#ffffff',
  },
  sequence: {
    wrap: false, 
  },
  flowchart: {
    rankSpacing: 30, // Make vertical gaps tighter
    nodeSpacing: 30, // Make horizontal gaps tighter
  },
  securityLevel: 'loose',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 16,
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const id = useId().replace(/:/g, '');
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const renderChart = async () => {
      try {
        const uniqueId = `mermaid-${id}-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        
        let nativeWidth = 'none';
        const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
        if (viewBoxMatch) {
          nativeWidth = `${parseFloat(viewBoxMatch[1])}px`;
        }

        // Prevent artificial zooming by locking max-width to its native calculated viewBox width
        const modifiedSvg = svg
          .replace(/width="100%"/g, '')
          .replace('<svg ', `<svg style="overflow: visible; max-width: ${nativeWidth}; height: auto; font-family: Arial, Helvetica, sans-serif;" `);
          
        setSvgContent(modifiedSvg);
      } catch (error) {
        console.error("Failed to render Mermaid chart:", error);
        setSvgContent(`<div class="text-red-500 text-xs font-mono">Error rendering diagram</div>`);
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart, id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(!isFullscreen);
  };

  const chartContent = (
    <div 
      className="flex justify-center p-4 min-w-full text-[16px] leading-normal"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      dangerouslySetInnerHTML={{ __html: svgContent || '<div class="text-[#00F0FF]/50 animate-pulse text-xs font-mono tracking-widest">RENDERING...</div>' }}
    />
  );

  return (
    <>
      {/* Inline View */}
      <div className="relative flex justify-center w-full my-6">
        <div className="relative group w-full bg-[#001E3C]/20 rounded-lg border border-white/5 overflow-x-auto shadow-md custom-scrollbar">
          <button 
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 p-1.5 bg-white/10 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black shadow-sm z-10"
            title="Expand to Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
          {chartContent}
        </div>
      </div>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#02050C]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 overflow-auto custom-scrollbar"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
              className="absolute top-6 right-6 p-2 bg-[#00F0FF]/10 text-[#00F0FF] rounded-md hover:bg-[#00F0FF] hover:text-[#02050C] transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)] z-[110]"
              title="Close Fullscreen (Esc)"
            >
              <Minimize2 size={20} />
            </button>
            <div 
              className="bg-[#001E3C]/50 rounded-xl border border-[#00F0FF]/30 p-8 shadow-[0_0_30px_rgba(0,240,255,0.1)] w-full max-w-7xl max-h-[90vh] overflow-auto custom-scrollbar relative"
              onClick={(e) => e.stopPropagation()}
            >
              {chartContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
