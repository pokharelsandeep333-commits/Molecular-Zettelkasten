import { useSyncExternalStore } from 'react';

// Layout breakpoints (match Tailwind's md / xl).
export const MOBILE_QUERY = '(max-width: 767px)';
export const DESKTOP_QUERY = '(min-width: 1280px)';

/** Subscribe to a CSS media query; false during server rendering. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const matchesNow = (query: string) =>
  typeof window !== 'undefined' && window.matchMedia(query).matches;
