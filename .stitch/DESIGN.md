---
name: E.D.I.T.H. UI AR Interface
theme: DARK
colors:
  surface: '#040914'
  surface-dim: '#02050c'
  surface-bright: '#003264'
  surface-container-lowest: '#010308'
  surface-container-low: '#001e3c'
  surface-container: '#002850'
  surface-container-high: '#003c78'
  surface-container-highest: '#0050a0'
  on-surface: '#e0f7fa'
  on-surface-variant: '#b0d0d6'
  inverse-surface: '#e0f7fa'
  inverse-on-surface: '#02050c'
  outline: '#0078b4'
  outline-variant: '#004a78'
  surface-tint: '#00f0ff'
  primary: '#00f0ff'
  on-primary: '#00283c'
  primary-container: '#004a78'
  on-primary-container: '#b3f2ff'
  inverse-primary: '#00aacc'
  secondary: '#a0c8e0'
  on-secondary: '#003250'
  secondary-container: '#004664'
  on-secondary-container: '#cce6f4'
  tertiary: '#ffc8a0'
  on-tertiary: '#502800'
  tertiary-container: '#783c00'
  on-tertiary-container: '#ffe6cc'
  error: '#ffb4a0'
  on-error: '#640000'
  error-container: '#960000'
  on-error-container: '#ffd6cc'
  primary-fixed: '#b3f2ff'
  primary-fixed-dim: '#00f0ff'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#003c50'
  secondary-fixed: '#cce6f4'
  secondary-fixed-dim: '#a0c8e0'
  on-secondary-fixed: '#001f32'
  on-secondary-fixed-variant: '#003250'
  tertiary-fixed: '#ffe6cc'
  tertiary-fixed-dim: '#ffc8a0'
  on-tertiary-fixed: '#321400'
  on-tertiary-fixed-variant: '#502800'
  background: '#02050c'
  on-background: '#e0f7fa'
  surface-variant: '#003c78'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 24px
  gutter: 16px
  section-padding: 32px
  base-unit: 8px
---

## Visual Theme & Atmosphere
A stark, high-performance Augmented Reality interface inspired by Marvel's E.D.I.T.H. and Stark Tech. The density is extremely high (Cockpit Dense), with fluid cinematic motion and glassmorphic translucent panels resting over an infinite 3D grid space. The aesthetic is incredibly precise, clinical, and energetic. 

## Color Palette & Roles
- **Abyssal Void** (`#02050C`) — Primary background canvas, the deepest navy.
- **Glass Panel** (`rgba(0, 30, 60, 0.15)`) — Card and surface fills. Highly translucent with backdrop blurs.
- **Pure Cyan** (`#00F0FF`) — The absolute single accent color. Used for focal points, active states, and glowing node links in the graph. NO PURPLE, NO WARM NEONS.
- **Muted Steel** (`rgba(180, 220, 255, 0.7)`) — Secondary text and grid lines.
- **Whisper Border** (`rgba(0, 240, 255, 0.2)`) — 1px structural lines for cards.
- **Pure Ink** (`#FFFFFF`) — Headings and primary data.

## Typography Rules
- **Display:** `Outfit` — Geometric, wide, extremely precise and stark. Weight-driven hierarchy.
- **Body:** `Outfit` — Used for paragraphs, very clean sans-serif.
- **Mono:** `JetBrains Mono` — Mandatory for all numbers, file paths, IDs, tags, and small metadata to enforce the cockpit/tech vibe.
- **Banned:** Inter, all Serif fonts. 

## Component Stylings
- **Buttons:** Flat rectangles. Tactile -1px push interaction. Ghost outline styling with cyan accents for secondary buttons; solid cyan fill for primary. NO NEON OUTER GLOWS, just sharp high contrast.
- **Cards:** Glassmorphic overlays. Generous 1rem (`16px`) rounding. They must use background blur and 1px whisper borders. Subtle cyan inner shadow if active.
- **Inputs:** High density, mono-spaced labels above the field. Bottom border highlight on focus, no heavy bounding boxes.
- **Loaders:** Skeletal shimmering bars or structural grids rendering in real-time. No circular spinners.

## Layout Principles
- **Spatial Separation:** Absolute clean spatial zones. No text overlapping images.
- **Grid Background:** Always imply a subtle linear grid background structure.
- **Sidebar Integration:** A chat interface is permanently docked to the right side of the screen on desktop, seamlessly integrated with the content area.
- **No Equal Columns:** Asymmetric data layouts (e.g., 2/3 main, 1/3 sidebar) are required.

## Motion & Interaction
- **Perpetual Micro-Interactions:** Subtle pulsing opacities on graph nodes. 
- **Spring Physics:** `stiffness: 120, damping: 20` for a sharp, high-tech weighty snap.
- All hover states must feel instantaneous and highly responsive.

## Anti-Patterns (Banned)
- No emojis anywhere.
- No `Inter` or Serif fonts.
- No purple or neon gradients.
- No pure black `#000000` (use Abyssal Void `#02050C`).
- No outer glow shadows or drop shadows (use translucent glass instead).
- No 3-column equal grids.
- No "Acme" or "John Doe" placeholder text.
