import os
import json
import re
import time
import httpx
from duckduckgo_search import DDGS
from google.adk.agents import Agent

CRAWL4AI_URL = os.environ.get("CRAWL4AI_URL", "http://localhost:11235")
CRAWL4AI_TOKEN = os.environ.get("CRAWL4AI_TOKEN", "")

ENRICHMENT_FIELDS = {
    "deadline", "speaker_app_url", "website", "contact_email",
    "facebook", "twitter", "instagram", "linkedin", "theme", "notes",
}


def web_search(query: str) -> str:
    """Search the web using DuckDuckGo. Returns top 5 results as text with titles and URLs."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
        if not results:
            return "No results found."
        return "\n\n".join(
            f"[{r['title']}]({r['href']})\n{r['body']}"
            for r in results
        )
    except Exception as e:
        return f"Search error: {e}"


def web_fetch(url: str) -> str:
    """Fetch the HTML content of a URL and return it as plain text (first 5000 chars)."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.text[:5000]
    except Exception as e:
        return f"Fetch error for {url}: {e}"


def crawl4ai_fetch(url: str) -> str:
    """Fetch a URL using Crawl4AI for better extraction of JS-rendered pages. Falls back to web_fetch on error."""
    try:
        headers = {
            "Authorization": f"Bearer {CRAWL4AI_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {"urls": [url], "priority": 8}
        with httpx.Client(timeout=90) as client:
            r = client.post(f"{CRAWL4AI_URL}/crawl", headers=headers, json=payload)
            if r.status_code != 200:
                return web_fetch(url)

            task_id = r.json().get("task_id")
            if not task_id:
                return web_fetch(url)

            for _ in range(30):
                time.sleep(2)
                status_resp = client.get(
                    f"{CRAWL4AI_URL}/task/{task_id}", headers=headers
                )
                data = status_resp.json()
                if data.get("status") == "completed":
                    results = data.get("results", [])
                    if results:
                        markdown = results[0].get("markdown", "")
                        return markdown[:5000] if markdown else web_fetch(url)
                elif data.get("status") == "failed":
                    return web_fetch(url)

        return web_fetch(url)
    except Exception:
        return web_fetch(url)


AGENT_INSTRUCTION = """Sos un investigador especializado en eventos TEDx. Tu objetivo es encontrar información específica sobre el evento que se te indique.

Debés encontrar estos campos:
1. deadline: fecha límite para postularse como speaker (formato YYYY-MM-DD, o null si no encontrás)
2. speaker_app_url: URL del formulario de postulación para speakers (o null)
3. website: sitio web oficial del evento (NO ted.com, sino su propio sitio, o null)
4. contact_email: email de contacto del evento (o null)
5. facebook: URL de la página de Facebook del evento (o null)
6. twitter: URL de la cuenta de Twitter/X del evento (o null)
7. instagram: URL de la cuenta de Instagram del evento (o null)
8. linkedin: URL de la página de LinkedIn del evento (o null)
9. theme: tema o lema del evento para ese año (o null)
10. notes: información adicional relevante como cupo, idioma del evento, requisitos especiales (o null)

Estrategia de búsqueda:
1. Primero visitá la URL de ted.com del evento usando crawl4ai_fetch para obtener info básica
2. Buscá "{name} TEDx speaker application {year}" con web_search
3. Buscá "{name} TEDx {city} sitio web oficial" con web_search
4. Visitá los sitios relevantes que encuentres con web_fetch
5. Buscá las redes sociales: "{name} TEDx instagram", "{name} TEDx facebook"

IMPORTANTE: Al terminar, tu respuesta final DEBE ser ÚNICAMENTE el JSON, sin texto adicional:
{"deadline": null, "speaker_app_url": null, "website": null, "contact_email": null, "facebook": null, "twitter": null, "instagram": null, "linkedin": null, "theme": null, "notes": null}

Usá null para los campos que no encuentres. No inventes información."""


def create_agent() -> Agent:
    return Agent(
        name="tedx_researcher",
        model="gemini-2.0-flash",
        description="Investigador de eventos TEDx que busca información de speaker applications y datos de contacto",
        instruction=AGENT_INSTRUCTION,
        tools=[web_search, web_fetch, crawl4ai_fetch],
    )


def extract_json(text: str) -> dict:
    """Extract the enrichment JSON from agent response text."""
    default = {k: None for k in ENRICHMENT_FIELDS}

    # Try ```json ... ``` block first
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if m:
        try:
            obj = json.loads(m.group(1))
            if isinstance(obj, dict):
                return {**default, **{k: v for k, v in obj.items() if k in ENRICHMENT_FIELDS}}
        except json.JSONDecodeError:
            pass

    # Find JSON by counting brackets (handles the last/outermost object)
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
                        try:
                            obj = json.loads(text[i : j + 1])
                            if isinstance(obj, dict) and any(
                                k in obj for k in ENRICHMENT_FIELDS
                            ):
                                candidates.append(obj)
                        except json.JSONDecodeError:
                            pass
                        i = j
                        break
        i += 1

    if candidates:
        # Take the last candidate (most likely the final answer)
        best = candidates[-1]
        return {**default, **{k: v for k, v in best.items() if k in ENRICHMENT_FIELDS}}

    return default
