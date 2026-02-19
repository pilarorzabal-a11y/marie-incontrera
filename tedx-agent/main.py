"""
TEDx Enrichment Agent — FastAPI Server
Uses google-genai directly (same approach as tedx_agent_server.py)
POST /enrich → runs Gemini agent → returns JSON
"""

import os
import re
import json
import time
import requests
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional

from google import genai
from google.genai import types

# ── Config ─────────────────────────────────────────────────────
# Force this key in runtime to avoid accidental override from stale VM env vars.
GEMINI_API_KEY  = "AIzaSyAP7v_5U6aJcybL-fOvzrlforsHaa_JkHc"
TEDX_AGENT_TOKEN = os.environ.get("TEDX_AGENT_TOKEN", "tedxagent2026")
CRAWL4AI_URL    = os.environ.get("CRAWL4AI_URL", "http://localhost:11235")
CRAWL4AI_TOKEN  = os.environ.get("CRAWL4AI_TOKEN", "tedx2026secret")
MODEL           = "gemini-2.5-flash"
MAX_TURNS       = 12
MAX_RUNTIME_SECONDS = 85
PROMPT_FILE = Path(os.environ.get("TEDX_AGENT_PROMPT_FILE", "/home/ubuntu/tedx-agent/system_prompt.txt"))

app = FastAPI(title="TEDx Enrichment Agent")


# ── Auth ────────────────────────────────────────────────────────
def verify_token(authorization: str = Header(...)):
    if authorization != f"Bearer {TEDX_AGENT_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Schema ──────────────────────────────────────────────────────
class EnrichRequest(BaseModel):
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    event_date: Optional[str] = None
    url: Optional[str] = None
    event_type: Optional[str] = None


EMPTY_RESULT = {
    "deadline": None, "speaker_app_url": None, "website": None,
    "contact_email": None, "facebook": None, "twitter": None,
    "instagram": None, "linkedin": None, "theme": None, "notes": None,
}

ENRICHMENT_FIELDS = tuple(EMPTY_RESULT.keys())


# ── Tools ────────────────────────────────────────────────────────
def web_search(query: str) -> str:
    try:
        links, snips = web_search_results(query)
        out = []
        for i, (url, title) in enumerate(links[:8]):
            t = re.sub(r"<[^>]+>", "", title).strip()
            s = re.sub(r"<[^>]+>", "", snips[i]).strip() if i < len(snips) else ""
            out.append(f"- {t}\n  URL: {url}\n  {s}")
        return "\n\n".join(out) if out else f"No results for: {query}"
    except Exception as e:
        return f"Search error: {e}"


def _unwrap_ddg_url(url: str) -> str:
    # DDG HTML results often wrap outgoing links as /l/?uddg=<encoded-url>.
    # Decode to improve fetch/crawl success rate.
    try:
        if "duckduckgo.com/l/?" in url:
            q = parse_qs(urlparse(url).query)
            if q.get("uddg"):
                return unquote(q["uddg"][0])
    except Exception:
        pass
    return url


def web_search_results(query: str):
    # Provider 1: DuckDuckGo HTML
    last_err: Exception | None = None
    try:
        r = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36"},
            timeout=8,
        )
        links = re.findall(
            r'<a rel="nofollow" class="result__a" href="([^"]*)"[^>]*>(.*?)</a>',
            r.text, re.DOTALL,
        )
        links = [(_unwrap_ddg_url(u), t) for (u, t) in links]
        snips = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', r.text, re.DOTALL)
        if links:
            return links, snips
    except Exception as e:
        last_err = e

    # Provider 2: Bing
    bing_ok = False
    try:
        r = requests.get(
            "https://www.bing.com/search",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36"},
            timeout=10,
        )
        bing_ok = True
        blocks = re.findall(r'<li class="b_algo"[\s\S]*?<\/li>', r.text, re.DOTALL)
        if not blocks:
            # Fallback parser for markup variants.
            links = re.findall(r'<h2><a href="([^"]+)"[^>]*>([\s\S]*?)</a></h2>', r.text, re.DOTALL)
            links = links[:10]
            snips = re.findall(r'<div class="b_caption"[\s\S]*?<p>([\s\S]*?)</p>', r.text, re.DOTALL)[:10]
            if links:
                return links, snips
        links: list[tuple[str, str]] = []
        snips: list[str] = []
        for b in blocks[:10]:
            m = re.search(r'<h2><a href="([^"]+)"[^>]*>([\s\S]*?)</a>', b, re.DOTALL)
            if not m:
                continue
            url = m.group(1)
            title = m.group(2)
            s = ""
            sm = re.search(r'<div class="b_caption"[\s\S]*?<p>([\s\S]*?)</p>', b, re.DOTALL)
            if sm:
                s = sm.group(1)
            links.append((url, title))
            snips.append(s)
        if links:
            return links, snips
    except Exception as e:
        last_err = e

    if bing_ok:
        return [], []

    if last_err:
        raise last_err
    return [], []


def fetch_page(url: str) -> str:
    last_err: Exception | None = None
    for attempt in range(2):
        try:
            r = requests.get(
                url, timeout=12,
                headers={"User-Agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36"},
                allow_redirects=True,
            )
            r.raise_for_status()
            t = re.sub(r"<script[^>]*>.*?</script>", "", r.text, flags=re.DOTALL)
            t = re.sub(r"<style[^>]*>.*?</style>", "", t, flags=re.DOTALL)
            t = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r"\2 [\1]", t)
            t = re.sub(r"<[^>]+>", " ", t)
            return re.sub(r"\s+", " ", t).strip()[:10000]
        except Exception as e:
            last_err = e
            time.sleep(1.0 * (attempt + 1))
    return f"Fetch error: {last_err}"


def crawl_page(url: str) -> str:
    try:
        r = requests.post(
            f"{CRAWL4AI_URL}/crawl",
            json={"urls": [url],
                  "browser_config": {"headless": True, "java_script_enabled": True},
                  "crawler_params": {"delay_before_return_html": 1}},
            headers={"Authorization": f"Bearer {CRAWL4AI_TOKEN}"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        res = data.get("results", data.get("result", []))
        if isinstance(res, list) and res:
            content = res[0].get("markdown", res[0].get("extracted_content", ""))
        elif isinstance(res, dict):
            content = res.get("markdown", res.get("extracted_content", ""))
        else:
            content = str(data)[:5000]
        return (content or "No content")[:10000]
    except Exception:
        return fetch_page(url)  # fallback


# ── Agent ────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Sos un investigador experto en TEDx. Tu objetivo principal es conseguir:
1) contact_email
2) speaker_app_url

IMPORTANCIA:
- Si tenés que priorizar, priorizá SIEMPRE conseguir contact_email y speaker_app_url.
- website, redes, theme y notes son secundarios.

CAMPOS A DEVOLVER:
- deadline: fecha límite de postulación speaker (YYYY-MM-DD o null)
- speaker_app_url: URL del formulario/landing para aplicar como speaker (o null)
- website: sitio oficial del evento (no ted.com) (o null)
- contact_email: email de contacto real del evento/equipo organizador (o null)
- facebook, twitter, instagram, linkedin: URLs sociales (o null)
- theme: lema del evento (o null)
- notes: evidencias breves y útiles de cómo llegaste al dato

ESTRATEGIA (ADAPTATIVA):
- Diseñá tu propia estrategia según el evento, no te limites a una secuencia fija.
- Combiná web_search, fetch_page y crawl_page según convenga.
- Explorá variaciones de búsqueda por idioma, ciudad, país, nombre alternativo del evento y organizer.
- Revisá páginas típicas: apply, speakers, become-a-speaker, contact, about, team, faq.
- Buscá formularios (Google Forms, Typeform, Jotform, Airtable) y correos incrustados.
- Si no aparece email directo, intentá emails del organizer/equipo TEDx local claramente vinculados.
- Antes de cerrar, navegá al menos 2 URLs candidatas con fetch_page o crawl_page.

REGLAS DE CALIDAD:
- No inventes datos.
- Si un dato no es verificable, devolvelo como null.
- En notes, explica en 1-3 líneas la evidencia principal.
- Terminá llamando save_result UNA sola vez con todos los campos."""


def get_system_prompt() -> str:
    try:
        if PROMPT_FILE.exists():
            saved = PROMPT_FILE.read_text(encoding="utf-8").strip()
            if saved:
                return saved
    except Exception:
        pass
    return SYSTEM_PROMPT


def set_system_prompt(prompt: str) -> None:
    PROMPT_FILE.parent.mkdir(parents=True, exist_ok=True)
    PROMPT_FILE.write_text(prompt, encoding="utf-8")


TOOL_DEFS = [
    types.FunctionDeclaration(
        name="web_search",
        description="Busca en la web con DuckDuckGo. Devuelve títulos, URLs y snippets.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={"query": types.Schema(type=types.Type.STRING, description="Consulta de búsqueda")},
            required=["query"],
        ),
    ),
    types.FunctionDeclaration(
        name="fetch_page",
        description="Descarga una página web vía HTTP. Rápido, sin JS. Devuelve texto con links.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={"url": types.Schema(type=types.Type.STRING, description="URL a descargar")},
            required=["url"],
        ),
    ),
    types.FunctionDeclaration(
        name="crawl_page",
        description="Crawlea una página con browser (Crawl4AI). Maneja JS. Más lento pero más completo.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={"url": types.Schema(type=types.Type.STRING, description="URL a crawlear")},
            required=["url"],
        ),
    ),
    types.FunctionDeclaration(
        name="save_result",
        description="Guarda el resultado de la investigación. Llamar UNA sola vez al terminar.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "deadline":        types.Schema(type=types.Type.STRING, description="Fecha límite YYYY-MM-DD o null"),
                "speaker_app_url": types.Schema(type=types.Type.STRING, description="URL del formulario de aplicación"),
                "website":         types.Schema(type=types.Type.STRING, description="Sitio web oficial"),
                "contact_email":   types.Schema(type=types.Type.STRING, description="Email de contacto"),
                "facebook":        types.Schema(type=types.Type.STRING, description="URL de Facebook"),
                "twitter":         types.Schema(type=types.Type.STRING, description="URL de Twitter/X"),
                "instagram":       types.Schema(type=types.Type.STRING, description="URL de Instagram"),
                "linkedin":        types.Schema(type=types.Type.STRING, description="URL de LinkedIn"),
                "theme":           types.Schema(type=types.Type.STRING, description="Tema o lema del evento"),
                "notes":           types.Schema(type=types.Type.STRING, description="Info adicional relevante"),
            },
            required=[],
        ),
    ),
]

TOOL_HANDLERS = {
    "web_search": lambda a: web_search(a.get("query", "")),
    "fetch_page": lambda a: fetch_page(a.get("url", "")),
    "crawl_page": lambda a: crawl_page(a.get("url", "")),
    "save_result": lambda a: "OK",  # result captured separately
}


def merge_result(dst: dict, src: dict) -> None:
    for k in ENRICHMENT_FIELDS:
        v = src.get(k)
        if v is None:
            continue
        s = str(v).strip()
        if s and s.lower() != "null":
            dst[k] = s


def extract_json_from_text(text: str) -> dict:
    if not text:
        return {}

    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if m:
        try:
            obj = json.loads(m.group(1))
            return {k: obj.get(k) for k in ENRICHMENT_FIELDS if k in obj}
        except Exception:
            pass

    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return {k: obj.get(k) for k in ENRICHMENT_FIELDS if k in obj}
    except Exception:
        pass

    candidates = []
    i = 0
    while i < len(text):
        if text[i] == "{":
            depth = 0
            for j in range(i, len(text)):
                if text[j] == "{":
                    depth += 1
                elif text[j] == "}":
                    depth -= 1
                    if depth == 0:
                        chunk = text[i : j + 1]
                        try:
                            obj = json.loads(chunk)
                            if isinstance(obj, dict):
                                candidates.append(obj)
                        except Exception:
                            pass
                        i = j
                        break
        i += 1

    for obj in reversed(candidates):
        filtered = {k: obj.get(k) for k in ENRICHMENT_FIELDS if k in obj}
        if filtered:
            return filtered
    return {}


def run_agent(req: EnrichRequest) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY)
    year = (req.event_date or "")[:4] or "2026"
    started = time.time()

    user_msg = (
        f"Investigá el siguiente evento TEDx y encontrá la información solicitada. "
        f"Al terminar, llamá save_result con todo lo que encontraste.\n\n"
        f"- Nombre: {req.name}\n"
        f"- Ciudad: {req.city or 'desconocida'}\n"
        f"- País: {req.country or 'desconocido'}\n"
        f"- Fecha: {req.event_date or 'desconocida'} (año {year})\n"
        f"- URL ted.com: {req.url or 'no disponible'}\n"
        f"- Tipo: {req.event_type or 'Standard'}"
    )

    contents = [types.Content(role="user", parts=[types.Part(text=user_msg)])]
    config = types.GenerateContentConfig(
        system_instruction=get_system_prompt(),
        tools=[types.Tool(function_declarations=TOOL_DEFS)],
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="ANY")
        ),
        temperature=0.2,
    )

    result = dict(EMPTY_RESULT)
    reminded_to_save = False

    for turn in range(MAX_TURNS):
        if time.time() - started > MAX_RUNTIME_SECONDS:
            break
        # Retry on rate limits
        quota_exhausted = False
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=MODEL, contents=contents, config=config
                )
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    quota_exhausted = True
                    wait = 3 * (attempt + 1)
                    time.sleep(wait)
                else:
                    raise
        else:
            if quota_exhausted:
                result["notes"] = (
                    "Gemini quota agotada (RESOURCE_EXHAUSTED). "
                    "Cargar una API key con cuota para continuar el enriquecimiento."
                )
            break

        if not response.candidates or not response.candidates[0].content:
            break

        candidate = response.candidates[0]
        fcs = [p.function_call for p in candidate.content.parts
               if hasattr(p, "function_call") and p.function_call and p.function_call.name]
        if fcs:
            print(f"[enrich] turn={turn} tool_calls={[fc.name for fc in fcs]}", flush=True)
        else:
            print(f"[enrich] turn={turn} no_tool_calls", flush=True)

        if not fcs:
            # Some model runs return plain text/JSON without calling save_result.
            txt = " ".join(
                p.text for p in candidate.content.parts
                if hasattr(p, "text") and p.text
            ).strip()
            parsed = extract_json_from_text(txt)
            if parsed:
                merge_result(result, parsed)
                break  # final text response, done

            # If no structured output and no save_result call, push one explicit reminder
            # to close the loop with tool output.
            if not reminded_to_save:
                reminded_to_save = True
                contents.append(candidate.content)
                contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part(text="Todavía no llamaste save_result. Continuá investigando y llamá save_result con todos los campos, usando null cuando corresponda.")],
                    )
                )
                continue
            break

        contents.append(candidate.content)
        fn_responses = []

        for fc in fcs:
            args = dict(fc.args) if fc.args else {}
            if fc.name == "save_result":
                # Capture result
                merge_result(result, args)
                tool_result = "Resultado guardado correctamente."
            else:
                handler = TOOL_HANDLERS.get(fc.name)
                tool_result = handler(args) if handler else f"Unknown tool: {fc.name}"

            fn_responses.append(
                types.Part(function_response=types.FunctionResponse(
                    name=fc.name, response={"result": tool_result}
                ))
            )

        contents.append(types.Content(role="user", parts=fn_responses))

        # If save_result was called, we're done
        if any(fc.name == "save_result" for fc in fcs):
            break

    # Final LLM-only consolidation pass when tool loop didn't close with data.
    if not any(result.get(k) for k in ENRICHMENT_FIELDS):
        try:
            final_cfg = types.GenerateContentConfig(
                system_instruction=(
                    "Con la evidencia ya recolectada en esta conversación, "
                    "devolvé SOLO un JSON con estos campos: "
                    "deadline,speaker_app_url,website,contact_email,facebook,twitter,instagram,linkedin,theme,notes. "
                    "Usá null cuando no haya evidencia suficiente."
                ),
                temperature=0.1,
            )
            final_resp = client.models.generate_content(
                model=MODEL,
                contents=contents + [
                    types.Content(
                        role="user",
                        parts=[types.Part(text="Emití ahora el JSON final.")],
                    )
                ],
                config=final_cfg,
            )
            if final_resp.candidates and final_resp.candidates[0].content:
                txt = " ".join(
                    p.text for p in final_resp.candidates[0].content.parts
                    if hasattr(p, "text") and p.text
                ).strip()
                parsed = extract_json_from_text(txt)
                if parsed:
                    merge_result(result, parsed)
        except Exception:
            pass

    return result


# ── Endpoints ────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


class PromptRequest(BaseModel):
    prompt: str


@app.get("/settings/prompt")
def get_prompt(_: None = Depends(verify_token)):
    return {"prompt": get_system_prompt()}


@app.put("/settings/prompt")
def put_prompt(req: PromptRequest, _: None = Depends(verify_token)):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    set_system_prompt(prompt)
    return {"ok": True, "prompt": prompt}


@app.post("/enrich")
def enrich(req: EnrichRequest, _: None = Depends(verify_token)):
    try:
        return run_agent(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
