<div align="center">
  <img src="https://img.shields.io/badge/Status-Online-00F0FF?style=for-the-badge&logo=google" alt="Status" />
  <img src="https://img.shields.io/badge/Gemini-Interactions_API-02050C?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Deployment-AWS_EC2-FF9900?style=for-the-badge&logo=amazonaws" alt="AWS" />
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

*   **E.D.I.T.H. AI Assistant:** Powered by `@google/genai` and the state-of-the-art **Gemini Interactions API**. E.D.I.T.H. features native server-side memory (`previous_interaction_id`) for lightning-fast, multi-turn conversations.
*   **Semantic RAG (Neural Matrix):** Seamlessly connects to your Obsidian Vault. E.D.I.T.H. uses HyDE (Hypothetical Document Embeddings) to run background vector searches against your notes, citing sources directly in her responses.
*   **Stark-Tech UI/UX:** A bespoke, hardware-accelerated interface featuring animated SVG micro-interactions, responsive sidebars, custom scrollbars, and a signature cyan (`#00F0FF`) glowing aesthetic.
*   **Full-Text Markdown Rendering:** Native rendering of Obsidian-flavored markdown, including clickable wikilinks (`[[Note Name]]`) that instantly open nodes in your vault visualization.

## 🚀 Technology Stack

*   **Framework:** Next.js (App Router, Server Components)
*   **AI Engine:** Google Gemini Interactions API (`gemini-3.5-flash`)
*   **Styling:** Tailwind CSS + Custom CSS Variables + Framer Motion
*   **Icons:** Lucide React
*   **Markdown:** `react-markdown`

## ⚙️ Architecture & Deployment

The application is containerized and deployed automatically to **AWS EC2** using a robust CI/CD pipeline.

1.  **Standalone Next.js:** Optimized Docker builds using `output: 'standalone'` on a `node:24-slim` environment.
2.  **GitHub Actions:** Automatic linting, compilation, and image pushing to Docker Hub on every commit to the `main` branch.
3.  **Watchtower (Zero-Downtime):** The EC2 server runs Watchtower to automatically pull the latest image from Docker Hub and restart the container, ensuring continuous delivery.

## 🛠️ Local Development

### Prerequisites

*   Node.js v24+
*   An active Google Gemini API Key
*   An Obsidian Vault (for the Neural Matrix context)

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
    GEMINI_API_KEY=your_api_key_here
    VAULT_PATH=/path/to/your/obsidian/vault
    NEXT_PUBLIC_API_URL=http://localhost:3000
    ```
4.  Launch the development server:
    ```bash
    npm run dev
    ```
5.  Access the interface at `http://localhost:3000`.

---
<div align="center">
  <p style="font-size: 12px; color: #00F0FF; opacity: 0.5;">EVEN DEAD, I'M THE HERO.</p>
</div>
