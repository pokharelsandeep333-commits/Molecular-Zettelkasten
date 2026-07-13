# Design System: Molecular Zettelkasten

## 1. Visual Theme & Atmosphere
A highly focused, technical dark-mode environment ("Cockpit Dense" meets "Art Gallery Airy"). The interface relies on deep, absolute neutral backgrounds (Zinc/Charcoal) contrasted by a singular, vibrant accent. It features glassmorphic overlay panels that float above the 3D knowledge graph. The motion is fluid and physics-based, communicating precision and speed.

## 2. Color Palette & Roles
- **Abyssal Background** (`#09090B`) — Primary background surface (Zinc-950).
- **Glass Surface** (`rgba(24, 24, 27, 0.6)`) — Translucent card and container fill for glassmorphic panels.
- **Pure Ink text** (`#FAFAFA`) — Primary text, high-contrast headings.
- **Muted Steel text** (`#A1A1AA`) — Secondary text, descriptions, metadata (Zinc-400).
- **Whisper Border** (`rgba(255,255,255,0.1)`) — Card borders, 1px structural lines for glass panels.
- **Electric Cyan Accent** (`#06B6D4`) — Single accent for CTAs, active states, focus rings, and highlighted graph nodes.

*(Max 1 accent. No purple/neon gradients. No pure black `#000000`.)*

## 3. Typography Rules
- **Display:** `Geist` — Track-tight, controlled scale, weight-driven hierarchy. Used for primary UI headings.
- **Body:** `Geist` — Relaxed leading, 65ch max-width, neutral secondary color.
- **Mono:** `Geist Mono` — For tags, metadata, file paths, and high-density metrics.
- **Banned:** `Inter`, `Times New Roman`, generic system fonts, and all serif fonts in the dashboard UI.

## 4. Component Stylings
* **Buttons:** Flat, tactile -1px translate on active state. Cyan fill for primary buttons, ghost/outline with whisper borders for secondary. No outer glows.
* **Cards (Glass Panels):** Heavy backdrop-blur (`backdrop-blur-md`), rounded corners (`1rem`). Diffused drop shadows. Used as floating panels over the 3D graph canvas.
* **Inputs/Search:** Label above, minimal border, focus ring in Electric Cyan. No floating labels. Left-aligned search icons.
* **Loaders:** Skeletal shimmer matching exact layout dimensions. No circular spinners.
* **Empty States:** Composed, illustrated structural compositions — not just "No data" text.

## 5. Layout Principles
- Absolute positioned, full-screen `react-force-graph-3d` canvas acts as the base layer (`z-0`).
- UI panels float above the canvas (`z-10`) with asymmetric padding.
- Strict single-column collapse below 768px (floating panels become full-width drawers).
- Contain overlay layouts using max-width constraints (e.g., sidebars fixed at 320px).
- No flexbox percentage math. No overlapping UI panels on desktop.

## 6. Motion & Interaction
- Spring physics for all interactive elements (buttons, hover hover states).
- Staggered cascade reveals when lists of search results mount.
- Smooth camera panning in the 3D graph.
- Hardware-accelerated transforms only.

## 7. Anti-Patterns (Banned)
- NEVER DO: Use emojis anywhere in the UI.
- NEVER DO: Use the `Inter` font.
- NEVER DO: Use pure black (`#000000`).
- NEVER DO: Use neon/outer glow shadows or oversaturated purple gradients.
- NEVER DO: Use 3-column equal card layouts.
- NEVER DO: Fabricate data or statistics.
- NEVER DO: Use AI copywriting clichés ("Elevate", "Seamless", "Unleash").
- NEVER DO: Use filler text ("Scroll to explore").
