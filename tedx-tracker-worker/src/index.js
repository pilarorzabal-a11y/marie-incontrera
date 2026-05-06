const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TEDx Deadline Tracker</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --red: #E62B1E;
    --black: #0A0A0A;
    --white: #F5F5F0;
    --gray: #2A2A2A;
    --gray-light: #3D3D3D;
    --muted: #888;
    --accent: #FF6B35;
    --green: #2ECC71;
    --purple: #4a154b;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--black); color: var(--white); font-family: 'IBM Plex Sans', sans-serif; font-weight: 300; min-height: 100vh; }

  header {
    border-bottom: 1px solid var(--gray-light);
    padding: 20px 40px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: sticky; top: 0;
    background: var(--black); z-index: 100;
  }
  .logo { background: var(--red); color: var(--white); font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 1px; padding: 5px 12px; border-radius: 2px; }
  header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 2px; flex: 1; }
  header .sub { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); }

  main { max-width: 1100px; margin: 0 auto; padding: 40px; }

  .drop-zone {
    border: 2px dashed var(--gray-light);
    border-radius: 6px;
    padding: 60px 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    margin-bottom: 32px;
  }
  .drop-zone.dragover { border-color: var(--red); background: rgba(230,43,30,0.05); }
  .drop-zone.loaded { padding: 16px 24px; display: flex; align-items: center; gap: 14px; text-align: left; border-style: solid; border-color: var(--green); }
  .drop-zone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .drop-zone h2 { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 2px; margin-bottom: 8px; }
  .drop-zone p { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }
  .drop-zone.loaded h2 { font-size: 15px; margin: 0; }
  .drop-zone.loaded p { font-size: 11px; margin: 0; }
  .drop-icon { font-size: 36px; display: block; margin-bottom: 12px; }
  .drop-zone.loaded .drop-icon { font-size: 20px; margin: 0; }
  .hint { display: inline-block; margin-top: 16px; border: 1px solid var(--gray-light); padding: 7px 18px; border-radius: 2px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; background: var(--gray); }
  .drop-zone.loaded .hint { display: none; }
  .loaded-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--green); margin-left: auto; white-space: nowrap; }

  .error-box { display: none; background: rgba(230,43,30,0.1); border: 1px solid rgba(230,43,30,0.4); border-radius: 4px; padding: 16px 20px; margin-bottom: 24px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #ff6b6b; }

  .stats { display: none; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--gray-light); border: 1px solid var(--gray-light); border-radius: 4px; overflow: hidden; margin-bottom: 32px; }
  .stat { background: var(--gray); padding: 18px 20px; text-align: center; }
  .stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: var(--red); display: block; }
  .stat-lbl { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

  .section { display: none; background: var(--gray); border: 1px solid var(--gray-light); border-radius: 4px; padding: 28px 32px; margin-bottom: 28px; }
  .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 2px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .opt { border: 1px solid var(--gray-light); border-radius: 4px; padding: 14px 16px; cursor: pointer; transition: all 0.15s; position: relative; }
  .opt:hover, .opt.active { border-color: var(--red); background: rgba(230,43,30,0.06); }
  .opt h4 { font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: 1px; margin-bottom: 4px; }
  .opt p { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); }
  .opt input[type=radio] { position: absolute; top: 12px; right: 12px; accent-color: var(--red); }

  .row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .row label { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); white-space: nowrap; }
  select { background: var(--gray-light); border: 1px solid var(--gray-light); color: var(--white); font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 8px 12px; border-radius: 2px; outline: none; cursor: pointer; }
  select:focus { border-color: var(--red); }
  input[type=text] { background: var(--gray-light); border: 1px solid var(--gray-light); color: var(--white); font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 8px 12px; border-radius: 2px; outline: none; flex: 1; }
  input[type=text]:focus { border-color: var(--red); }

  .btn { font-family: 'Bebas Neue', sans-serif; letter-spacing: 1.5px; font-size: 15px; padding: 10px 20px; border: none; border-radius: 2px; cursor: pointer; transition: all 0.15s; }
  .btn-red { background: var(--red); color: var(--white); }
  .btn-red:hover { background: #c8221a; }
  .btn-green { background: var(--green); color: var(--black); width: 100%; font-size: 17px; padding: 13px; }
  .btn-green:hover { background: #27ae60; }
  .btn-outline { background: transparent; color: var(--white); border: 1px solid var(--gray-light); }
  .btn-outline:hover { border-color: var(--white); }
  .btn-slack { background: var(--purple); color: var(--white); width: 100%; font-size: 17px; padding: 13px; }
  .btn-slack:hover { background: #611a5e; }
  .btn-slack:disabled { opacity: 0.4; cursor: not-allowed; }
  .hint-text { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 10px; text-align: center; }

  .controls { display: none; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .controls input[type=text] { flex: 1; min-width: 200px; }

  .tbl-wrap { display: none; border: 1px solid var(--gray-light); border-radius: 4px; overflow: hidden; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead { background: var(--gray); border-bottom: 2px solid var(--red); }
  thead th { font-family: 'IBM Plex Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); padding: 11px 14px; text-align: left; cursor: pointer; white-space: nowrap; user-select: none; }
  thead th:hover { color: var(--white); }
  tbody tr { border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.1s; }
  tbody tr:hover { background: rgba(255,255,255,0.03); }
  tbody td { padding: 11px 14px; vertical-align: middle; line-height: 1.4; }

  .badge { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 3px 7px; border-radius: 2px; white-space: nowrap; }
  .b-past { background: rgba(136,136,136,0.15); color: var(--muted); }
  .b-crit { background: rgba(230,43,30,0.2); color: #ff6b6b; border: 1px solid rgba(230,43,30,0.3); }
  .b-soon { background: rgba(255,107,53,0.15); color: var(--accent); }
  .b-ok { background: rgba(46,204,113,0.12); color: var(--green); }
  .b-fut { background: rgba(255,255,255,0.06); color: var(--muted); }

  .d-past { color: var(--muted); }
  .d-crit { color: #ff6b6b; font-weight: 500; }
  .d-soon { color: var(--accent); }
  .d-ok { color: var(--green); }

  .pill { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 2px 7px; border-radius: 2px; text-decoration: none; margin: 1px; transition: opacity 0.1s; }
  .pill:hover { opacity: 0.75; }
  .pill-form { background: rgba(230,43,30,0.2); color: #ff6b6b; }
  .pill-web { background: rgba(255,255,255,0.08); color: var(--muted); }
  .pill-mail { background: rgba(46,204,113,0.15); color: var(--green); }

  .theme-sub { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); display: block; margin-top: 2px; }

  input[type=checkbox] { accent-color: var(--red); width: 14px; height: 14px; cursor: pointer; }

  .pagination { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-top: 1px solid var(--gray-light); background: var(--gray); font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); }
  .pg-btns { display: flex; gap: 6px; }
  .pg-btn { background: var(--gray-light); color: var(--white); border: none; padding: 4px 10px; border-radius: 2px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; cursor: pointer; }
  .pg-btn:hover, .pg-btn.active { background: var(--red); }
  .pg-btn:disabled { opacity: 0.3; cursor: default; }

  .sel-row { display: none; align-items: center; gap: 10px; margin-bottom: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); }
  .sel-count { background: var(--red); color: white; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 2px 8px; border-radius: 2px; }

  .empty { display: none; text-align: center; padding: 40px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }

  .slack-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .slack-logo { width: 28px; height: 28px; }
  .slack-chan { font-family: 'IBM Plex Mono', monospace; font-size: 11px; background: rgba(74,21,75,0.4); color: #c89fd4; border: 1px solid rgba(74,21,75,0.5); padding: 3px 10px; border-radius: 2px; margin-left: auto; }
  .webhook-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .webhook-row input { flex: 1; }
  .wh-status { font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: 2px; white-space: nowrap; align-self: center; }
  .wh-ok { background: rgba(46,204,113,0.15); color: var(--green); }
  .wh-err { background: rgba(230,43,30,0.15); color: #ff6b6b; }
  .wh-hint { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); margin-bottom: 18px; line-height: 1.7; }
  .wh-hint a { color: var(--accent); }
  .slack-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .slack-opt { border: 1px solid var(--gray-light); border-radius: 4px; padding: 12px 14px; cursor: pointer; transition: all 0.15s; position: relative; }
  .slack-opt:hover, .slack-opt.active { border-color: var(--purple); background: rgba(74,21,75,0.1); }
  .slack-opt h4 { font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1px; margin-bottom: 3px; }
  .slack-opt p { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); }
  .slack-opt input[type=radio] { position: absolute; top: 10px; right: 10px; accent-color: var(--purple); }
  .slack-preview { background: var(--black); border: 1px solid var(--gray-light); border-radius: 4px; padding: 14px 18px; margin-top: 14px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; display: none; white-space: pre-wrap; }

  .toast { position: fixed; bottom: 28px; right: 28px; background: var(--green); color: var(--black); font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 500; padding: 12px 20px; border-radius: 4px; z-index: 1000; opacity: 0; transform: translateY(8px); transition: all 0.3s; pointer-events: none; }
  .toast.show { opacity: 1; transform: translateY(0); }

  .loading { display: none; text-align: center; padding: 32px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }
  .spinner { width: 28px; height: 28px; border: 2px solid var(--gray-light); border-top-color: var(--red); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 700px) {
    main { padding: 24px 16px; }
    .stats { grid-template-columns: repeat(2,1fr); }
    .grid2, .slack-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<header>
  <div class="logo">TEDx</div>
  <h1>DEADLINE TRACKER</h1>
  <span class="sub">→ Google Calendar + Slack</span>
</header>

<main>

  <div class="drop-zone" id="dropZone">
    <input type="file" id="fileInput" accept=".csv,.xlsx,.xls">
    <span class="drop-icon" id="dropIcon">\u{1F4CA}</span>
    <h2 id="dropTitle">Subí tu archivo MASTER UNIFIED</h2>
    <p id="dropSub">Arrastrá el CSV o Excel aquí · o hacé click para seleccionarlo</p>
    <span class="hint">TEDxMASTER_UNIFIED.csv / .xlsx</span>
  </div>

  <div class="error-box" id="errorBox"></div>
  <div class="loading" id="loading"><div class="spinner"></div>Procesando…</div>

  <div class="stats" id="stats">
    <div class="stat"><span class="stat-val" id="sTotal">0</span><span class="stat-lbl">Con Deadline</span></div>
    <div class="stat"><span class="stat-val" id="sFuture">0</span><span class="stat-lbl">Futuros</span></div>
    <div class="stat"><span class="stat-val" id="sCrit">0</span><span class="stat-lbl">Críticos ≤7d</span></div>
    <div class="stat"><span class="stat-val" id="sForm">0</span><span class="stat-lbl">Con Formulario</span></div>
  </div>

  <div class="section" id="calSection">
    <div class="section-title">\u{1F4C5} Exportar a Google Calendar</div>
    <div class="grid2">
      <div class="opt active" id="optAll" onclick="setExportFilter('all')">
        <input type="radio" name="ef" value="all" checked>
        <h4>Todos con Deadline</h4>
        <p>Incluye pasados y futuros</p>
      </div>
      <div class="opt" id="optFuture" onclick="setExportFilter('future')">
        <input type="radio" name="ef" value="future">
        <h4>Solo Futuros</h4>
        <p>Deadline a partir de hoy</p>
      </div>
      <div class="opt" id="optSelected" onclick="setExportFilter('selected')">
        <input type="radio" name="ef" value="selected">
        <h4>Selección Manual</h4>
        <p>Los que marcaste en la tabla</p>
      </div>
      <div class="opt" id="optForm" onclick="setExportFilter('form')">
        <input type="radio" name="ef" value="form">
        <h4>Con Formulario</h4>
        <p>Tienen submission form o contacto</p>
      </div>
    </div>
    <div class="row">
      <label>⏰ Recordatorio:</label>
      <select id="reminderSel">
        <option value="10080,1440" selected>1 semana + 1 día antes</option>
        <option value="10080">1 semana antes</option>
        <option value="4320">3 días antes</option>
        <option value="1440">1 día antes</option>
      </select>
    </div>
    <button class="btn btn-green" onclick="exportICS()">⬇ EXPORTAR .ICS PARA GOOGLE CALENDAR</button>
    <p class="hint-text">Google Calendar → Configuración → Importar y exportar → Importar</p>
  </div>

  <div class="section" id="slackSection">
    <div class="slack-header">
      <svg class="slack-logo" viewBox="0 0 54 54" fill="none">
        <path d="M19.7 32.3a4.1 4.1 0 1 1-4.1-4.1h4.1v4.1z" fill="#E01E5A"/>
        <path d="M21.8 32.3a4.1 4.1 0 0 1 8.2 0v10.2a4.1 4.1 0 1 1-8.2 0V32.3z" fill="#E01E5A"/>
        <path d="M25.9 19.7a4.1 4.1 0 1 1 4.1-4.1v4.1h-4.1z" fill="#36C5F0"/>
        <path d="M25.9 21.8a4.1 4.1 0 0 1 0 8.2H15.7a4.1 4.1 0 1 1 0-8.2h10.2z" fill="#36C5F0"/>
        <path d="M38.5 25.9a4.1 4.1 0 1 1 4.1 4.1h-4.1v-4.1z" fill="#2EB67D"/>
        <path d="M36.4 25.9a4.1 4.1 0 0 1-8.2 0V15.7a4.1 4.1 0 1 1 8.2 0v10.2z" fill="#2EB67D"/>
        <path d="M32.3 38.5a4.1 4.1 0 1 1-4.1 4.1v-4.1h4.1z" fill="#ECB22E"/>
        <path d="M32.3 36.4a4.1 4.1 0 0 1 0-8.2h10.2a4.1 4.1 0 1 1 0 8.2H32.3z" fill="#ECB22E"/>
      </svg>
      <div class="section-title" style="margin:0">ENVIAR A SLACK</div>
      <span class="slack-chan">#tedx-application-tracking</span>
    </div>
    <div class="webhook-row">
      <input type="text" id="webhookUrl" placeholder="https://hooks.slack.com/services/T.../B.../..." oninput="onWebhookInput()">
      <span class="wh-status" id="whStatus" style="display:none"></span>
      <button class="btn btn-outline" onclick="testWebhook()" style="font-size:13px;padding:8px 14px;">Probar</button>
    </div>
    <div class="wh-hint">
      ¿No tenés el webhook? → <a href="https://api.slack.com/apps" target="_blank">api.slack.com/apps</a> → Create App → Incoming Webhooks → Add Webhook → elegí <strong>#tedx-application-tracking</strong> → copiá la URL
    </div>
    <div class="slack-grid">
      <div class="slack-opt active" id="sOptCrit" onclick="setSlackFilter('critical')">
        <input type="radio" name="sf" value="critical" checked>
        <h4>\u{1F534} Solo Críticos</h4><p>Vencen en ≤7 días</p>
      </div>
      <div class="slack-opt" id="sOptSoon" onclick="setSlackFilter('soon')">
        <input type="radio" name="sf" value="soon">
        <h4>\u{1F7E0} Próximos 30 días</h4><p>Este mes</p>
      </div>
      <div class="slack-opt" id="sOptFut" onclick="setSlackFilter('future')">
        <input type="radio" name="sf" value="future">
        <h4>✅ Todos los futuros</h4><p>A partir de hoy</p>
      </div>
      <div class="slack-opt" id="sOptSel" onclick="setSlackFilter('selected')">
        <input type="radio" name="sf" value="selected">
        <h4>☑ Selección manual</h4><p>Marcados en la tabla</p>
      </div>
    </div>
    <div class="row">
      <label>Máximo:</label>
      <select id="slackMax"><option value="5">5 eventos</option><option value="10" selected>10 eventos</option><option value="20">20 eventos</option><option value="999">Todos</option></select>
    </div>
    <button class="btn btn-slack" id="slackBtn" onclick="sendToSlack()" disabled>\u{1F4E4} ENVIAR A #tedx-application-tracking</button>
    <div class="slack-preview" id="slackPreview"></div>
  </div>

  <div class="controls" id="controls">
    <input type="text" id="searchBox" placeholder="Buscar nombre, ciudad, tema…" oninput="applyFilters()">
    <select id="stFilter" onchange="applyFilters()">
      <option value="">Todos</option>
      <option value="future">Solo futuros</option>
      <option value="critical">Críticos ≤7d</option>
      <option value="past">Vencidos</option>
    </select>
    <select id="tyFilter" onchange="applyFilters()">
      <option value="">Todos los tipos</option>
      <option value="Standard">Standard</option>
      <option value="University">University</option>
      <option value="Women">Women</option>
      <option value="Salon">Salon</option>
    </select>
    <button class="btn btn-outline" onclick="resetFilters()" style="font-size:13px;padding:8px 14px;">Limpiar</button>
  </div>

  <div class="sel-row" id="selRow">
    <input type="checkbox" id="selAll" onchange="toggleAll(this.checked)">
    <label for="selAll" style="cursor:pointer">Seleccionar todos</label>
    <span class="sel-count" id="selCount" style="display:none">0</span>
  </div>

  <div class="tbl-wrap" id="tblWrap">
    <table>
      <thead>
        <tr>
          <th style="width:36px"></th>
          <th onclick="sortBy('urgency')">Estado ↕</th>
          <th onclick="sortBy('deadline')">Deadline ↕</th>
          <th onclick="sortBy('name')">Evento ↕</th>
          <th onclick="sortBy('location')">País ↕</th>
          <th>Ciudad</th>
          <th>Links</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
    <div class="pagination">
      <span id="pgInfo">—</span>
      <div class="pg-btns" id="pgBtns"></div>
    </div>
  </div>
  <div class="empty" id="empty">No se encontraron eventos con esos filtros.</div>

</main>

<div class="toast" id="toast"></div>

<script>
let allEvents = [], filtered = [], selected = new Set();
let exportFilter = 'all', slackFilter = 'critical';
let sortField = 'deadline', sortDir = 1;
let page = 1;
const PER_PAGE = 50;

const dz = document.getElementById('dropZone');
const fi = document.getElementById('fileInput');

dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('dragover'); });
dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) processFile(f);
});
fi.addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) processFile(f);
  fi.value = '';
});

function processFile(file) {
  hideError();
  document.getElementById('loading').style.display = 'block';
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onerror = () => { showError('No se pudo leer el archivo. Intentá de nuevo.'); };
  if (ext === 'csv') {
    reader.onload = e => {
      try { const rows = parseCSV(e.target.result); buildEvents(rows, file.name); }
      catch(err) { showError('Error procesando CSV: ' + err.message); }
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    reader.onload = e => {
      try { const rows = parseXLSX(e.target.result); buildEvents(rows, file.name); }
      catch(err) { showError('Error procesando Excel: ' + err.message + '. Intentá exportar como CSV desde Excel/Google Sheets.'); }
    };
    reader.readAsBinaryString(file);
  } else {
    showError('Formato no soportado. Usá .csv o .xlsx');
    document.getElementById('loading').style.display = 'none';
  }
}

function parseCSV(text) {
  text = text.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
  const lines = text.split('\\n');
  if (lines.length < 2) throw new Error('CSV vacío o inválido');
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseXLSX(binary) {
  throw new Error('Para mejor compatibilidad, exportá el archivo como CSV desde Excel o Google Sheets (Archivo → Descargar → CSV)');
}

function parseDeadline(val) {
  if (!val || !val.trim()) return null;
  const s = val.trim().toLowerCase();
  if (['closed', '/', 'cancelled?', 'do not apply', 'n/a', '-'].includes(s)) return null;
  let d = new Date(val.trim());
  if (!isNaN(d.getTime())) return d;
  const parts = val.trim().split(/[\\/\\-\\.]/);
  if (parts.length === 3) {
    const attempts = [
      new Date(parts[2] + '-' + parts[0].padStart(2,'0') + '-' + parts[1].padStart(2,'0')),
      new Date(parts[2] + '-' + parts[1].padStart(2,'0') + '-' + parts[0].padStart(2,'0'))
    ];
    for (const a of attempts) {
      if (!isNaN(a.getTime()) && a.getFullYear() > 2020) return a;
    }
  }
  return null;
}

function buildEvents(rows, fileName) {
  const today = new Date(); today.setHours(0,0,0,0);
  allEvents = [];
  rows.forEach((row, i) => {
    const dl = parseDeadline(row['DEADLINE']);
    if (!dl) return;
    const diff = Math.ceil((dl - today) / 86400000);
    let urg, urgCls, dlCls;
    if (diff < 0)       { urg = 'VENCIDO'; urgCls = 'b-past'; dlCls = 'd-past'; }
    else if (diff <= 7) { urg = 'CRÍTICO'; urgCls = 'b-crit'; dlCls = 'd-crit'; }
    else if (diff <= 30){ urg = 'PRONTO';  urgCls = 'b-soon'; dlCls = 'd-soon'; }
    else if (diff <= 90){ urg = 'OK';      urgCls = 'b-ok';   dlCls = 'd-ok'; }
    else                { urg = 'FUTURO';  urgCls = 'b-fut';  dlCls = 'd-past'; }
    allEvents.push({
      id: i, name: row['NAME'] || '', deadline: dl,
      dlStr: dl.toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }),
      diff, urg, urgCls, dlCls,
      location: row['LOCATION'] || row['STATE / PROVINCE / COUNTRY'] || row['STATE/PROVINCE/COUNTRY'] || '',
      city: row['CITY'] || '', theme: row['THEME'] || '', type: row['TYPE'] || '',
      website: row['WEBSITE'] || '', form: row['SUBMISSION FORM'] || '',
      contact: row['CONTACT'] || '', organizer: row['ORGANIZER'] || '',
      eventDate: row['EVENT DATE'] || '', notes: row['NOTES'] || '',
    });
  });
  allEvents.sort((a,b) => a.deadline - b.deadline);
  if (allEvents.length === 0) {
    showError('No se encontraron eventos con DEADLINE válido en el archivo. Verificá que sea la hoja correcta.');
    return;
  }
  filtered = [...allEvents];
  page = 1;
  updateStats();
  renderTable();
  showUI(fileName);
}

function updateStats() {
  document.getElementById('sTotal').textContent = allEvents.length;
  document.getElementById('sFuture').textContent = allEvents.filter(e => e.diff >= 0).length;
  document.getElementById('sCrit').textContent = allEvents.filter(e => e.diff >= 0 && e.diff <= 7).length;
  document.getElementById('sForm').textContent = allEvents.filter(e => e.form || e.contact).length;
}

function showUI(fileName) {
  document.getElementById('loading').style.display = 'none';
  dz.classList.add('loaded');
  document.getElementById('dropIcon').textContent = '✓';
  document.getElementById('dropTitle').textContent = fileName || 'Archivo cargado';
  document.getElementById('dropSub').textContent = 'Arrastrá otro archivo aquí para actualizar · o hacé click';
  document.getElementById('stats').style.display = 'grid';
  document.getElementById('calSection').style.display = 'block';
  document.getElementById('slackSection').style.display = 'block';
  document.getElementById('controls').style.display = 'flex';
  document.getElementById('selRow').style.display = 'flex';
  document.getElementById('tblWrap').style.display = 'block';
  loadWebhook();
}

function renderTable() {
  const start = (page-1)*PER_PAGE;
  const slice = filtered.slice(start, start+PER_PAGE);
  const tbody = document.getElementById('tbody');
  if (filtered.length === 0) {
    document.getElementById('tblWrap').style.display = 'none';
    document.getElementById('empty').style.display = 'block';
    return;
  }
  document.getElementById('tblWrap').style.display = 'block';
  document.getElementById('empty').style.display = 'none';
  tbody.innerHTML = slice.map(ev => {
    const chk = selected.has(ev.id) ? 'checked' : '';
    const fLink = ev.form && ev.form.startsWith('http') ? '<a class="pill pill-form" href="' + ev.form + '" target="_blank">FORM</a>' : '';
    const wLink = ev.website && ev.website.startsWith('http') ? '<a class="pill pill-web" href="' + ev.website + '" target="_blank">WEB</a>' : '';
    const mLink = ev.contact && ev.contact.includes('@') ? '<a class="pill pill-mail" href="mailto:' + ev.contact.split('/')[0].trim() + '">MAIL</a>' : '';
    return '<tr><td><input type="checkbox" ' + chk + ' onchange="toggleSel(' + ev.id + ',this.checked)"></td><td><span class="badge ' + ev.urgCls + '">' + ev.urg + '</span></td><td class="' + ev.dlCls + '">' + ev.dlStr + '</td><td><span>' + ev.name + '</span>' + (ev.theme ? '<span class="theme-sub">' + ev.theme.slice(0,45) + (ev.theme.length>45?'…':'') + '</span>' : '') + '</td><td style="font-size:12px;color:var(--muted)">' + ev.location + '</td><td style="font-size:12px;color:var(--muted)">' + ev.city + '</td><td>' + fLink + wLink + mLink + '</td></tr>';
  }).join('');
  renderPagination();
  updateSelCount();
}

function renderPagination() {
  const total = filtered.length;
  const pages = Math.ceil(total/PER_PAGE);
  const s = (page-1)*PER_PAGE+1, e2 = Math.min(page*PER_PAGE, total);
  document.getElementById('pgInfo').textContent = s + '–' + e2 + ' de ' + total;
  const c = document.getElementById('pgBtns');
  if (pages <= 1) { c.innerHTML=''; return; }
  let h = '<button class="pg-btn" onclick="goPage(' + (page-1) + ')" ' + (page===1?'disabled':'') + '>←</button>';
  for (let p=1; p<=pages; p++) {
    if (p===1||p===pages||Math.abs(p-page)<=1) h += '<button class="pg-btn ' + (p===page?'active':'') + '" onclick="goPage(' + p + ')">' + p + '</button>';
    else if (Math.abs(p-page)===2) h += '<span style="color:var(--muted);padding:0 4px">…</span>';
  }
  h += '<button class="pg-btn" onclick="goPage(' + (page+1) + ')" ' + (page===pages?'disabled':'') + '>→</button>';
  c.innerHTML = h;
}

function goPage(p) { page=p; renderTable(); }

function applyFilters() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const st = document.getElementById('stFilter').value;
  const ty = document.getElementById('tyFilter').value;
  filtered = allEvents.filter(ev => {
    if (q && !(ev.name + ' ' + ev.city + ' ' + ev.theme + ' ' + ev.location).toLowerCase().includes(q)) return false;
    if (st==='future' && ev.diff < 0) return false;
    if (st==='critical' && (ev.diff<0||ev.diff>7)) return false;
    if (st==='past' && ev.diff>=0) return false;
    if (ty && ev.type!==ty) return false;
    return true;
  });
  sortData(); page=1; renderTable();
}

function resetFilters() {
  document.getElementById('searchBox').value='';
  document.getElementById('stFilter').value='';
  document.getElementById('tyFilter').value='';
  filtered=[...allEvents]; sortData(); page=1; renderTable();
}

function sortBy(f) {
  if (sortField===f) sortDir*=-1; else { sortField=f; sortDir=1; }
  sortData(); renderTable();
}

function sortData() {
  filtered.sort((a,b) => {
    if (sortField==='deadline') return sortDir*(a.deadline-b.deadline);
    if (sortField==='name') return sortDir*a.name.localeCompare(b.name);
    if (sortField==='location') return sortDir*a.location.localeCompare(b.location);
    if (sortField==='urgency') return sortDir*(a.diff-b.diff);
    return 0;
  });
}

function toggleSel(id, checked) { checked ? selected.add(id) : selected.delete(id); updateSelCount(); }
function toggleAll(checked) { filtered.forEach(ev => checked ? selected.add(ev.id) : selected.delete(ev.id)); renderTable(); }
function updateSelCount() {
  const el=document.getElementById('selCount');
  el.style.display=selected.size>0?'inline-block':'none';
  el.textContent=selected.size+' sel.';
}

function setExportFilter(v) {
  exportFilter=v;
  ['All','Future','Selected','Form'].forEach(n => {
    document.getElementById('opt'+n).classList.toggle('active', n.toLowerCase()===v);
  });
}

function getExportEvents() {
  if (exportFilter==='all') return allEvents;
  if (exportFilter==='future') return allEvents.filter(e=>e.diff>=0);
  if (exportFilter==='selected') return allEvents.filter(e=>selected.has(e.id));
  if (exportFilter==='form') return allEvents.filter(e=>e.form||e.contact);
  return allEvents;
}

function fmtDate(d) {
  const pad=n=>String(n).padStart(2,'0');
  return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
}
function esc(s) { return String(s||'').replace(/\\\\/g,'\\\\\\\\').replace(/;/g,'\\\\;').replace(/,/g,'\\\\,').replace(/\\n/g,'\\\\n'); }

function exportICS() {
  const evs = getExportEvents();
  if (!evs.length) { toast('⚠ No hay eventos para exportar'); return; }
  const reminders = document.getElementById('reminderSel').value.split(',').map(Number);
  const base = Date.now();
  let lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TEDx Deadline Tracker//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:TEDx Deadlines'];
  evs.forEach((ev,i) => {
    const desc=[];
    if (ev.form?.startsWith('http')) desc.push('\u{1F4CB} FORM: '+ev.form);
    if (ev.contact) desc.push('\u{1F4E7} CONTACTO: '+ev.contact);
    if (ev.website?.startsWith('http')) desc.push('\u{1F310} WEB: '+ev.website);
    if (ev.theme) desc.push('\u{1F3AF} TEMA: '+ev.theme);
    if (ev.type) desc.push('\u{1F4CC} TIPO: '+ev.type);
    if (ev.organizer) desc.push('\u{1F464} ORGANIZER: '+ev.organizer);
    if (ev.eventDate) desc.push('\u{1F4C5} EVENTO: '+ev.eventDate);
    const end=new Date(ev.deadline); end.setDate(end.getDate()+1);
    const alarms=reminders.map(m=>'BEGIN:VALARM\\r\\nACTION:DISPLAY\\r\\nDESCRIPTION:⏰ DEADLINE: '+esc(ev.name)+'\\r\\nTRIGGER:-PT'+m+'M\\r\\nEND:VALARM');
    lines.push('BEGIN:VEVENT',
      'UID:tedx-'+base+'-'+i+'@tracker',
      'DTSTAMP:'+fmtDate(new Date())+'T000000Z',
      'DTSTART;VALUE=DATE:'+fmtDate(ev.deadline),
      'DTEND;VALUE=DATE:'+fmtDate(end),
      'SUMMARY:⏰ DEADLINE: '+esc(ev.name),
      'DESCRIPTION:'+esc(desc.join('\\n')),
      'LOCATION:'+esc(ev.city||ev.location),
      'CATEGORIES:TEDx',
      ...alarms,
      'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob=new Blob([lines.join('\\r\\n')],{type:'text/calendar;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='TEDx_Deadlines_'+evs.length+'_eventos.ics'; a.click();
  toast('✓ '+evs.length+' eventos exportados → importá el .ics en Google Calendar');
}

function setSlackFilter(v) {
  slackFilter=v;
  ['Crit','Soon','Fut','Sel'].forEach(n=>{
    const map={Crit:'critical',Soon:'soon',Fut:'future',Sel:'selected'};
    document.getElementById('sOpt'+n).classList.toggle('active',map[n]===v);
  });
}

function loadWebhook() {
  try {
    const s=localStorage.getItem('tedx_wh');
    if (s) { document.getElementById('webhookUrl').value=s; document.getElementById('slackBtn').disabled=false; setWhStatus('ok','✓ Guardado'); }
  } catch(e){}
}

function onWebhookInput() {
  const v=document.getElementById('webhookUrl').value.trim();
  const ok=v.startsWith('https://hooks.slack.com/');
  document.getElementById('slackBtn').disabled=!ok;
  if (ok) { try{localStorage.setItem('tedx_wh',v);}catch(e){} setWhStatus('ok','✓ Válido'); }
  else if (v.length>10) setWhStatus('err','✗ Inválida');
  else document.getElementById('whStatus').style.display='none';
}

function setWhStatus(t,m) {
  const el=document.getElementById('whStatus');
  el.style.display='inline-block'; el.className='wh-status '+(t==='ok'?'wh-ok':'wh-err'); el.textContent=m;
}

async function testWebhook() {
  const url=document.getElementById('webhookUrl').value.trim();
  if (!url.startsWith('https://hooks.slack.com/')) { setWhStatus('err','✗ URL inválida'); return; }
  setWhStatus('ok','↻ Probando…');
  try {
    await fetch(url,{method:'POST',body:JSON.stringify({text:'✅ TEDx Deadline Tracker conectado a *#tedx-application-tracking*!'})});
    setWhStatus('ok','✓ OK'); toast('✓ Mensaje de prueba enviado');
  } catch(e) { setWhStatus('ok','✓ Enviado'); toast('✓ Mensaje de prueba enviado'); }
}

async function sendToSlack() {
  const url=document.getElementById('webhookUrl').value.trim();
  if (!url.startsWith('https://hooks.slack.com/')) { toast('⚠ Ingresá el Webhook primero'); return; }
  const max=parseInt(document.getElementById('slackMax').value);
  let evs=allEvents.filter(ev=>{
    if (slackFilter==='critical') return ev.diff>=0&&ev.diff<=7;
    if (slackFilter==='soon') return ev.diff>=0&&ev.diff<=30;
    if (slackFilter==='future') return ev.diff>=0;
    if (slackFilter==='selected') return selected.has(ev.id);
  }).slice(0,max);
  const today=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const blocks=[
    {type:'header',text:{type:'plain_text',text:'⏰ TEDx Speaker Deadlines',emoji:true}},
    {type:'context',elements:[{type:'mrkdwn',text:'\u{1F4C5} '+today+'  ·  '+evs.length+' evento'+(evs.length!==1?'s':'')}]},
    {type:'divider'}
  ];
  evs.forEach(ev=>{
    const em=ev.diff<=0?'\u{1F534}':ev.diff<=7?'\u{1F6A8}':ev.diff<=30?'\u{1F7E0}':'\u{1F7E2}';
    const dt=ev.diff<0?'vencido hace '+Math.abs(ev.diff)+'d':ev.diff===0?'¡HOY!':ev.diff+'d restantes';
    let txt=em+' *'+ev.name+'*  ·  _'+dt+'_\n*Deadline:* '+ev.dlStr;
    if (ev.city||ev.location) txt+='  ·  \u{1F4CD} '+(ev.city||ev.location);
    if (ev.theme) txt+='\n_'+ev.theme+'_';
    txt+='\n';
    const links=[];
    if (ev.form?.startsWith('http')) links.push('<'+ev.form+'|\u{1F4CB} Formulario>');
    if (ev.contact?.includes('@')) links.push('✉️ '+ev.contact.split('/')[0].trim());
    if (ev.website?.startsWith('http')) links.push('<'+ev.website+'|\u{1F310} Web>');
    if (links.length) txt+=links.join('  ·  ');
    blocks.push({type:'section',text:{type:'mrkdwn',text:txt}},{type:'divider'});
  });
  if (!evs.length) blocks.push({type:'section',text:{type:'mrkdwn',text:'_No hay eventos con esos filtros._'}});
  blocks.push({type:'context',elements:[{type:'mrkdwn',text:'\u{1F916} TEDx Deadline Tracker · Incontrera Consulting'}]});
  const btn=document.getElementById('slackBtn');
  btn.disabled=true; btn.textContent='↻ ENVIANDO…';
  try { await fetch(url,{method:'POST',body:JSON.stringify({blocks})}); } catch(e) {}
  toast('✓ '+evs.length+' eventos enviados a #tedx-application-tracking');
  const prev=document.getElementById('slackPreview');
  prev.style.display='block';
  prev.textContent='✓ Enviado: '+evs.length+' evento'+(evs.length!==1?'s':'')+' · '+new Date().toLocaleString('es-AR');
  btn.disabled=false; btn.textContent='\u{1F4E4} ENVIAR A #tedx-application-tracking';
}

function showError(msg) {
  document.getElementById('loading').style.display='none';
  const b=document.getElementById('errorBox'); b.style.display='block'; b.textContent='⚠ '+msg;
}
function hideError() { document.getElementById('errorBox').style.display='none'; }
function toast(msg) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),4000);
}
<\/script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return new Response('Not Found', { status: 404 });
  },
};
