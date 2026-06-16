# Glyphix

A Claude-style coding workspace with a green theme, built for **Gemini + Grok collaboration** and designed to **run locally for free first**.

## New here?
If you are on Android and want the easiest path, start with:
- `ANDROID-DEPLOY-GUIDE.md`
- `DEPLOYMENT-CHECKLIST.md`

## What this version gives you right now
- Claude-like three-panel layout
- Green theme
- Chat-first workspace
- Gemini / Grok / Compare / Draft+Review modes
- Local file import for code, text, ZIP, and EPUB
- File explorer with pinning
- In-browser artifact editing
- Live HTML preview
- Workspace auto-save in browser storage
- ZIP export of the full workspace
- Streaming chat route scaffold
- Provider abstraction for Gemini and Grok
- Optional free local model fallback through Ollama

## Important limitation
As a web app, this project **cannot automatically read all files on a user machine**. It can only access files and folders the user imports or explicitly grants access to.

## Quick start
```bash
npm install
npm run dev
```

Then open:
```bash
http://localhost:3000
```

## Run modes
### 1) Free local mode
No API keys needed.

You can already:
- import folders/files/ZIP/EPUB
- browse files
- pin files into context
- edit files in-browser
- preview HTML live
- export ZIP / JSON workspace backups

If no live providers are configured, the app uses a **local demo response mode** so the full UI still works.

### 2) Gemini + Grok mode
Copy `.env.example` to `.env.local` and add:
- `GEMINI_API_KEY`
- `XAI_API_KEY`

### 3) Optional free local AI with Ollama
If you want live AI without paying for cloud APIs, you can point the app at Ollama:

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

Then the app can use a local coding model whenever Gemini or Grok keys are missing.

## Current MVP behavior
### Working now
- Chat UI with streaming output
- Local file import
- ZIP and EPUB unpacking in the browser
- File preview for code/text/html/markdown/json
- Editable artifact panel
- Context packing from pinned files
- Provider switching and comparison orchestration
- Browser persistence
- Workspace ZIP export

### Next good upgrades
- Monaco editor and diff view
- Auth and persistent cloud storage
- Project database
- Better markdown rendering
- Sandboxed app runtime for React/Vite/Next previews
- Repo sync and retrieval indexing
- Desktop wrapper with Electron or Tauri

## File structure
```text
app/
  api/chat/stream/route.ts
  api/files/upload/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  app-shell.tsx
  chat-panel.tsx
  file-panel.tsx
  preview-panel.tsx
  sidebar.tsx
lib/
  file-utils.ts
  orchestrator.ts
  providers.ts
  types.ts
prototype/
  green-coder-prototype.html
```

## Suggested next steps
1. Add Monaco editor and diff/apply workflow
2. Add desktop packaging for deeper local file access
3. Add Auth.js + Postgres for saved projects across devices
4. Add retrieval indexing for large repos
5. Add stronger isolated runtime previews
