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
 * Regex to match the callout declaration at the start of a text node.
 * Groups:
 *   1 — callout type  (e.g. NOTE, WARNING)
 *   2 — fold marker   (+  or  -  or empty)
 *   3 — custom title  (rest of the line, up to the first newline)
 */
const CALLOUT_RE = /^\[!(\w+)\]([+-])?(?:[ \t]+([^\n]*))?/i;

const remarkObsidianCallouts: Plugin = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node: MdastNode, index, parent) => {
      if (!node.children || node.children.length === 0) return;

      // The first child of a blockquote is typically a paragraph
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph' || !firstChild.children?.length) {
        return;
      }

      // The callout syntax must be at the very beginning of the first text node
      const firstTextNode = firstChild.children[0];
      if (firstTextNode.type !== 'text' || !firstTextNode.value) {
        return;
      }

      const match = firstTextNode.value.match(CALLOUT_RE);
      if (!match) return;

      const calloutType = match[1].toUpperCase();
      const foldMarker = match[2] || ''; // '+', '-', or ''
      const customTitle = (match[3] || '').trim();

      const isFoldable = foldMarker === '+' || foldMarker === '-';
      const defaultCollapsed = foldMarker === '-';

      // Remove the callout declaration from the text node so it doesn't render in the body
      firstTextNode.value = firstTextNode.value.substring(match[0].length);
      
      // If there's a leading newline (e.g., from `> [!NOTE]\n> body`), strip it so we don't get an empty line
      if (firstTextNode.value.startsWith('\n')) {
        firstTextNode.value = firstTextNode.value.substring(1);
      }

      // If the text node is now empty, we could remove it, but ReactMarkdown handles empty text nodes fine.
      // We keep the entire `node.children` intact (including the modified first paragraph) as the body.
      const bodyChildren = node.children;

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
