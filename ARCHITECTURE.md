# Application Architecture Blueprint

This document serves as the technical blueprint for the **AI Content Studio**. It details the file structure, component hierarchy, state management, and data flow patterns used to build the application.

## 1. Project Structure

The project follows a standard React + Vite structure, enhanced for scalability and clarity.

```
/
├── src/
│   ├── components/       # Reusable UI components (buttons, inputs, displays)
│   ├── data/             # Static data, constants, and configuration
│   ├── services/         # API integration and business logic
│   ├── App.tsx           # Main application entry point & routing
│   ├── main.tsx          # React DOM rendering
│   ├── index.css         # Global styles & Tailwind theme
│   └── vite-env.d.ts     # TypeScript environment definitions
├── public/               # Static assets
├── server.ts             # Backend API (Express) for data persistence
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite build configuration
```

## 2. Core Technologies

*   **Frontend Framework:** React 18+ (Functional Components, Hooks)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (Utility-first) + Framer Motion (Animations)
*   **State Management:** React Context + Local State (`useState`, `useReducer`)
*   **Backend:** Express (Node.js) + Better-SQLite3 (Local Database)
*   **AI Integration:** Google Generative AI SDK (`@google/genai`)

## 3. Component Hierarchy

The application is structured around a single-page application (SPA) model with distinct "Suites" or "Modules".

### Main Layout (`App.tsx`)
*   **Navigation:** Sidebar/Top Bar for switching between modules.
*   **Global State:** User preferences, API keys, and shared data.

### Modules
1.  **Dashboard (`Home`)**: Overview of projects and quick actions.
2.  **Niche Analyzer (`Analyzer.tsx`)**:
    *   Input: Niche keywords.
    *   Output: Market analysis, gaps, and opportunities.
    *   *Key Components:* `QuickModelSelector`, `CostDisplay`.
3.  **Content Cloner (`Cloner.tsx`)**:
    *   Input: YouTube URL or text.
    *   Output: Rewritten scripts, improved titles, thumbnails.
    *   *Key Components:* `QuickModelSelector`, `CostDisplay`.
4.  **Video Creation Suite (`VideoCreationSuite`)**:
    *   Input: Script segments.
    *   Output: Generated video clips, voiceovers, and final render.
    *   *Key Components:* `RemotionPlayer`, `FFmpeg` integration.
5.  **Channel Report (`ChannelReport.tsx`)**:
    *   Input: Channel ID/Name.
    *   Output: Deep dive analytics and strategy.

## 4. Data Flow & State Management

### Local State
*   Used for UI interactions (loading states, form inputs, toggles).
*   Managed via `useState` within individual components.

### Global State (Context/Props)
*   **AI Settings:** Model selection, API keys. Passed down from `App.tsx` or accessed via a custom hook (if implemented).
*   **Project Data:** Stored in `localStorage` or the SQLite database and synced to the frontend.

### Data Persistence
*   **SQLite (`projects.db`):** Stores structured data like:
    *   `youtube_research`: Saved channel analyses and video ideas.
    *   `projects`: User-created projects (scripts, videos).
*   **API Layer (`server.ts`):**
    *   `GET /api/research`: Fetch saved research.
    *   `POST /api/research`: Save new research.
    *   `DELETE /api/research/:id`: Remove entries.

## 5. Key Services (`src/services/`)

*   **`aiService.ts`**:
    *   Centralized wrapper for all AI calls.
    *   Handles prompt engineering, model selection, and error handling.
    *   *Functions:* `generateText`, `generateVideoClip`, `generateVoiceover`.
*   **`youtube-service.ts`**:
    *   Handles interaction with the YouTube Data API.
    *   Fetches channel stats, video details, and search results.

## 6. Design System Implementation

*   **Tailwind Config:** Custom colors and fonts defined in `index.css` via CSS variables.
*   **Typography:** Enforced via utility classes (`font-serif`, `font-mono`, `tracking-tighter`).
*   **Theming:** Dark/Light mode support (currently optimized for Light/Beige theme).

## 7. Deployment & Build

*   **Development:** `npm run dev` (starts Vite + Express server).
*   **Production:** `npm run build` (compiles React to static assets) -> Served by Express.

---

**Rebuilding Instructions:**
1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  Set up environment variables (`.env`) for API keys.
4.  Run `npm run dev` to start the local development environment.
