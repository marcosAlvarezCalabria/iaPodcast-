# Guía de Deployment: Next.js App en Cloudflare Pages con Supabase Storage

## Resumen del Proyecto

Aplicación de generación de podcasts con IA que:
- Genera guiones usando LLM (Groq)
- Convierte texto a audio con TTS (StreamElements/VoiceRSS)
- Almacena archivos en Supabase Storage
- Se despliega en Cloudflare Pages con Edge Runtime

---

## 1. Configuración de Edge Runtime

### Problema
Cloudflare Pages requiere Edge Runtime para las funciones serverless.

### Solución
Añadir `export const runtime = 'edge'` a todas las rutas API:

```typescript
// app/api/[ruta]/route.ts
export const runtime = "edge";
```

**Archivos modificados:**
- `app/api/health/route.ts`
- `app/api/jobs/route.ts`
- `app/api/jobs/[jobId]/route.ts`
- `app/api/jobs/[jobId]/audio/route.ts`
- `app/api/jobs/[jobId]/chapters/route.ts`
- `app/api/jobs/[jobId]/events/route.ts`
- `app/api/jobs/[jobId]/script/route.ts`

---

## 2. Compatibilidad con Web Crypto API

### Problema
Edge Runtime no soporta el módulo `crypto` de Node.js.

### Solución
Usar Web Crypto API en lugar de Node.js crypto:

```typescript
// src/lib/utils/ids.ts
// ANTES (Node.js):
import { randomUUID } from "crypto";
export const createJobId = (): string => randomUUID();

// DESPUÉS (Web Crypto API):
export const createJobId = (): string => crypto.randomUUID();
```

---

## 3. Configuración de Supabase Storage

### 3.1 Crear Bucket
1. Ir a Supabase → Storage → New Bucket
2. Nombre: `PodcastApp`
3. Marcar como **Public**

### 3.2 Configurar RLS Policies
Crear las siguientes políticas en SQL Editor:

```sql
-- INSERT Policy
CREATE POLICY "Allow insert for PodcastApp"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'PodcastApp');

-- SELECT Policy
CREATE POLICY "Allow select for PodcastApp"
ON storage.objects FOR SELECT
USING (bucket_id = 'PodcastApp');

-- UPDATE Policy
CREATE POLICY "Allow update for PodcastApp"
ON storage.objects FOR UPDATE
USING (bucket_id = 'PodcastApp');

-- DELETE Policy
CREATE POLICY "Allow delete for PodcastApp"
ON storage.objects FOR DELETE
USING (bucket_id = 'PodcastApp');
```

### 3.3 Obtener Service Role Key
1. Ir a Supabase → Settings → API
2. Copiar el **service_role key** (NO el anon key)
3. El JWT debe contener `"role":"service_role"`

---

## 4. TTS Provider Compatible con Edge Runtime

### Problema
La librería `msedge-tts` usa Node.js streams, incompatible con Edge Runtime.

### Solución
Crear un provider TTS basado en HTTP fetch:

```typescript
// src/lib/providers/tts/cloudflare.ts
const fetchFreeTTS = async (text: string, language: string): Promise<Uint8Array> => {
  // Opción 1: VoiceRSS (requiere API key gratuita)
  if (voiceRssKey) {
    const params = new URLSearchParams({
      key: voiceRssKey,
      hl: language === "es" ? "es-es" : "en-us",
      src: text,
      c: "MP3",
      f: "24khz_16bit_mono",
    });
    const response = await fetch(`https://api.voicerss.org/?${params}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  // Opción 2: StreamElements (gratis, sin API key)
  const voice = language === "es" ? "Conchita" : "Brian";
  const params = new URLSearchParams({ voice, text });
  const response = await fetch(
    `https://api.streamelements.com/kappa/v2/speech?${params}`
  );
  return new Uint8Array(await response.arrayBuffer());
};
```

### Registrar el Provider

```typescript
// src/lib/providers/registry.ts
import { createCloudflareTTSProvider } from "./tts/cloudflare";

export const providersRegistry = {
  tts: {
    edge: createEdgeTTSProvider,
    mock: createMockTTSProvider,
    cloudflare: createCloudflareTTSProvider, // Nuevo
  },
};
```

---

## 5. Variables de Entorno en Cloudflare

### Configuración
Ir a Cloudflare Pages → Settings → Environment variables

| Variable | Tipo | Valor |
|----------|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Plaintext** | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | `eyJ...` (JWT con role: service_role) |
| `LLM_PROVIDER` | Plaintext | `groq` |
| `GROQ_API_KEY` | Secret | `gsk_...` |
| `TTS_PROVIDER` | Plaintext | `cloudflare` |
| `VOICERSS_API_KEY` | Secret | (opcional) |

**IMPORTANTE:** Las variables `NEXT_PUBLIC_*` deben ser **Plaintext**, no Secret.

---

## 6. Arquitectura de Jobs con SSE

### Problema
En Edge Runtime, los jobs en segundo plano pueden ser terminados cuando el request responde.

### Solución
El job se dispara cuando el cliente conecta al SSE:

```typescript
// app/api/jobs/route.ts - POST solo crea el job
await initJob(jobId, metadata);
return NextResponse.json({ jobId });

// app/api/jobs/[jobId]/events/route.ts - SSE dispara el job
if (state.status === "QUEUED" && !jobStarted) {
  runJob(jobId).catch(console.error);
}
```

### Frontend Single-Page App
Todo en una página sin cambiar de URL:
1. **Estado form**: Usuario ingresa tema
2. **Estado generating**: Muestra progreso en tiempo real via SSE
3. **Estado done**: Reproductor de audio

---

## 7. Compatibilidad de Cloudflare Pages

### Activar nodejs_compat
1. Cloudflare Pages → Settings → Runtime
2. Activar **nodejs_compat** en Compatibility flags

### wrangler.toml (opcional)
```toml
name = "iapodcast"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
```

---

## 8. Checklist de Deployment

- [ ] Todas las rutas API tienen `export const runtime = 'edge'`
- [ ] Usar `crypto.randomUUID()` en lugar de Node.js crypto
- [ ] Bucket de Supabase creado y público
- [ ] RLS policies configuradas (INSERT, SELECT, UPDATE, DELETE)
- [ ] Service Role Key (no anon key) en variables de entorno
- [ ] `NEXT_PUBLIC_SUPABASE_URL` como Plaintext (no Secret)
- [ ] TTS provider compatible con Edge (cloudflare provider)
- [ ] nodejs_compat activado en Cloudflare

---

## 9. Troubleshooting

### Error: "edge runtime does not support Node.js 'stream' module"
→ Usar TTS provider basado en HTTP fetch, no msedge-tts

### Error: "new row violates row-level security policy"
→ Verificar que se usa service_role key, no anon key
→ Crear RLS policies para el bucket

### Error: HTTP 530 en Supabase
→ Verificar variables de entorno en Cloudflare
→ `NEXT_PUBLIC_*` debe ser Plaintext, no Secret

### Job se queda en 0%
→ El job debe dispararse via SSE, no en el POST
→ Verificar que el endpoint /events dispara runJob()

### Audio no reproduce (NotSupportedError)
→ El TTS está generando audio inválido
→ Verificar logs de VoiceRSS/StreamElements
→ VoiceRSS: verificar que la cuenta esté activa

---

## 10. Arquitectura Final

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Cloudflare      │────▶│   Supabase      │
│   (Next.js)     │     │  Pages (Edge)    │     │   Storage       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │   External APIs   │
                   │  - Groq (LLM)     │
                   │  - StreamElements │
                   │  - VoiceRSS       │
                   └──────────────────┘
```

---

## 11. Archivos Clave

```
app/
├── page.tsx                          # Single-page app (form + progress + player)
├── api/
│   ├── jobs/
│   │   ├── route.ts                  # POST: crear job
│   │   └── [jobId]/
│   │       ├── route.ts              # GET: estado del job
│   │       ├── events/route.ts       # SSE: progreso + dispara job
│   │       └── audio/route.ts        # Redirect a Supabase URL

src/lib/
├── providers/
│   ├── tts/
│   │   └── cloudflare.ts             # TTS compatible con Edge
│   └── registry.ts                   # Registro de providers
├── jobs/
│   ├── runner.ts                     # Lógica del job
│   └── storage.ts                    # Supabase storage utils
└── utils/
    └── ids.ts                        # Web Crypto UUID
```
