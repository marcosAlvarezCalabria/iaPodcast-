# AI Voice Creator

Transform your ideas into professional AI-generated podcasts instantly.

**Live Demo:** [podcast.marcos-alvarez.dev](https://podcast.marcos-alvarez.dev)

## Features

- Generate podcast scripts with AI (Groq/Llama)
- Convert text to natural speech (Google Cloud TTS)
- Multiple languages (English, Spanish, French)
- Multiple voice options per language
- Different content styles (Reflection, Summary, Story, Explanation)
- Download generated audio as MP3

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Styling:** Tailwind CSS 4
- **LLM:** Groq (Llama models)
- **TTS:** Google Cloud Text-to-Speech
- **Storage:** Supabase Storage
- **Deployment:** Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
LLM_PROVIDER=groq
TTS_PROVIDER=google

GROQ_API_KEY=your_groq_api_key
GOOGLE_TTS_API_KEY=your_google_tts_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Deployment

Deploy to Cloudflare Pages:

```bash
npm run pages:build
```

## License

MIT
