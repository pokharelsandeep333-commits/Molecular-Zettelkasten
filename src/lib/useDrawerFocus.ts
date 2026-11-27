import { useEffect, useRef } from 'react';

/** Keep keyboard navigation inside an open drawer and return focus when it closes. */
export function useDrawerFocus<T extends HTMLElement>(active: boolean) {
  const panelRef = useRef<T>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!active || !panel) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    const controls = () => Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(el => el.getClientRects().length > 0);
    controls()[0]?.focus({ preventScroll: true });
    const containTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      const from = document.activeElement;
      if ((event.shiftKey && from === first) || (!event.shiftKey && from === last) || !panel.contains(from)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener('keydown', containTab);
    return () => {
      document.removeEventListener('keydown', containTab);
      if (trigger?.isConnected && !document.querySelector('dialog[open]')) trigger.focus({ preventScroll: true });
    };
  }, [active]);
  return panelRef;
}
