<div align="center">
  <img src="https://img.shields.io/badge/Status-Online-00F0FF?style=for-the-badge&logo=google" alt="Status" />
  <img src="https://img.shields.io/badge/Gemini-Interactions_API-02050C?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Deployment-AWS_EC2-FF9900?style=for-the-badge&logo=amazonaws" alt="AWS" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
</div>

<br />

<div align="center">
  <h1 style="color: #00F0FF; font-family: monospace;">MOLECULAR ZETTELKASTEN</h1>
  <p><strong>Powered by the Neural Matrix & E.D.I.T.H.</strong></p>
</div>

## 🌌 Overview

**Molecular Zettelkasten** is a highly advanced, JARVIS/E.D.I.T.H.-inspired personal knowledge management interface. It bridges the gap between static markdown notes (Obsidian) and state-of-the-art AI (Google's Gemini Interactions API), creating an interactive "Neural Matrix" where your notes come alive.

Instead of just searching through folders, you can converse directly with your vault. E.D.I.T.H. uses **Semantic Retrieval-Augmented Generation (RAG)** via stateless vector searches to synthesize, summarize, and connect your ideas in real-time—complete with an ultra-premium, dark-mode, glassmorphic UI.

## ✨ Core Features

*   **E.D.I.T.H. AI Assistant:** Powered by `@google/genai` and the state-of-the-art **Gemini Interactions API** (`gemini-3.5-flash`). E.D.I.T.H. features native server-side memory (`previous_interaction_id`) for lightning-fast, multi-turn conversations.
*   **Semantic RAG (Neural Matrix):** Seamlessly connects to your Obsidian Vault. E.D.I.T.H. uses **HyDE (Hypothetical Document Embeddings)** via `gemini-3.5-flash-8b` to run background vector searches against your notes, citing sources directly in her responses.
*   **Stark-Tech UI/UX:** A bespoke, hardware-accelerated interface featuring a `react-force-graph-3d` knowledge canvas, responsive glassmorphic sidebars, `Geist` typography, and a signature cyan (`#00F0FF`) glowing aesthetic powered by Framer Motion.
*   **Firebase Integration:** Secure Firebase Authentication ensures only authorized access. Firestore is used to persistently sync chat sessions across devices.
*   **Full-Text Markdown Rendering:** Native rendering of Obsidian-flavored markdown, including clickable wikilinks (`[[Note Name]]`), Mermaid diagrams, and code syntax highlighting.

## 🚀 Technology Stack

*   **Frontend / Framework:** Next.js 15 (App Router, Server Components), React 19
*   **AI Engine:** Google Gemini Interactions API (`gemini-3.5-flash`, `gemini-3.5-flash-8b`)
*   **Styling & UI:** Tailwind CSS v4 + Custom CSS Variables + Framer Motion
*   **Database & Auth:** Firebase Auth & Firestore
*   **Markdown:** `react-markdown`, `remark-gfm`, `react-syntax-highlighter`
*   **Testing:** Vitest, React Testing Library

## 📂 Project Structure

```text
src/
├── app/                  # Next.js App Router pages and layouts
│   ├── api/              # Backend API routes (Chat, Search, Tree, etc.)
│   │   ├── chat/         # Interactions API & HyDE implementation
│   │   ├── search/       # Semantic vector search engine
│   │   └── notes/        # Obsidian Vault note retrieval
│   └── globals.css       # Tailwind entry and custom CSS variables
├── components/           # Reusable React components
│   ├── ChatSidebar.tsx   # E.D.I.T.H. chat interface
│   ├── MainContent.tsx   # Note viewer and primary workspace
│   ├── MarkdownRenderer.tsx # Obsidian markdown to React parser
│   └── OmniSearch.tsx    # Global semantic search palette
├── context/              # React Context Providers (e.g., AuthContext)
└── lib/                  # Utilities, Firebase configs, and logic
    ├── firebase.ts       # Firebase client initialization
    ├── firestoreChat.ts  # Firestore chat history sync logic
    └── vectorCache.ts    # Vector caching & cosine similarity math
```

## ⚙️ Architecture & Deployment

The application is containerized and deployed automatically to **AWS EC2** using a robust CI/CD pipeline.

1.  **Standalone Next.js:** Optimized Docker builds using `output: 'standalone'` on a `node:24-slim` environment to support `glibc` requirements. C++ dependencies like `@xenova/transformers` are properly configured in `next.config.ts`.
2.  **GitHub Actions:** Automatic linting (strict React 19 hooks purity checks), compilation, and image pushing to Docker Hub on every commit to the `main` branch.
3.  **Watchtower (Zero-Downtime):** The EC2 server runs Watchtower to automatically pull the latest image from Docker Hub and restart the container, ensuring continuous delivery.

## 🛠️ Local Development

### Prerequisites

*   Node.js v24+
*   An active Google Gemini API Key
*   Firebase Project Setup (Auth & Firestore)
*   An Obsidian Vault with generated vector embeddings (`.smart-env` semantic database)

### Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/pokharelsandeep333/Molecular-Zettelkasten.git
    cd Molecular-Zettelkasten
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure your environment variables (`.env.local`):
    ```env
    # AI Config
    GEMINI_API_KEY=your_gemini_api_key

    # Vault Integration
    VAULT_PATH=/path/to/your/obsidian/vault
    SMART_ENV_PATH=/path/to/your/obsidian/vault/.smart-env/

    # Application Url
    NEXT_PUBLIC_API_URL=http://localhost:3000

    # Firebase Config
    NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  Launch the development server:
    ```bash
    npm run dev
    ```

5.  Access the interface at `http://localhost:3000`.

## 🧠 Development Guidelines

*   **Purity Checks:** We enforce strict React 19 purity rules. Do not use impure functions (like `Date.now()`) directly inside component bodies or inline event handlers.
*   **AI Integrations:** Always use the official `@google/genai` Interactions API. Do not use the deprecated `@ai-sdk/google` or `ai` packages.
*   **Security:** Never hardcode secrets. Ensure Firebase execution is wrapped in `typeof window !== 'undefined'` checks to prevent SSR compilation errors.

---

<div align="center">
  <p style="font-size: 12px; color: #00F0FF; opacity: 0.5;">EVEN DEAD, I'M THE HERO.</p>
</div>
