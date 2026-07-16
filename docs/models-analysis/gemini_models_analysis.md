# Gemini API Models Analysis (2026)

This document provides a comprehensive overview of the Gemini API models currently available, based on the official documentation.

## 1. Model Lifecycle & Versioning
Gemini models use specific naming patterns to indicate their readiness for production:
- **Stable** (e.g., `gemini-3.5-flash`): Fixed models that do not change. Recommended for production applications.
- **Preview** (e.g., `gemini-3.1-pro-preview`): Models available for testing and production, though they may have stricter rate limits. Deprecation notices are given at least 2 weeks in advance.
- **Latest** (e.g., `gemini-flash-latest`): A hot-swapped alias pointing to the newest release of a model variation.
- **Experimental**: Early access models strictly for gathering feedback, not suitable for production.

## 2. Gemini 3 Series (Current Generation)

The Gemini 3 series represents the bleeding-edge stable models:
- **`gemini-3.5-flash`**: The most intelligent model for sustained frontier performance on agentic and coding tasks.
- **`gemini-3.1-flash-lite`**: Frontier-class performance rivaling larger models at a fraction of the cost.
- **Previews**: Includes `gemini-3.1-pro-preview` for advanced complex problem-solving and vibe coding, and `gemini-3-flash-preview`.

## 3. Specialized Multimodal & Generative Models

Google has vastly expanded its domain-specific models:
- **Audio & Speech**: `gemini-3.5-live-translate-preview` (real-time translation for 70+ languages), `gemini-3.1-flash-live` (low-latency bidirectional voice), and `gemini-3.1-flash-tts` (speech generation).
- **Image Generation (Nano Banana)**: The image generation stack includes `Nano Banana 2` (high-efficiency production), `Nano Banana 2 Lite` (ultra-low latency), and `Nano Banana Pro` (studio-quality 4K visuals).
- **Video Generation**: `Veo 3.1 Preview` (cinematic video) and `Gemini Omni Flash` (conversational video editing).
- **Music Generation (Lyria)**: `Lyria 3 Pro` (full-length songs) and `Lyria RealTime` (streaming capabilities).

## 4. Agents & Tool Use Models
Next-generation agentic models:
- **`Computer Use Preview`**: Can automate UI actions like clicking and typing on a digital screen.
- **`Gemini Deep Research Preview`**: Autonomously executes multi-step research across hundreds of sources.
- **`Antigravity Agent Preview`**: A general-purpose managed agent that reasons, writes code, manages files, and browses inside a secure Linux sandbox.

## 5. Deprecations & Shut Down Models (The 404 Explanation)
The documentation clearly shows aggressive deprecation cycles for older models:
- **Shut Down**: `Gemini 2.0 Flash`, `Gemini 2.0 Flash-Lite`, `Gemini 3 Pro Preview`, and `Gemini 3.1 Flash-Lite Preview` have all been completely shut down.
- **Deprecated**: `Imagen 4`.
- **Implication**: Any models older than the 2.0 series (including the `gemini-1.5-flash` series you were using) have been permanently deleted from the API endpoints, which is exactly why your application was receiving a 404 error. The current production standard is `gemini-3.5-flash`.
