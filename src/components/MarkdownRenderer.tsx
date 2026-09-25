import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
// PrismAsync loads each language grammar on first use instead of bundling ~300 up front.
import { PrismAsync as Prism } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Mermaid } from './Mermaid';
import remarkObsidianCallouts from '@/lib/remarkObsidianCallouts';
import { ObsidianCallout } from './ObsidianCallout';
import {
  escapeUnknownTags,
  inlineTagLabels,
  mapOutsideCode,
  normalizeDisplayMath,
  rehypeVaultSvg,
  resolveImageSrc,
  vaultSanitizeSchema,
  vaultUrlTransform,
  youtubeId,
} from '@/lib/vaultMarkdown';

interface MarkdownRendererProps {
  content: string;
  onNodeClick?: (slug: string) => void;
}

const IMAGE_EMBED_RE = /!\[\[([^\]|]+\.(?:png|jpe?g|gif|svg|webp|bmp))(?:\|(\d+)(?:x\d+)?)?\]\]/gi;

const rawUrl = (file: string) =>
  `/api/raw/${file.split('/').map(encodeURIComponent).join('/')}`;

// Links to other notes use this fragment prefix so plain "#heading" anchors
// (tables of contents, footnotes) stay in-page links.
const WIKILINK_PREFIX = '#wikilink:';

const noteHref = (note: string) => `${WIKILINK_PREFIX}${encodeURIComponent(note.trim())}`;

/** GitHub-style heading id: "What Docker Is — Under the Hood" -> "what-docker-is--under-the-hood". */
export function headingSlug(text: string): string {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

/** Obsidian link target -> href: "Note" / "Note#Heading" open a note, "#Heading" jumps within this one. */
function wikilinkHref(target: string): string {
  const trimmed = target.trim();
  return trimmed.startsWith('#') ? `#${headingSlug(trimmed.slice(1))}` : noteHref(trimmed);
}

/** Convert Obsidian wikilinks ([[Note]], [[Note|Alias]], [[#Heading]]) into markdown links. */
export function convertWikilinks(text: string): string {
  return text
    // [[Note|Alias]] -> [Alias](#wikilink:Note)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, target: string, alias: string) => `[${alias}](${wikilinkHref(target)})`)
    // [[Note]] -> [Note](#wikilink:Note); [[Note#Heading]] shows as "Note > Heading"
    .replace(/\[\[([^\]]+)\]\]/g, (_match, target: string) =>
      `[${target.replace(/^#/, '').replace('#', ' > ')}](${wikilinkHref(target)})`);
}

export const isWikilink = (href?: string): href is string => !!href?.startsWith(WIKILINK_PREFIX);

/** "#wikilink:Folder%2FNote%23Heading" -> "Folder/Note" (headings are not separate notes). */
export function wikilinkTarget(href: string): string {
  return decodeURIComponent(href.slice(WIKILINK_PREFIX.length)).split('#')[0].trim();
}

/** Smooth-scroll to an in-page anchor; sanitized ids carry a "user-content-" prefix. */
export function scrollToAnchor(fragment: string) {
  let id = fragment.replace(/^#/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    // use as-is
  }
  const target = document.getElementById(id)
    ?? document.getElementById(`user-content-${id}`)
    ?? document.querySelector(`[data-src-slug="${CSS.escape(id)}"]`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Plain text of rendered heading children, for building its id. */
function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement(node)) return nodeText((node.props as { children?: React.ReactNode }).children);
  return '';
}

// [text](relative/path.md) with optional <> and #heading; allows one level of
// parentheses in the path, e.g. "AI Coding Workflow (Matt Pocock).md". Targets
// with a URL scheme (https:, obsidian:) are left alone as external links.
const MD_NOTE_LINK_RE = /\[([^\]\n]+)\]\(<?(?![a-z][a-z0-9+.-]*:)((?:[^()<>\n]|\([^()\n]*\))+?\.md)(?:#[^)>\n]*)?>?\)/gi;

/** "../Wiki/My%20Note.md" -> "Wiki/My Note"; the notes API falls back to a basename lookup. */
function noteLinkToSlug(target: string): string {
  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    // Keep literal "%" characters in names that are not URL-encoded.
  }
  return decoded
    .replace(/\.md$/i, '')
    .split('/')
    .filter(segment => segment && segment !== '.' && segment !== '..')
    .join('/');
}

export function preprocessObsidian(content: string): string {
  // Code blocks and inline code are shown verbatim, so only rewrite the prose.
  return mapOutsideCode(content, preprocessProse);
}

function preprocessProse(content: string): string {
  // 0. Tags outside the raw-HTML allowlist (<laugh>, <iostream>) stay visible as text.
  let cleaned = escapeUnknownTags(content);

  // 1. Image embeds: ![[Image.png]] / ![[Image.png|300]] -> ![Image.png](</api/raw/Image.png> "w=300")
  //    Angle brackets keep filenames with spaces or parentheses intact.
  cleaned = cleaned.replace(IMAGE_EMBED_RE, (_match, file: string, width?: string) =>
    `![${file.split('/').pop()}](<${rawUrl(file)}>${width ? ` "w=${width}"` : ''})`);

  // 2. Remaining embeds (notes, PDFs): ![[Note]] -> [[Note]] so they become links that open in the viewer.
  cleaned = cleaned.replace(/!\[\[([^\]]+)\]\]/g, '[[$1]]');

  // 3-4. Wikilinks with and without alias.
  cleaned = convertWikilinks(cleaned);

  // 5. Obsidian-style relative links to notes: [Text](../Wiki/My Note (v2).md#Heading).
  // CommonMark rejects the unescaped spaces, so these would render as plain text.
  cleaned = cleaned.replace(MD_NOTE_LINK_RE, (_match, text: string, target: string) =>
    `[${text}](${noteHref(noteLinkToSlug(target))})`);

  // 6. Display math in the forms Obsidian accepts ($$x$$ on one line, content
  // after the opening $$, fences inside callouts), normalized for remark-math.
  cleaned = normalizeDisplayMath(cleaned);
  cleaned = inlineTagLabels(cleaned);

  return cleaned;
}

/**
 * Fenced code arrives with a trailing newline; inline code never has one. So an
 * unlabeled ``` block is still a block (scrollable, copyable) rather than being
 * styled as inline code that overflows the page. CRLF notes are normalized.
 */
export function codeBlockInfo(className: string | undefined, children: React.ReactNode) {
  const raw = String(children).replace(/\r\n?/g, '\n');
  const language = className?.match(/language-(\S+)/)?.[1] ?? '';
  const isBlock = !!language || raw.endsWith('\n');
  return { isBlock, language: language || 'text', codeString: raw.replace(/\n$/, '') };
}

// The markdown being rendered, so headings can read their own source text.
const MarkdownSource = React.createContext('');

type HeadingProps = {
  node?: { position?: { start: { offset?: number }; end: { offset?: number } } };
  children?: React.ReactNode;
};

/**
 * Headings get a GitHub-style id from their rendered text, plus a slug of their
 * markdown source so TOCs written against the source (e.g. headings containing
 * $math$) still resolve. See scrollToAnchor.
 */
function heading(Tag: 'h1' | 'h2' | 'h3' | 'h4', className: string) {
  return function Heading({ node, children }: HeadingProps) {
    const source = React.useContext(MarkdownSource);
    const start = node?.position?.start.offset;
    const end = node?.position?.end.offset;
    const text = start != null && end != null
      ? source.slice(start, end).replace(/^#+\s*/, '').replace(/\s#+\s*$/, '')
      : '';
    return (
      <Tag
        id={headingSlug(nodeText(children))}
        data-src-slug={text ? headingSlug(text) : undefined}
        className={`scroll-mt-4 ${className}`}
      >
        {children}
      </Tag>
    );
  };
}

const H1 = heading('h1', 'text-2xl font-bold text-on-surface mt-6 mb-4 first:mt-0 pb-2 border-b border-whisper-border');
const H2 = heading('h2', 'text-xl font-semibold text-on-surface mt-6 mb-3');
const H3 = heading('h3', 'text-lg font-semibold text-on-surface mt-5 mb-2');
const H4 = heading('h4', 'text-base font-semibold text-on-surface mt-4 mb-2');

export function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className={className}
      title="Copy Code"
      aria-label="Copy code"
    >
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(function MarkdownRenderer({ content = '', onNodeClick }) {
  const cleaned = React.useMemo(() => preprocessObsidian(content), [content]);

  return (
    <MarkdownSource.Provider value={cleaned}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkObsidianCallouts]}
      // Raw HTML (SVG figures, <br>, <img>) is parsed, then sanitized against an
      // allowlist before KaTeX adds its own trusted markup.
      rehypePlugins={[rehypeRaw, [rehypeSanitize, vaultSanitizeSchema], rehypeVaultSvg, rehypeKatex]}
      urlTransform={vaultUrlTransform}
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
        h1: H1,
        h2: H2,
        h3: H3,
        h4: H4,
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
          // In-page anchors: table of contents entries, [[#Heading]], footnotes.
          if (href?.startsWith('#') && !isWikilink(href)) {
            return (
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAnchor(href);
                }}
                className="text-electric-cyan hover:underline"
              >
                {children}
              </a>
            );
          }
          if (isWikilink(href)) {
            const slug = wikilinkTarget(href);
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNodeClick && slug) onNodeClick(slug);
                }}
                className="text-electric-cyan hover:bg-electric-cyan/10 px-1 py-0.5 rounded transition-colors inline-flex items-center text-left font-medium border border-electric-cyan/20 cursor-pointer"
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
          const { isBlock, language, codeString } = codeBlockInfo(className, children);

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
              <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 touch-visible transition-opacity">
                <CopyButton
                  text={codeString}
                  className="bg-surface-container-high hover:bg-electric-cyan hover:text-abyssal-bg text-muted-steel border border-whisper-border rounded px-2 py-1 text-[10px] font-tech transition-colors shadow-sm"
                />
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
        img: ({ src, alt, title, width, height }) => {
          if (typeof src !== 'string' || !src) return null;
          // Obsidian renders ![](youtube link) as a player; use the no-cookie embed.
          const videoId = youtubeId(src);
          if (videoId) {
            return (
              <span className="block my-4 w-full max-w-2xl aspect-video overflow-hidden rounded-lg border border-whisper-border bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title={alt || 'YouTube video'}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </span>
            );
          }
          const embedWidth = title?.startsWith('w=') ? Number(title.slice(2)) : undefined;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageSrc(src)}
              alt={alt || ''}
              title={embedWidth ? undefined : title}
              width={embedWidth ?? width}
              height={embedWidth ? undefined : height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="max-w-full h-auto rounded-md border border-whisper-border my-2 inline-block"
            />
          );
        },
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
    </MarkdownSource.Provider>
  );
});
