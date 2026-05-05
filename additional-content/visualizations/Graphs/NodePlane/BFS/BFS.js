/* ═══════════════════════════════════════════════════════════════════════════
   BFS.js  –  Breadth-First Search visualiser
   Follows Skiena's algorithm exactly:
     state[u] ∈ { "undiscovered", "discovered", "processed" }
     p[u]     = parent in BFS tree (nil initially)
   Depends on: window.PlaneGraph  (set up by PlaneScript.js)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Wait for PlaneGraph to be ready ─────────────────────────────────────── */
  function waitForPlane(cb) {
    if (window.PlaneGraph && window.PlaneGraph.getNodes) { cb(); return; }
    setTimeout(() => waitForPlane(cb), 50);
  }

  waitForPlane(init);

  /* ═══════════════════════════════════════════════════════════════════════════
     DOM INJECTION  –  Solve panel inserted above the Clear All group
     ═══════════════════════════════════════════════════════════════════════════ */
  function injectSolvePanel() {
    const clearGroup = document.querySelector('#clear-btn').closest('.control-group');

    const panel = document.createElement('div');
    panel.className = 'control-group';
    panel.id = 'bfs-panel';
    panel.innerHTML = `
      <h3>BFS</h3>

      <div class="input-row">
        <label>Start</label>
        <select id="bfs-start"><option value="">– node –</option></select>
      </div>

      <div class="input-row">
        <label>Find</label>
        <select id="bfs-target">
          <option value="">– any –</option>
        </select>
      </div>

      <div class="checkbox-row" style="margin:6px 0 10px;">
        <input type="checkbox" id="bfs-stepwise" />
        <label for="bfs-stepwise">Stepwise mode</label>
      </div>

      <div class="btn-group" id="bfs-btn-group">
        <button id="bfs-solve-btn">▶ Solve</button>
        <button id="bfs-reset-btn" style="background:#64748b;">✕ Reset</button>
      </div>

      <div class="btn-group" id="bfs-step-btns" style="display:none;">
        <button id="bfs-prev-btn">◀ Prev</button>
        <button id="bfs-next-btn">▶ Next</button>
      </div>

      <div class="stats" id="bfs-status" style="margin-top:8px;min-height:36px;"></div>

      <div id="bfs-legend" style="margin-top:10px;display:none;">
        <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">Level colours</div>
        <div id="bfs-legend-swatches" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
    `;

    clearGroup.parentElement.insertBefore(panel, clearGroup);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS
     ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Map a BFS level (0-based) to an HSL colour spanning red→violet.
   * With only 1 level the single colour is red (hue 0).
   * With N levels we fan from hue 0° (red) to 270° (violet).
   */
  function levelToHsl(level, totalLevels) {
    const maxHue = 270;
    const hue = totalLevels <= 1 ? 0 : Math.round((level / (totalLevels - 1)) * maxHue);
    return {
      fill:   `hsl(${hue},70%,52%)`,
      stroke: `hsl(${hue},70%,35%)`,
      text:   '#ffffff',
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SKIENA'S BFS  (pure computation, no drawing)
     Returns: { level, parent, order, treeEdges, targetFound }
       level[nodeId]      : BFS distance from source (-1 = unreachable)
       parent[nodeId]     : parent id in BFS tree (null = root / unreachable)
       order              : Array of { u, v, edgeType } events (for stepping)
       treeEdges          : Set of "fromId-toId" strings
       targetFound        : node id that matched the target (null if not found)
     ═══════════════════════════════════════════════════════════════════════════ */
  function runBFS(sourceId, targetId) {
    const { getNodes, adjacencyList } = window.PlaneGraph;
    const nodes   = getNodes();
    const adjList = adjacencyList();

    /* Initialise all vertices */
    const state  = {};   // "undiscovered" | "discovered" | "processed"
    const parent = {};
    const level  = {};

    for (const n of nodes) {
      state[n.id]  = 'undiscovered';
      parent[n.id] = null;
      level[n.id]  = -1;
    }

    /* Seed source */
    state[sourceId]  = 'discovered';
    level[sourceId]  = 0;

    const queue      = [sourceId];
    const order      = [];   // step events
    const treeEdges  = new Set();
    let   targetFound = null;

    /* Snapshot helper */
    const snap = (type, u, v, extraState) => {
      /* Deep-copy state/level/parent for the stepwise renderer */
      order.push({
        type,
        u, v,
        state:  { ...state  },
        parent: { ...parent },
        level:  { ...level  },
        targetFound,
        ...extraState,
      });
    };

    snap('init', sourceId, null, { msg: `Initialised. Start node: ${nodeName(sourceId)}. Queue: [${nodeName(sourceId)}]` });

    /* Main loop */
    while (queue.length > 0) {
      const u = queue.shift();  /* dequeue */

      snap('dequeue', u, null, { msg: `Dequeued ${nodeName(u)} — processing its neighbours.` });

      /* Process vertex u */
      const neighbours = adjList.get(u) || [];

      for (const { nodeId: v } of neighbours) {
        /* Process edge (u, v) */
        snap('edge', u, v, { msg: `Edge (${nodeName(u)}, ${nodeName(v)}) — state[${nodeName(v)}] = ${state[v]}` });

        if (state[v] === 'undiscovered') {
          state[v]  = 'discovered';
          parent[v] = u;
          level[v]  = level[u] + 1;
          treeEdges.add(`${u}-${v}`);
          treeEdges.add(`${v}-${u}`);
          queue.push(v);

          snap('discover', u, v, {
            msg: `Discovered ${nodeName(v)} (level ${level[v]}) via ${nodeName(u)}. Queue: [${queue.map(id => nodeName(id)).join(', ')}]`
          });

          /* Check target */
          if (targetId && v === targetId) {
            targetFound = v;
            snap('found', u, v, { msg: `Target ${nodeName(v)} found at level ${level[v]}!` });
          }
        }
      }

      state[u] = 'processed';
      snap('process', u, null, { msg: `${nodeName(u)} fully processed.` });
    }

    if (targetId && !targetFound) {
      snap('notfound', null, null, { msg: `Target ${nodeName(targetId)} not reachable from ${nodeName(sourceId)}.` });
    } else if (!targetId) {
      snap('done', null, null, { msg: `BFS complete. ${nodes.filter(n => level[n.id] >= 0).length} nodes visited.` });
    }

    /* Count total BFS levels reached */
    const maxLevel = Math.max(...Object.values(level).filter(l => l >= 0));

    return { level, parent, order, treeEdges, targetFound, maxLevel };
  }

  function nodeName(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
     ═══════════════════════════════════════════════════════════════════════════ */

  /* STATE_COLORS for the undiscovered/discovered/processed badges on nodes */
  const STATE_RING = {
    undiscovered: null,           /* no extra ring – uses level colour or default */
    discovered:   '#fbbf24',      /* amber ring = in queue */
    processed:    null,           /* fully handled – just use level colour */
  };

  /**
   * Redraw the graph with BFS colouring.
   * @param {object} snap  - step snapshot (has .state, .level, .parent, .u, .v)
   * @param {number} maxLevel
   * @param {Set}    treeEdges
   */
  function drawBFS(snap, maxLevel, treeEdges) {
    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, canvas, NODE_R } = PG;

    /* Start from a clean slate (grid + plain edges) */
    redraw();

    const c = ctx();
    const nodes = PG.getNodes();
    const edges = PG.getEdges();

    const totalLevels = maxLevel + 1;  /* levels are 0-based */

    /* ── Highlight tree edges ──────────────────────────────────────────────── */
    c.save();
    for (const e of edges) {
      const key1 = `${e.from}-${e.to}`;
      const key2 = `${e.to}-${e.from}`;
      if (treeEdges.has(key1) || treeEdges.has(key2)) {
        const nA = PG.nodeById(e.from);
        const nB = PG.nodeById(e.to);
        if (!nA || !nB) continue;
        const cA = toCanvas(nA.x, nA.y);
        const cB = toCanvas(nB.x, nB.y);

        /* Determine hue from parent → child direction */
        const childId   = snap.parent[e.to] === e.from ? e.to : e.from;
        const childLvl  = snap.level[childId];
        const col       = childLvl >= 0 ? levelToHsl(childLvl, totalLevels) : null;

        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = col ? col.fill : '#6366f1';
        c.lineWidth   = 4;
        c.stroke();
      }
    }

    /* ── Active edge highlight (the edge currently being examined) ─────────── */
    if (snap.type === 'edge' && snap.u !== null && snap.v !== null) {
      const nA = PG.nodeById(snap.u);
      const nB = PG.nodeById(snap.v);
      if (nA && nB) {
        const cA = toCanvas(nA.x, nA.y);
        const cB = toCanvas(nB.x, nB.y);
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = '#f59e0b';
        c.lineWidth   = 3;
        c.setLineDash([6, 4]);
        c.stroke();
        c.setLineDash([]);
      }
    }
    c.restore();

    /* ── Draw nodes with level colours ────────────────────────────────────── */
    for (const n of nodes) {
      const pos = toCanvas(n.x, n.y);
      const lvl = snap.level[n.id];
      const st  = snap.state[n.id] || 'undiscovered';

      let fill, stroke, text;

      if (lvl >= 0) {
        const col = levelToHsl(lvl, totalLevels);
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';   /* dark slate = undiscovered */
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      /* Active node being dequeued / processed gets a bright ring */
      const isActive = (n.id === snap.u);
      const isTarget = (n.id === snap.v && snap.type === 'discover');

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Extra ring for "discovered but not yet processed" (in queue) */
      if (st === 'discovered' && !isActive) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 4, 0, Math.PI * 2);
        c.strokeStyle = '#fbbf24';
        c.lineWidth   = 2.5;
        c.stroke();
      }

      /* Pulse ring for the node being actively dequeued */
      if (isActive) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f97316';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Star burst for newly discovered target */
      if (isTarget && snap.targetFound) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 7, 0, Math.PI * 2);
        c.strokeStyle = '#22c55e';
        c.lineWidth   = 3;
        c.setLineDash([4, 3]);
        c.stroke();
        c.setLineDash([]);
      }
    }
  }

  /* ── Level-colour legend ─────────────────────────────────────────────────── */
  function buildLegend(maxLevel) {
    const swatches = document.getElementById('bfs-legend-swatches');
    const legend   = document.getElementById('bfs-legend');
    if (!swatches || !legend) return;
    swatches.innerHTML = '';
    const total = maxLevel + 1;
    for (let l = 0; l <= maxLevel; l++) {
      const col = levelToHsl(l, total);
      const div = document.createElement('div');
      div.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;
        font-size:11px;color:#cbd5e1;
      `;
      div.innerHTML = `
        <span style="width:12px;height:12px;border-radius:50%;background:${col.fill};display:inline-block;flex-shrink:0;"></span>
        L${l}
      `;
      swatches.appendChild(div);
    }
    legend.style.display = 'block';
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DROPDOWN SYNC  –  keep start/target in step with graph changes
     ═══════════════════════════════════════════════════════════════════════════ */
  function syncDropdowns() {
    const nodes     = window.PlaneGraph.getNodes();
    const startSel  = document.getElementById('bfs-start');
    const targetSel = document.getElementById('bfs-target');
    if (!startSel || !targetSel) return;

    const prevStart  = startSel.value;
    const prevTarget = targetSel.value;

    startSel.innerHTML  = '<option value="">– node –</option>';
    targetSel.innerHTML = '<option value="">– any (full BFS) –</option>';

    for (const n of nodes) {
      const opt1 = document.createElement('option');
      opt1.value = n.id; opt1.textContent = n.name;
      startSel.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = n.id; opt2.textContent = n.name;
      targetSel.appendChild(opt2);
    }

    if (prevStart)  startSel.value  = prevStart;
    if (prevTarget) targetSel.value = prevTarget;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════════════════════ */
  let bfsResult   = null;   /* last full BFS run */
  let stepIdx     = 0;
  let inStepMode  = false;

  /* ═══════════════════════════════════════════════════════════════════════════
     STATUS BAR
     ═══════════════════════════════════════════════════════════════════════════ */
  function setStatus(html) {
    const el = document.getElementById('bfs-status');
    if (el) el.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SOLVE
     ═══════════════════════════════════════════════════════════════════════════ */
  function solve() {
    const sourceId = parseInt(document.getElementById('bfs-start').value, 10);
    if (!sourceId) { setStatus('<span style="color:#f87171">Select a start node.</span>'); return; }

    const targetRaw = document.getElementById('bfs-target').value;
    const targetId  = targetRaw ? parseInt(targetRaw, 10) : null;

    /* If target === source, warn */
    if (targetId && targetId === sourceId) {
      setStatus('<span style="color:#f87171">Start and target cannot be the same node.</span>');
      return;
    }

    bfsResult = runBFS(sourceId, targetId);

    buildLegend(bfsResult.maxLevel);

    inStepMode = document.getElementById('bfs-stepwise').checked;

    if (inStepMode) {
      stepIdx = 0;
      showStep(0);
      document.getElementById('bfs-step-btns').style.display = 'flex';
      document.getElementById('bfs-btn-group').style.display = 'none';
    } else {
      /* Instant mode – jump to the last step */
      const last = bfsResult.order[bfsResult.order.length - 1];
      drawBFS(last, bfsResult.maxLevel, bfsResult.treeEdges);
      setStatus(last.msg || 'BFS complete.');
      document.getElementById('bfs-step-btns').style.display = 'none';
      document.getElementById('bfs-btn-group').style.display = 'flex';
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STEP NAVIGATION
     ═══════════════════════════════════════════════════════════════════════════ */
  function showStep(idx) {
    if (!bfsResult) return;
    const steps = bfsResult.order;
    idx = Math.max(0, Math.min(steps.length - 1, idx));
    stepIdx = idx;

    const snap = steps[idx];
    drawBFS(snap, bfsResult.maxLevel, bfsResult.treeEdges);

    /* Step counter + message */
    setStatus(`
      <span style="color:#94a3b8;font-size:10px;">Step ${idx + 1} / ${steps.length}</span><br/>
      ${snap.msg || ''}
    `);

    /* Update button states */
    const prevBtn = document.getElementById('bfs-prev-btn');
    const nextBtn = document.getElementById('bfs-next-btn');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === steps.length - 1;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RESET
     ═══════════════════════════════════════════════════════════════════════════ */
  function resetBFS() {
    bfsResult  = null;
    stepIdx    = 0;
    inStepMode = false;
    document.getElementById('bfs-step-btns').style.display = 'none';
    document.getElementById('bfs-btn-group').style.display = 'flex';
    document.getElementById('bfs-legend').style.display    = 'none';
    setStatus('');
    window.PlaneGraph.redraw();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════════════════════ */
  function init() {
    injectSolvePanel();
    syncDropdowns();

    /* Keep dropdowns in sync when graph changes.
       We monkey-patch refreshAll so any graph mutation also refreshes BFS selects. */
    const origRefreshAll = window.Plane.ui.refreshAll.bind(window.Plane.ui);
    window.Plane.ui.refreshAll = function () {
      origRefreshAll();
      syncDropdowns();
      /* If BFS was showing, reset to avoid stale state */
      if (bfsResult) resetBFS();
    };

    /* Button wiring */
    document.getElementById('bfs-solve-btn').addEventListener('click', solve);
    document.getElementById('bfs-reset-btn').addEventListener('click', resetBFS);

    document.getElementById('bfs-prev-btn').addEventListener('click', () => {
      showStep(stepIdx - 1);
    });
    document.getElementById('bfs-next-btn').addEventListener('click', () => {
      showStep(stepIdx + 1);
    });

    /* Unticking stepwise mid-session exits step mode gracefully */
    document.getElementById('bfs-stepwise').addEventListener('change', e => {
      if (!e.target.checked && bfsResult && inStepMode) {
        inStepMode = false;
        /* Jump to final state */
        const last = bfsResult.order[bfsResult.order.length - 1];
        drawBFS(last, bfsResult.maxLevel, bfsResult.treeEdges);
        setStatus(last.msg || 'BFS complete.');
        document.getElementById('bfs-step-btns').style.display = 'none';
        document.getElementById('bfs-btn-group').style.display = 'flex';
      }
    });

    /* Keyboard: left/right arrows navigate steps */
    document.addEventListener('keydown', e => {
      if (!bfsResult || !inStepMode) return;
      if (e.key === 'ArrowLeft')  showStep(stepIdx - 1);
      if (e.key === 'ArrowRight') showStep(stepIdx + 1);
    });
  }

})();