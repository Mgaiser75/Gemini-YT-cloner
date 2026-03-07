# Design System & Style Guide

This document outlines the visual language and architectural patterns for the **AI Content Studio** application. Adherence to these guidelines ensures a consistent, professional, and "crafted" aesthetic across the platform.

## 1. Core Philosophy

The design aesthetic is **"Neo-Brutalist Technical"**. It combines the raw, functional feel of developer tools with high-end editorial typography.

*   **Keywords:** Precision, Data-Dense, Crafted, Industrial, Retro-Future.
*   **Key Traits:**
    *   High contrast (Off-Black on Beige).
    *   Visible structure (borders, grids).
    *   Hard shadows (no blur).
    *   Monospace micro-labels for data.
    *   Italic Serif for major headings (human touch).

## 2. Color Palette

| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Background** | `#E4E3E0` | Main application background. A warm, industrial beige. |
| **Ink (Primary)** | `#141414` | Primary text, borders, and high-contrast backgrounds. |
| **Surface (Card)** | `#FFFFFF` | Card backgrounds, input fields. |
| **Accent** | `#F27D26` | Progress bars, highlights, active states. |
| **Success** | `#059669` | Success states, "Go" actions (Emerald-600). |
| **Error** | `#DC2626` | Error states, destructive actions (Red-600). |

### Usage Rules
*   **Text:** Almost exclusively `#141414`. Use opacity (e.g., `opacity-60`) for secondary text rather than lighter grays.
*   **Borders:** 1px solid `#141414` (or `rgba(20, 20, 20, 0.1)` for subtle dividers).
*   **Shadows:** Hard, non-blurred shadows.
    *   `shadow-[2px_2px_0px_0px_#141414]` (Small, sharp)
    *   `shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]` (Medium, depth)

## 3. Typography

### Primary Font: **Inter** (Sans-Serif)
Used for body text, UI controls, and general readability.
*   **Weights:** 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold).

### Display Font: **DM Serif Display** (Serif)
Used for major section headings to add editorial flair.
*   **Style:** Always **Italic**.
*   **Tracking:** Tighter (`tracking-tighter`).
*   **Example:** `font-serif italic tracking-tighter font-bold`

### Mono Font: **JetBrains Mono** (Monospace)
Used for data, labels, tags, and technical details.
*   **Style:** Often **Uppercase**.
*   **Tracking:** Widest (`tracking-widest`).
*   **Size:** Tiny (`text-[10px]` or `text-xs`).
*   **Example:** `font-mono uppercase tracking-widest text-[10px] font-bold opacity-50`

## 4. UI Components & Patterns

### Buttons
*   **Primary:** Solid `#141414` background, `#E4E3E0` text. Sharp corners or slight radius. Hard shadow on hover.
    *   `bg-[#141414] text-[#E4E3E0] font-bold hover:bg-[#141414]/90 shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]`
*   **Secondary:** Transparent background, `#141414` border.
    *   `border border-[#141414] text-[#141414] font-bold hover:bg-[#141414] hover:text-[#E4E3E0]`
*   **Ghost:** Text only, hover underline or background tint.

### Cards & Containers
*   **Background:** White or `#E4E3E0`.
*   **Border:** 1px solid `#141414` (often with `border-b` or full border).
*   **Shadow:** Hard shadow for elevation.
    *   `bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,0.05)]`

### Inputs
*   **Style:** Brutalist. Square edges, solid borders.
*   **Focus:** Thick outline or color change, no glow.
    *   `border border-[#141414] bg-transparent p-3 font-bold focus:outline-none focus:ring-2 ring-[#141414]/20`

### Badges & Tags
*   **Style:** Monospace, bordered or solid.
*   **Example:** `font-mono text-[10px] px-2 py-1 border border-[#141414]`

## 5. Layout & Spacing

*   **Grid:** Use CSS Grid for data-heavy layouts.
*   **Spacing:** Generous padding (`p-6`, `p-8`, `p-12`) to allow the typography to breathe.
*   **Structure:** Use visible lines (`border-b`, `border-r`) to separate content areas, mimicking a dashboard or newspaper layout.

## 6. Animation (Framer Motion)

*   **Feel:** Snappy, mechanical.
*   **Transitions:** `easeOut` or `easeInOut`.
*   **Duration:** Fast (0.2s - 0.3s).
*   **Usage:**
    *   Page transitions (fade + scale).
    *   List item stagger.
    *   Hover states (instant or very fast).

## 7. Iconography

*   **Library:** Lucide React.
*   **Style:** Stroke width 2px (matches the font weight).
*   **Size:** 16px (sm), 20px (md), 24px (lg).

---

**Implementation Note:**
All styles are enforced via Tailwind CSS utility classes and the custom theme defined in `src/index.css`. When creating new components, refer to this guide to maintain visual consistency.
