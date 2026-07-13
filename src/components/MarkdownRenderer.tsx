import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Mermaid } from './Mermaid';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Strip Obsidian wikilinks [[Note]] → Note, and ![[embed]] → (embedded)
  const cleaned = content
    .replace(/!\[\[([^\]]+)\]\]/g, '') // remove embedded note syntax
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[Note|Alias]] → Alias
    .replace(/\[\[([^\]]+)\]\]/g, '$1'); // [[Note]] → Note

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-on-surface mt-6 mb-3 first:mt-0 pb-2 border-b border-whisper-border">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-on-surface mt-5 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-on-surface mt-4 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-on-surface-variant leading-relaxed mb-3">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-1 mb-3 text-sm text-on-surface-variant">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-1 mb-3 text-sm text-on-surface-variant">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-electric-cyan hover:underline"
          >
            {children}
          </a>
        ),
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
