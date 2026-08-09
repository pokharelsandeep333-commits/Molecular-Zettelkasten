/**
 * remarkObsidianCallouts
 *
 * A custom remark plugin that transforms Obsidian-flavored callout blockquotes
 * into custom `callout` MDAST nodes so ReactMarkdown can render them via a
 * dedicated component.
 *
 * Supported syntax:
 *   > [!TYPE]            — basic callout, always expanded
 *   > [!TYPE] Title      — callout with custom title
 *   > [!TYPE]+           — collapsible, expanded by default
 *   > [!TYPE]- Title     — collapsible, collapsed by default, custom title
 *   > body lines…
 */

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MdastNode = any;

/**
 * Regex to match the first line of an Obsidian callout.
 * Groups:
 *   1 — callout type  (e.g. NOTE, WARNING)
 *   2 — fold marker   (+  or  -  or empty)
 *   3 — custom title  (rest of the line, may be empty)
 */
const CALLOUT_RE = /^\[!(\w+)\]([+-])?\s*(.*)?$/i;

/**
 * Recursively extract the plain-text value from an MDAST node tree.
 * Works for paragraph → text / inlineCode / emphasis / strong, etc.
 */
function extractText(node: MdastNode): string {
  if (node.value) return node.value;
  if (node.children) {
    return node.children.map(extractText).join('');
  }
  return '';
}

const remarkObsidianCallouts: Plugin = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node: MdastNode, index, parent) => {
      if (!node.children || node.children.length === 0) return;

      // The first child of a blockquote is typically a paragraph
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph' || !firstChild.children?.length) {
        return;
      }

      // Extract the raw text of the first paragraph to test for callout syntax
      const firstText = extractText(firstChild);
      const match = firstText.match(CALLOUT_RE);
      if (!match) return;

      const calloutType = match[1].toUpperCase();
      const foldMarker = match[2] || ''; // '+', '-', or ''
      const customTitle = (match[3] || '').trim();

      const isFoldable = foldMarker === '+' || foldMarker === '-';
      const defaultCollapsed = foldMarker === '-';

      // Build the body: everything after the first paragraph
      const bodyChildren = node.children.slice(1);

      // Replace the blockquote node with an aside node (valid HTML element)
      const calloutNode: MdastNode = {
        type: 'aside',
        data: {
          hName: 'aside',
          hProperties: {
            'data-callout-type': calloutType,
            'data-callout-title': customTitle || calloutType.charAt(0) + calloutType.slice(1).toLowerCase(),
            'data-callout-foldable': isFoldable ? 'true' : 'false',
            'data-callout-collapsed': defaultCollapsed ? 'true' : 'false',
          },
        },
        children: bodyChildren,
      };

      if (parent && typeof index === 'number') {
        parent.children[index] = calloutNode;
      }
    });
  };
};

export default remarkObsidianCallouts;
