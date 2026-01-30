# Roadmap del Flujo de Datos: iaPodcast

Este documento detalla el ciclo de vida de los datos, desde que surge una idea en la mente del usuario hasta que se convierte en una experiencia auditiva, pasando por las distintas APIs y transformaciones del sistema.

## Diagrama de Flujo de Datos

```mermaid
graph TD
    User([🧠 Mente del Usuario]) -->|Idea & Configuración| UI[💻 Interfaz Web (Next.js)]
    
    subgraph "Fase 1: Orquestación (Servidor)"
        UI -->|POST /api/jobs (JSON)| Handler[API Handler]
        Handler -->|Init Job| DB[(🗄️ Supabase)]
        Handler -->|Ejecutar| Runner[Job Orchestrator]
    end
    
    subgraph "Fase 2: Generación Creativa (Texto)"
        Runner -->|Prompt: "Generar Outline"| Groq[🤖 LLM: Groq (Llama 3.3)]
        Groq -->|JSON: { title, sections }| Runner
        Runner -->|Prompt: "Escribir Guion"| Groq
        Groq -->|Markdown: Narrativa completa| Runner
    end
    
    subgraph "Fase 3: Síntesis y Audio (Binario)"
        Runner -->|Split| Sections[Fragmentos de Texto]
        Sections -->|Texto por Sección| TTS[🗣️ TTS: Microsoft Edge]
        TTS -->|Buffer de Audio (MP3)| Runner
        Runner -->|Buffer.concat| Mixer[Mezclador de Audio]
        Mixer -->|Archivo Final| AudioFile[Audio Completo]
    end
    
    subgraph "Fase 4: Entrega"
        AudioFile -->|Upload| Storage[☁️ Supabase Storage]
        Storage -->|URL Pública| UI
        UI -->|Reproducción| User
    end
```

## Detalle de las Transformaciones

El sistema funciona como una tubería de transformación de datos, donde la información cambia de estado y formato en cada paso:

### 1. De Idea a Datos Estructurados (Input)
*   **Origen**: El usuario imagina un tema (ej. "La historia del café").
*   **Entrada**: Selecciona parámetros en la UI: Tono (Humor/Serio), Duración (Minutos) e Idioma.
*   **Transformación**: La idea abstracta se serializa en un objeto JSON.
    ```json
    { "topic": "La historia del café", "tone": "humorous", "duration": 5 }
    ```

### 2. De Datos a Estructura Lógica (LLM - Outline)
*   **Acción**: El `Job Runner` envía un prompt a **Groq** usando el modelo **Llama 3.3**.
*   **Transformación**: Se convierte la petición simple en un esqueleto estructurado (**JSON**).
    *   *Input*: "Habla del café, 5 mins".
    *   *Output*: Un JSON con títulos, secciones y puntos clave.

### 3. De Estructura a Narrativa (LLM - Script)
*   **Acción**: Se usa el *outline* como contexto para pedirle al LLM que redacte el contenido.
*   **Transformación**: El JSON rígido se convierte en texto fluido (**Markdown**), con retórica, pausas implícitas y estilo periodístico o narrativo.
    *   *Formato*: Archivo `script.md` guardado en Supabase ("Artifact").

### 4. De Narrativa a Señal Digital (TTS)
*   **Acción**: El script se divide en bloques. Cada bloque se envía a la API de **Microsoft Edge TTS** (o Cloudflare/Mock según configuración).
*   **Transformación**: Los caracteres (texto) se convierten en *buffers* binarios de audio (MP3/WAV).
    *   *Proceso*: `Texto String` -> `Solicitud HTTP` -> `Stream de Bytes`.

### 5. De Fragmentos a Producto Final (Mixing)
*   **Acción**: El sistema concatena los múltiples *buffers* de audio en memoria.
*   **Transformación**: Múltiples archivos temporales se fusionan en un único activo digital (`audio.mp3`).
*   **Persistencia**: El archivo final se sube al bucket `PodcastApp` en **Supabase Storage**.

### 6. Cierre del Ciclo (Feedback)
*   **Acción**: La UI recibe la URL pública del audio.
*   **Resultado**: El usuario escucha el podcast, completando el ciclo: de una idea en su mente a una vibración sonora en sus oídos.

## Tecnologías Clave
*   **Orquestación**: Next.js (Server Actions / API Routes).
*   **Inteligencia Artificial**: Groq (Llama 3.3-70b).
*   **Voz (TTS)**: `msedge-tts` (Microsoft Edge).
*   **Almacenamiento**: Supabase (PostgreSQL para estado, Storage para archivos).
*   **Patrones**: Chain of Responsibility (para fallbacks de proveedores), Módulos ESM.
