# 🎙️ AI Podcast Creator via WhatsApp Aesthetic

> **Transform ideas into professional audio podcasts instantly.**  
> Powered by **Groq (Llama 3)** for script generation and **Google Cloud Neural2 TTS** for lifelike voices.

![Project Status](https://img.shields.io/badge/Status-Beta-orange)
![License](https://img.shields.io/badge/License-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare-f38020)
![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare-f38020)

## 🎓 About This Project

This project was developed as part of my **Master's in AI Software Development**. It serves as a practical exploration of:
- Integrating Large Language Models (LLMs) into real-world applications.
- Building full-stack AI applications with Next.js.
- Implementing edge-compatible architectures.

It represents my journey in mastering AI-driven development. 🚀

## ✨ Features

- **🌍 Multi-Language Support**: Create podcasts in **15 languages**, including English, Spanish, French, Japanese, Russian, and more.
- **🗣️ Premium Neural Voices**: Uses Google's advanced `Neural2` voices for ultra-realistic speech.
- **⚡ Instant Generation**: Powered by Groq for sub-second script writing.
- **🎨 Beautiful UI**: A "WhatsApp-style" chat aesthetic with 3D Wheel Pickers and smooth animations.
- **🛑 Rate Limiting (Beta)**: Fair usage policy with cookie-based limits (4 generations/user).
- **📊 Usage Analytics**: Built-in audit logs for tracking token/character costs via Cloudflare.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Directory)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) (Edge Runtime)
- **LLM Provider**: [Groq](https://groq.com/) (Llama 3 70B)
- **TTS Provider**: [Google Cloud](https://cloud.google.com/text-to-speech)
- **Styling**: Tailwind CSS + Custom CSS Modules
- **Testing**: Jest + Playwright

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- API Keys for **Groq** and **Google Cloud**

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/marcosAlvarezCalabria/iaPodcast-.git
   cd iaPodcast-
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🧪 Testing

Run unit tests:
```bash
npm test
```

Run E2E tests (requires running server):
```bash
npx playwright test
```

## 📈 Analytics & Costs

The application automatically logs usage metrics to the server console (Cloudflare Logs) for every generation event (`USAGE_SUMMARY`), tracking:
- **Groq Tokens** (Input/Output)
- **Google TTS Characters**

---

Made with ❤️ by [Marcos Alvarez](https://github.com/marcosAlvarezCalabria)
