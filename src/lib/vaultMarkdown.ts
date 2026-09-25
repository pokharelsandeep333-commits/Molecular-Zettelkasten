/**
 * Raw HTML support for vault notes.
 *
 * LLM-Wiki notes embed inline HTML the way Obsidian renders it: SVG figures,
 * <br>, <img>, <sup>, <details>. Notes are synced from a remote repo, so the
 * HTML is untrusted: it is parsed with rehype-raw and then passed through a
 * strict allowlist (rehype-sanitize). Anything outside the allowlist that looks
 * like a tag in prose (<laugh>, <iostream>) is escaped so it still shows as text
 * instead of being parsed and silently dropped.
 */
import { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

const SVG_TAGS = [
  'svg', 'g', 'defs', 'title', 'desc',
  'line', 'circle', 'ellipse', 'rect', 'path', 'polyline', 'polygon',
  'text', 'tspan', 'marker', 'linearGradient', 'radialGradient', 'stop', 'clipPath',
];

const EXTRA_HTML_TAGS = ['aside', 'figure', 'figcaption', 'mark', 'u', 'small', 'center', 'abbr', 'cite'];

const HTML_TAGS = [...(defaultSchema.tagNames ?? []), ...EXTRA_HTML_TAGS];

/** Tag names (lower-case) that raw HTML in a note may use. */
const ALLOWED_TAGS = new Set([...HTML_TAGS, ...SVG_TAGS].map(t => t.toLowerCase()));

// Presentation attributes only: no style (CSS injection), no event handlers, no
// href/xlink:href on SVG (script URLs), no <use>/<animate>/<foreignObject>.
const SVG_ATTRIBUTES = [
  'viewBox', 'preserveAspectRatio', 'width', 'height', 'transform', 'opacity',
  'fill', 'fillOpacity', 'fillRule', 'clipRule', 'clipPath',
  'stroke', 'strokeWidth', 'strokeOpacity', 'strokeDasharray', 'strokeDashoffset',
  'strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'vectorEffect',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'dx', 'dy',
  'd', 'points', 'pathLength', 'rotate',
  'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAnchor',
  'dominantBaseline', 'alignmentBaseline', 'baselineShift', 'letterSpacing', 'textDecoration',
  'markerStart', 'markerMid', 'markerEnd', 'markerWidth', 'markerHeight',
  'markerUnits', 'refX', 'refY', 'orient',
  'offset', 'stopColor', 'stopOpacity', 'gradientUnits', 'gradientTransform',
  'fx', 'fy', 'clipPathUnits', 'role', 'ariaLabel', 'ariaHidden',
];

const svgAttributes = Object.fromEntries(SVG_TAGS.map(tag => [tag, SVG_ATTRIBUTES]));

export const vaultSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [...HTML_TAGS, ...SVG_TAGS],
  attributes: {
    ...defaultSchema.attributes,
    ...svgAttributes,
    // remark-math marks display math with a class rehype-katex needs; the default
    // schema would strip it and turn every display equation inline.
    code: [['className', /^language-./, 'math-inline', 'math-display']],
    // Obsidian callouts (src/lib/remarkObsidianCallouts.ts).
    aside: ['dataCalloutType', 'dataCalloutTitle', 'dataCalloutFoldable', 'dataCalloutCollapsed'],
    img: [...(defaultSchema.attributes?.img ?? []), 'loading'],
  },
  protocols: {
    ...defaultSchema.protocols,
    // data: images are narrowed to raster/SVG image types by imageUrlTransform.
    src: ['http', 'https', 'data'],
  },
};

/**
 * Escape "<name" tags that are not on the allowlist so they render as text.
 * A "<" right after "](" opens a markdown link destination, not a tag.
 */
export function escapeUnknownTags(text: string): string {
  return text.replace(/(?<!\]\()<(\/?)([A-Za-z][A-Za-z0-9-]*)(?=[\s/>])/g, (match, slash: string, name: string) =>
    ALLOWED_TAGS.has(name.toLowerCase()) ? match : `&lt;${slash}${name}`);
}

const FENCE_RE = /^[\s>]*(`{3,}|~{3,})/;
const INLINE_CODE_RE = /(`+)(?:(?!\1)[^\n]|\n(?!\s*\n))+?\1(?!`)/g;

function mapOutsideInlineCode(text: string, transform: (s: string) => string): string {
  let result = '';
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE_RE)) {
    result += transform(text.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return result + transform(text.slice(last));
}

/**
 * Apply `transform` to everything except fenced code blocks and inline code
 * spans, so preprocessing never rewrites what a note shows as code.
 */
export function mapOutsideCode(text: string, transform: (s: string) => string): string {
  const out: string[] = [];
  let prose: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    if (prose.length) out.push(mapOutsideInlineCode(prose.join('\n'), transform));
    prose = [];
  };

  for (const line of text.split('\n')) {
    const marker = line.match(FENCE_RE)?.[1];
    if (fence) {
      out.push(line);
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (marker) {
      flush();
      fence = marker;
      out.push(line);
    } else {
      prose.push(line);
    }
  }
  flush();
  return out.join('\n');
}

const URL_REF_ATTRS = ['fill', 'stroke', 'markerStart', 'markerMid', 'markerEnd', 'clipPath'];
const CLOBBER_PREFIX = defaultSchema.clobberPrefix ?? 'user-content-';

/**
 * Runs after sanitize: sanitize prefixes ids ("user-content-arrow") to prevent
 * DOM clobbering, so url(#arrow) references are rewritten to match. Top-level
 * note SVGs also get a class so CSS can make them responsive.
 */
export function rehypeVaultSvg() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, _index, parent) => {
      if (node.tagName === 'svg' && (parent as Element | undefined)?.tagName !== 'svg') {
        const existing = node.properties.className;
        node.properties.className = [...(Array.isArray(existing) ? existing : []), 'vault-svg'];
      }
      for (const attr of URL_REF_ATTRS) {
        const value = node.properties[attr];
        if (typeof value === 'string' && value.includes('url(#') && !value.includes(`url(#${CLOBBER_PREFIX}`)) {
          node.properties[attr] = value.replace(/url\(#/g, `url(#${CLOBBER_PREFIX}`);
        }
      }
    });
  };
}

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml)[;,]/i;
const SAFE_PROTOCOL = /^(https?|mailto|irc|ircs|xmpp):/i;

/**
 * react-markdown URL filter. Like the default (drops javascript: and friends)
 * but keeps data:image URLs on images, which notes use for inline pictures.
 */
export function vaultUrlTransform(url: string, key: string): string {
  if (key === 'src' && SAFE_DATA_IMAGE.test(url)) return url;
  const colon = url.indexOf(':');
  const slashOrQuery = url.search(/[/?#]/);
  // Relative URLs (no scheme before the first / ? #) are safe.
  if (colon === -1 || (slashOrQuery !== -1 && colon > slashOrQuery)) return url;
  return SAFE_PROTOCOL.test(url) ? url : '';
}

/** Vault-relative image paths ("assets/banner.png") resolve through /api/raw. */
export function resolveImageSrc(src: string): string {
  if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
  const clean = src.replace(/^\.\//, '').split(/[?#]/)[0];
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    // keep as-is
  }
  return `/api/raw/${decoded.split('/').filter(s => s && s !== '..').map(encodeURIComponent).join('/')}`;
}

/** YouTube video id from watch / youtu.be / shorts / embed URLs, else null. */
export function youtubeId(src: string): string | null {
  const match = src.match(
    /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

// [\s\S] rather than ".": lines from CRLF files keep a trailing \r, which "." rejects.
const QUOTE_PREFIX = /^([ \t]*(?:>[ \t]?)*)([\s\S]*)$/;

/**
 * Put every $$ fence on a line of its own, keeping any "> " callout prefix.
 *
 * Obsidian (MathJax) accepts $$x$$ on one line and $$\begin{aligned}… with
 * content after the opening fence. remark-math does not: text after an opening
 * $$ is discarded as fence "meta", and a one-line $$x$$ is parsed as inline math,
 * where \tag and aligned environments are errors.
 */
export function normalizeDisplayMath(text: string): string {
  const out: string[] = [];
  let inMath = false;

  for (const line of text.split('\n')) {
    const [, prefix, rest] = line.match(QUOTE_PREFIX)!;
    const trimmed = rest.trim();

    if (!inMath) {
      if (!trimmed.startsWith('$$')) {
        out.push(line);
        continue;
      }
      const afterOpen = trimmed.slice(2);
      const closeAt = afterOpen.lastIndexOf('$$');
      if (closeAt !== -1 && afterOpen.slice(closeAt + 2).trim() === '') {
        // $$ x $$ on one line
        const body = afterOpen.slice(0, closeAt).trim();
        out.push(`${prefix}$$`, ...(body ? [`${prefix}${body}`] : []), `${prefix}$$`);
        continue;
      }
      inMath = true;
      out.push(`${prefix}$$`);
      if (afterOpen.trim()) out.push(`${prefix}${afterOpen.trim()}`);
      continue;
    }

    // Inside display math: look for the closing fence at the end of the line.
    if (trimmed.endsWith('$$')) {
      const body = trimmed.slice(0, -2).trimEnd();
      if (body) out.push(`${prefix}${body}`);
      out.push(`${prefix}$$`);
      inMath = false;
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

/** "$\tag{ii}$" used inline as a label (an error in KaTeX and MathJax) -> "(ii)". */
export function inlineTagLabels(text: string): string {
  return text.replace(/(?<!\$)\$\s*\\tag\*?\{([^{}$]{1,20})\}\s*\$(?!\$)/g, '($1)');
}
