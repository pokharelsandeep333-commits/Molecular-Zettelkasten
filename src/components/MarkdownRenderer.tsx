import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Mermaid } from './Mermaid';
import remarkObsidianCallouts from '@/lib/remarkObsidianCallouts';
import { ObsidianCallout } from './ObsidianCallout';

interface MarkdownRendererProps {
  content: string;
  onNodeClick?: (slug: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content = '', onNodeClick }) => {
  let cleaned = content;

  // 1. Convert image embeds: ![[Image.png]] -> ![Image.png](/api/raw/Image.png)
  cleaned = cleaned.replace(/!\[\[([^\]]+\.(?:png|jpe?g|gif|svg|webp|bmp|pdf))\]\]/gi, '![$1](/api/raw/$1)');

  // 2. Convert remaining note embeds: ![[Note]] -> [[Note]] (so they become links instead of failing to embed)
  cleaned = cleaned.replace(/!\[\[([^\]]+)\]\]/g, '[[$1]]');

  // 3. Convert wikilinks with alias: [[Note|Alias]] -> [Alias](#Note)
  cleaned = cleaned.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, note, alias) => {
    return `[${alias}](#${encodeURIComponent(note)})`;
  });

  // 4. Convert simple wikilinks: [[Note]] -> [Note](#Note)
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, (match, note) => {
    return `[${note}](#${encodeURIComponent(note)})`;
  });

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkObsidianCallouts]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        aside: ({ node, children }: any) => {
          const props = node?.properties || {};
          return (
            <ObsidianCallout
              calloutType={props['dataCalloutType']}
              title={props['dataCalloutTitle']}
              isFoldable={props['dataCalloutFoldable']}
              defaultCollapsed={props['dataCalloutCollapsed']}
            >
              {children}
            </ObsidianCallout>
          );
        },
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-on-surface mt-6 mb-4 first:mt-0 pb-2 border-b border-whisper-border">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-on-surface mt-6 mb-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-on-surface mt-5 mb-2">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-base text-on-surface leading-relaxed mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 space-y-2 mb-4 text-base text-on-surface marker:text-on-surface-variant">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 space-y-2 mb-4 text-base text-on-surface marker:text-on-surface-variant">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => {
          if (href?.startsWith('#')) {
            const slug = decodeURIComponent(href.replace('#', ''));
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (onNodeClick) onNodeClick(slug);
                }}
                className="text-electric-cyan hover:bg-electric-cyan/10 px-1 py-0.5 rounded transition-colors inline-flex items-center font-medium border border-electric-cyan/20 cursor-pointer"
              >
                {children}
              </button>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-cyan hover:underline"
            >
              {children}
            </a>
          );
        },
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes('language-');
          const language = isBlock && className ? className.replace('language-', '') : '';
          const codeString = String(children).replace(/\n$/, '');
          
          if (!isBlock) {
            return (
              <code className="bg-surface-container border border-whisper-border rounded px-1.5 py-0.5 text-electric-cyan font-mono text-xs" {...props}>
                {children}
              </code>
            );
          }

          if (language === 'mermaid') {
            return <Mermaid chart={codeString} />;
          }

          return (
            <div className="relative group mb-4">
              <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigator.clipboard.writeText(codeString)}
                  className="bg-surface-container-high hover:bg-electric-cyan hover:text-abyssal-bg text-muted-steel border border-whisper-border rounded px-2 py-1 text-[10px] font-tech transition-colors shadow-sm"
                  title="Copy Code"
                >
                  COPY
                </button>
              </div>
              <Prism
                language={language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-whisper-border)',
                  backgroundColor: 'var(--color-surface-container)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {codeString}
              </Prism>
            </div>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-3">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-electric-cyan/50 pl-4 my-3 text-sm text-muted-steel italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-whisper-border my-4" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-on-surface">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-muted-steel">{children}</em>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="text-left p-2 border border-whisper-border font-mono text-muted-steel bg-surface-container">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="p-2 border border-whisper-border text-on-surface-variant">{children}</td>
        ),
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
};
