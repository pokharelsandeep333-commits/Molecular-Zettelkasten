<div align="center">
  <img src="https://img.shields.io/badge/Status-Online-00F0FF?style=for-the-badge&logo=google" alt="Status" />
  <img src="https://img.shields.io/badge/Gemini-Interactions_API-02050C?style=for-the-badge&logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Deployment-AWS_EC2-FF9900?style=for-the-badge&logo=amazonaws" alt="AWS" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
</div>

<br />

<div align="center">
  <h1 style="color: #00F0FF; font-family: monospace;">MOLECULAR ZETTELKASTEN</h1>
  <p><strong>Powered by the Neural Matrix & E.D.I.T.H.</strong></p>
</div>

## 🌌 Overview

**Molecular Zettelkasten** is a personal knowledge management web app that brings your notes to life. Instead of just organizing static text files in folders, this application connects your personal Obsidian vault directly to an advanced AI assistant named E.D.I.T.H.

Think of it as turning your notes into a conversational "second brain." When you ask a question, the AI intelligently reads through your notes to understand the context of your ideas. It can summarize topics, draw connections between different documents, and cite exactly where it found the information. 

By giving the AI direct access to your personal knowledge base, it can continuously learn, store, and retrieve information alongside you without losing context. You get to browse your ideas and chat with your vault in real-time, all within a sleek, premium interface.

## ✨ Core Features

*   **E.D.I.T.H. AI Assistant:** Powered by `@google/genai` and the state-of-the-art **Gemini Interactions API** (`gemini-3.5-flash`). E.D.I.T.H. features native server-side memory (`previous_interaction_id`) for lightning-fast, multi-turn conversations.
*   **Semantic RAG (Neural Matrix):** Seamlessly connects to your Obsidian Vault. E.D.I.T.H. uses **HyDE (Hypothetical Document Embeddings)** via `gemini-3.5-flash-8b` to run background vector searches against your notes, citing sources directly in her responses.
*   **Stark-Tech UI/UX:** A bespoke, hardware-accelerated interface featuring responsive glassmorphic sidebars, `Geist` typography, and a signature cyan (`#00F0FF`) glowing aesthetic powered by Framer Motion.
*   **Firebase Integration:** Secure Firebase Authentication ensures only authorized access. Firestore is used to persistently sync chat sessions across devices.
*   **Full-Text Markdown Rendering:** Native rendering of Obsidian-flavored markdown, including clickable wikilinks (`[[Note Name]]`), Mermaid diagrams, and code syntax highlighting.

## 🚀 Technology Stack

*   **Frontend / Framework:** Next.js 16 (App Router, Server Components), React 19
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

The application is containerized and deployed automatically to **AWS EC2** using a robust CI/CD pipeline. Here is how the official instance runs:

1.  **Standalone Next.js:** Optimized Docker builds using `output: 'standalone'` on a `node:24-slim` environment to support `glibc` requirements. C++ dependencies like `@xenova/transformers` are properly configured in `next.config.ts`.
2.  **GitHub Actions:** A multi-stage pipeline running ESLint (strict React 19 hooks purity checks), npm dependency auditing, Gitleaks secret scanning, Vitest unit tests, and finally building & pushing the image to Docker Hub on every commit to the `main` branch.
3.  **Watchtower (Zero-Downtime):** The EC2 server runs Watchtower to automatically pull the latest image from Docker Hub and restart the container, ensuring continuous delivery.
4.  **Vault Synchronization:** A utility script (`ec2-deployment/sync-vault.sh`) is included to pull the latest Obsidian vault updates from the remote repository to the EC2 server. This is typically configured as a cron job to keep the live web app automatically in sync with your notes.

## 🛠️ Local Development

### Prerequisites

*   Node.js v24+
*   An active Google Gemini API Key
*   Firebase Project Setup (Auth & Firestore)
*   **Obsidian Vault Configuration:** You must set up the [Personal-Wiki-Template](https://github.com/pokharelsandeep333-commits/Personal-Wiki-Template) in your Obsidian vault. This provides the required structure and the generated vector embeddings (`.smart-env` semantic database) necessary for the application to function correctly.

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
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
    ```

4.  Launch the development server:
    ```bash
    npm run dev
    ```

5.  Access the interface at `http://localhost:3000`.

## 🌍 Hosting & Deployment Options

If you want to host your own Molecular Zettelkasten, you must handle a few key configuration changes depending on your target environment. 

### Option A: Docker on a VPS (AWS EC2, DigitalOcean, etc.)
This mimics the official setup and is the most robust way to host it, as it supports persistent access to your Obsidian vault files. When deploying, consider the following requirements:
* **GitHub Actions Pipeline:** You must configure all required GitHub Secrets (Firebase API keys, DockerHub credentials) in your forked repository to enable the CI/CD pipeline.
* **Environment Variables:** Update the `.env` variables in the `ec2-deployment` folder before running `docker-compose up -d` on your server.
* **Reverse Proxy & SSL:** You will need to configure an Nginx reverse proxy to route external web traffic to the Docker container (running on port 3000) and secure your domain using Certbot/Let's Encrypt for SSL.
* **Automated Syncing:** Configure the provided `sync-vault.sh` script as a cron job on your server to automatically pull the latest changes from your remote Obsidian vault.

### Option B: Vercel / Serverless (Advanced)
Deploying to a serverless environment like Vercel requires some architectural changes because this app relies on reading a local file system:
* **Asset Bundling:** Serverless functions cannot easily read a large external folder of markdown files natively. You must place your Obsidian Vault directly inside the project directory before building so Vercel can bundle the files into the deployment.
* **Sync Limitations:** This workaround makes it harder to continuously sync new notes, as every new note saved will require triggering a full Vercel rebuild.

## 🧠 Development Guidelines

*   **Purity Checks:** We enforce strict React 19 purity rules. Do not use impure functions (like `Date.now()`) directly inside component bodies or inline event handlers.
*   **AI Integrations:** Always use the official `@google/genai` Interactions API. Do not use the deprecated `@ai-sdk/google` or `ai` packages.
*   **Security:** Never hardcode secrets. Ensure Firebase execution is wrapped in `typeof window !== 'undefined'` checks to prevent SSR compilation errors.

---

<div align="center">
  <p style="font-size: 12px; color: #00F0FF; opacity: 0.5;">EVEN DEAD, I'M THE HERO.</p>
</div>
