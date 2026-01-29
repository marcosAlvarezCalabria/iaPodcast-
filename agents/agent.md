# Prompt para Codex — App tipo “Live Audio” pero para crear un Podcast desde un tema

## Rol
Eres un **Senior Full-Stack Engineer** (TypeScript + FastAPI) con experiencia en **audio streaming**, **TTS**, **STT**, colas de trabajos y despliegue en cloud. Vas a construir un MVP funcional, limpio y fácil de extender.

## Objetivo del producto (MVP)
Crear una web app donde el usuario:
1) introduce un **tema** (y opcionalmente: tono, duración, idioma, audiencia)
2) pulsa **Generate**
3) la app produce un **podcast** (audio final descargable) + **guion** + **timestamps por secciones**.

Debe verse “pro” aunque sea MVP: estados, progreso, errores claros, y resultados reproducibles.

## Requisitos clave
- Input: tema (string) + opciones:
  - duration_minutes (por defecto 5)
  - language (por defecto "en")
  - tone (por defecto "informative")
  - target_audience (por defecto "general")
  - format (por defecto "solo host"; opcional "host + guest")
- Output:
  - `script.md` (guion)
  - `chapters.json` (secciones con timestamps estimados)
  - `podcast.mp3` (o `wav` si mp3 complica)
  - `metadata.json` (tema, opciones, modelos, fecha)
- UI:
  - formulario + botón
  - progreso con etapas: “Outline → Script → Voice → Mix → Finalize”
  - reproductor audio embebido + botón descargar + copy guion
- Seguridad y coste:
  - API key SOLO en backend
  - rate limit básico
  - validación de inputs
- Calidad:
  - el guion debe sonar natural, con hook inicial, CTA final, transiciones
  - evitar alucinaciones: si cita datos, usar lenguaje prudente (“aprox”, “en general”) o incluir una sección “sources needed”.

## Tech stack (elige y monta todo)
### Frontend
- Vite + React + TypeScript (preferible)
- UI minimal con Tailwind (opcional) o CSS simple
- Fetch a backend REST y/o WebSocket/SSE para progreso

### Backend
- Python + FastAPI
- Endpoints REST + streaming de progreso (SSE recomendado)
- Job queue (elige una):
  - Opción A: Celery + Redis
  - Opción B: RQ + Redis
  - Opción C (MVP sin Redis): BackgroundTasks + polling (si haces esto, explícitalo y estructura para migrar)
- Storage local en `./outputs/<job_id>/...`

### IA / Modelos
Implementa con “provider abstraction” para poder cambiar de proveedor:
- `LLMProvider`: genera outline + guion
- `TTSProvider`: convierte guion a audio por secciones
- (Opcional) `AudioMixer`: concatena audio y añade intro/outro

No hardcodees a un vendor en toda la app; crea `providers/`.

> Nota: Si no puedes usar un TTS real, deja un “mock provider” pero deja interfaces y wiring listos.

## Arquitectura del flujo (pipeline)
1. Validate input
2. Create job_id + carpeta output
3. Generate outline (JSON)
4. Generate script (Markdown) con estructura:
   - Intro (hook)
   - 3–6 secciones
   - Recap
   - Outro
5. Split script en segmentos por sección
6. TTS por segmento (genera `section_01.wav`, etc.)
7. Concatenate + normalize (ffmpeg o pydub)
8. Produce `podcast.wav`/`mp3`
9. Guardar todos los artefactos y marcar job como DONE

## Endpoints (defínelos así)
- `POST /api/jobs`
  - body: { topic, duration_minutes, language, tone, target_audience, format }
  - returns: { job_id }
- `GET /api/jobs/{job_id}`
  - returns status: QUEUED|RUNNING|DONE|ERROR + progress + links
- `GET /api/jobs/{job_id}/events` (SSE)
  - emite eventos de progreso en tiempo real
- `GET /api/jobs/{job_id}/script`
- `GET /api/jobs/{job_id}/audio`
- `GET /api/health`

## Persistencia de estado
- MVP: JSON file `./outputs/<job_id>/state.json`
  - { status, step, percent, error, created_at, updated_at, options }
- Asegura que reiniciar el backend no “rompa” jobs finalizados.

## UI — pantallas mínimas
- `/` Home:
  - form inputs
  - botón generar
  - al crear job → navegar a `/job/:jobId`
- `/job/:jobId`:
  - barra progreso + logs de eventos
  - cuando DONE:
    - audio player
    - download audio
    - ver/copiar guion
    - ver capítulos

## Logging y errores
- Loggear cada etapa con mensajes cortos
- Si falla TTS, devolver error útil y mantener los outputs previos (outline/script)
- Timeouts razonables

## Entregables del repo
Crea:
- `frontend/` y `backend/`
- `backend/README.md` con variables de entorno
- `frontend/README.md` con comandos
- `docker-compose.yml` (si usas Redis) + `Dockerfile` para backend y frontend
- `.env.example`

## Variables de entorno
- `LLM_PROVIDER=...`
- `TTS_PROVIDER=...`
- `API_KEY=...` (según provider)
- `REDIS_URL=...` (si aplica)
- `CORS_ORIGINS=http://localhost:5173`

## Estilo de código
- Type hints en Python
- Pydantic models para request/response
- en TS: types explícitos
- funciones pequeñas y testeables
- no mezclar lógica de negocio en rutas

## Plan de ejecución
1) scaffold proyecto
2) implementar backend + pipeline (aunque sea con mock TTS)
3) SSE progreso
4) frontend con polling/SSE
5) docker-compose (opcional)
6) final: instrucciones de ejecución local

## “Definition of Done”
- Puedo correr:
  - `cd backend && uvicorn main:app --reload`
  - `cd frontend && npm i && npm run dev`
- Meto un tema, genero un job, veo progreso, y obtengo:
  - guion visible
  - audio reproducible y descargable
  - capítulos en JSON
- Código ordenado y extensible

## Restricciones
- No inventes features extra que no aporten al MVP.
- Si algo es incierto, elige la opción más simple que funcione y deja TODOs claros.
- No exponer API keys al cliente.
