/* ═══════════════════════════════════════════════════════════════════════════
   DFS.js  –  Depth-First Search visualiser
   Follows Skiena's algorithm:
     state[u] ∈ { "undiscovered", "discovered", "processed" }
     entry[u] / exit[u]  = discovery / finish timestamps
     Edge classification : tree | back | forward | cross
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
     DOM INJECTION
     ═══════════════════════════════════════════════════════════════════════════ */
  function injectSolvePanel() {
    const clearGroup = document.querySelector('#clear-btn').closest('.control-group');

    const panel = document.createElement('div');
    panel.className = 'control-group';
    panel.id = 'dfs-panel';
    panel.innerHTML = `
      <h3>DFS</h3>

      <div class="input-row">
        <label>Start</label>
        <select id="dfs-start"><option value="">– node –</option></select>
      </div>

      <div class="input-row">
        <label>Find</label>
        <select id="dfs-target">
          <option value="">– any (full DFS) –</option>
        </select>
      </div>

      <div class="checkbox-row" style="margin:6px 0 10px;">
        <input type="checkbox" id="dfs-stepwise" />
        <label for="dfs-stepwise">Stepwise mode</label>
      </div>

      <div class="btn-group" id="dfs-btn-group">
        <button id="dfs-solve-btn">▶ Solve</button>
        <button id="dfs-reset-btn" style="background:#64748b;">✕ Reset</button>
      </div>

      <div class="btn-group" id="dfs-step-btns" style="display:none;">
        <button id="dfs-prev-btn">◀ Prev</button>
        <button id="dfs-next-btn">▶ Next</button>
      </div>

      <div class="stats" id="dfs-status" style="margin-top:8px;min-height:36px;"></div>

      <div id="dfs-legend" style="margin-top:10px;display:none;">
        <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">Depth colours</div>
        <div id="dfs-legend-swatches" style="display:flex;flex-wrap:wrap;gap:4px;"></div>
        <div style="margin-top:8px;font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">Edge types</div>
        <div style="display:flex;flex-direction:column;gap:3px;" id="dfs-edge-legend">
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#cbd5e1;">
            <span style="width:24px;height:3px;background:#a3e635;display:inline-block;border-radius:2px;"></span> Tree edge
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#cbd5e1;">
            <span style="width:24px;height:3px;background:#f87171;display:inline-block;border-radius:2px;border-top:2px dashed #f87171;"></span> Back edge
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#cbd5e1;">
            <span style="width:24px;height:3px;background:#60a5fa;display:inline-block;border-radius:2px;"></span> Cross/Fwd edge
          </div>
        </div>
      </div>
    `;

    clearGroup.parentElement.insertBefore(panel, clearGroup);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR HELPERS  (same rainbow approach as BFS, but keyed on DFS depth)
     ═══════════════════════════════════════════════════════════════════════════ */
  function depthToHsl(depth, maxDepth) {
    const maxHue = 270;
    const hue = maxDepth <= 0 ? 0 : Math.round((depth / maxDepth) * maxHue);
    return {
      fill:   `hsl(${hue},70%,52%)`,
      stroke: `hsl(${hue},70%,35%)`,
      text:   '#ffffff',
    };
  }

  /* Edge-type colours */
  const EDGE_TYPE_COLOR = {
    tree:    '#a3e635',   /* lime green */
    back:    '#f87171',   /* red        */
    forward: '#60a5fa',   /* blue       */
    cross:   '#60a5fa',   /* blue       */
    none:    '#64748b',   /* slate      */
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     SKIENA'S DFS  (iterative to avoid call-stack limits, matches recursive logic)

     process_vertex_early(u)  → snap 'enter'
     process_edge(u,v)        → snap 'edge'
     process_vertex_late(u)   → snap 'exit'

     Edge classification (undirected graph, Skiena §5.8):
       tree : state[v] == undiscovered
       back : state[v] == discovered  (ancestor still on stack)
       (forward/cross don't arise in undirected, but we handle them gracefully)
     ═══════════════════════════════════════════════════════════════════════════ */
  function runDFS(sourceId, targetId) {
    const { getNodes, adjacencyList, nodeById } = window.PlaneGraph;
    const nodes   = getNodes();
    const adjList = adjacencyList();

    /* ── Initialise ─────────────────────────────────────────────────────────── */
    const state   = {};
    const parent  = {};
    const entry   = {};
    const exitT   = {};
    const depth   = {};   /* DFS tree depth from source */
    const edgeType = {};  /* "nodeId-nodeId" → "tree"|"back"|"forward"|"cross" */

    for (const n of nodes) {
      state[n.id]  = 'undiscovered';
      parent[n.id] = null;
      entry[n.id]  = -1;
      exitT[n.id]  = -1;
      depth[n.id]  = -1;
    }

    let   timer      = 0;
    const order      = [];
    const treeEdges  = new Set();
    let   targetFound = null;
    let   maxDepth   = 0;

    /* ── Snapshot helper ────────────────────────────────────────────────────── */
    const snap = (type, u, v, msg, extra = {}) => {
      order.push({
        type, u, v, msg,
        state:    { ...state  },
        parent:   { ...parent },
        depth:    { ...depth  },
        entry:    { ...entry  },
        exit:     { ...exitT  },
        edgeType: { ...edgeType },
        targetFound,
        ...extra,
      });
    };

    snap('init', sourceId, null,
      `Initialised. Start node: ${name(sourceId)}. All vertices undiscovered.`);

    /* ── Recursive DFS inner ─────────────────────────────────────────────────
       We simulate recursion with an explicit call stack so we can record
       process_vertex_late (finish) events correctly.
       Each stack frame: { u, neighbours, idx }
       ─────────────────────────────────────────────────────────────────────── */
    function dfsFrom(startId) {
      /* Seed */
      state[startId]  = 'discovered';
      entry[startId]  = ++timer;
      depth[startId]  = 0;

      snap('enter', startId, null,
        `process_vertex_early(${name(startId)}) — entry time ${entry[startId]}`);

      if (targetId && startId === targetId) {
        targetFound = startId;
        snap('found', startId, null, ` Target ${name(startId)} found!`);
      }

      /* Explicit stack: each frame holds the node and its neighbour iterator */
      const stack = [{ u: startId, neighbours: (adjList.get(startId) || []).slice(), idx: 0 }];

      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        const u     = frame.u;

        if (frame.idx < frame.neighbours.length) {
          const { nodeId: v } = frame.neighbours[frame.idx++];

          /* process_edge(u, v) */
          let etype;
          if (state[v] === 'undiscovered') {
            etype = 'tree';
          } else if (state[v] === 'discovered') {
            etype = 'back';
          } else {
            etype = entry[u] < entry[v] ? 'forward' : 'cross';
          }

          const ekey = `${Math.min(u,v)}-${Math.max(u,v)}`;
          /* For undirected, only record the first classification we see */
          if (!edgeType[ekey]) edgeType[ekey] = etype;

          snap('edge', u, v,
            `process_edge(${name(u)}, ${name(v)}) → ${etype} edge`);

          if (state[v] === 'undiscovered') {
            treeEdges.add(`${u}-${v}`);
            treeEdges.add(`${v}-${u}`);
            state[v]  = 'discovered';
            parent[v] = u;
            depth[v]  = depth[u] + 1;
            entry[v]  = ++timer;
            if (depth[v] > maxDepth) maxDepth = depth[v];

            snap('enter', v, u,
              `process_vertex_early(${name(v)}) — entry ${entry[v]}, depth ${depth[v]}`);

            if (targetId && v === targetId && !targetFound) {
              targetFound = v;
              snap('found', u, v, ` Target ${name(v)} found at depth ${depth[v]}!`);
            }

            /* Push new frame */
            stack.push({ u: v, neighbours: (adjList.get(v) || []).slice(), idx: 0 });
          }

        } else {
          /* All neighbours exhausted → process_vertex_late */
          state[u]  = 'processed';
          exitT[u]  = ++timer;
          stack.pop();

          snap('exit', u, null,
            `process_vertex_late(${name(u)}) — exit time ${exitT[u]}`);
        }
      }
    }

    /* Run from source */
    dfsFrom(sourceId);

    /* If no target or target not found, note it */
    if (targetId && !targetFound) {
      snap('notfound', null, null,
        `Target ${name(targetId)} not reachable from ${name(sourceId)}.`);
    } else if (!targetId) {
      const visited = Object.values(state).filter(s => s === 'processed').length;
      snap('done', null, null,
        `DFS complete. ${visited} node${visited !== 1 ? 's' : ''} visited. Max depth: ${maxDepth}.`);
    }

    return { depth, parent, order, treeEdges, edgeType, targetFound, maxDepth };
  }

  function name(id) {
    const n = window.PlaneGraph.nodeById(id);
    return n ? n.name : String(id);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DRAWING
     ═══════════════════════════════════════════════════════════════════════════ */
  function drawDFS(snap, maxDepth, treeEdges, edgeTypeMap) {
    const PG = window.PlaneGraph;
    const { redraw, drawNode, toCanvas, ctx, canvas, NODE_R } = PG;

    redraw();   /* clean slate */

    const c     = ctx();
    const nodes = PG.getNodes();
    const edges = PG.getEdges();

    /* ── Draw all edges with classification colour ──────────────────────────── */
    c.save();
    for (const e of edges) {
      const ekey  = `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
      const etype = snap.edgeType[ekey] || 'none';
      const nA    = PG.nodeById(e.from);
      const nB    = PG.nodeById(e.to);
      if (!nA || !nB) continue;

      const cA = toCanvas(nA.x, nA.y);
      const cB = toCanvas(nB.x, nB.y);

      /* Tree edges: thick solid, colour from child's depth */
      if (etype === 'tree') {
        const childId  = snap.parent[e.to] === e.from ? e.to : e.from;
        const childDep = snap.depth[childId];
        const col      = childDep >= 0
          ? depthToHsl(childDep, maxDepth).fill
          : EDGE_TYPE_COLOR.tree;

        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = col;
        c.lineWidth   = 4;
        c.stroke();

      } else if (etype === 'back') {
        /* Back edge: dashed red */
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = EDGE_TYPE_COLOR.back;
        c.lineWidth   = 2;
        c.setLineDash([5, 4]);
        c.stroke();
        c.setLineDash([]);

      } else if (etype === 'forward' || etype === 'cross') {
        c.beginPath();
        c.moveTo(cA.x, cA.y);
        c.lineTo(cB.x, cB.y);
        c.strokeStyle = EDGE_TYPE_COLOR.cross;
        c.lineWidth   = 2;
        c.stroke();
      }
      /* 'none' edges are already drawn by redraw() in default slate colour */
    }

    /* ── Active edge being examined ─────────────────────────────────────────── */
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

    /* ── Draw nodes ─────────────────────────────────────────────────────────── */
    for (const n of nodes) {
      const pos = toCanvas(n.x, n.y);
      const dep = snap.depth[n.id];
      const st  = snap.state[n.id] || 'undiscovered';

      let fill, stroke, text;
      if (dep >= 0) {
        const col = depthToHsl(dep, maxDepth);
        fill   = col.fill;
        stroke = col.stroke;
        text   = col.text;
      } else {
        fill   = '#334155';
        stroke = '#1e293b';
        text   = '#94a3b8';
      }

      drawNode(pos.x, pos.y, n.name, fill, stroke, text);

      /* Amber ring = on stack (discovered, not yet processed) */
      if (st === 'discovered' && n.id !== snap.u) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 4, 0, Math.PI * 2);
        c.strokeStyle = '#fbbf24';
        c.lineWidth   = 2.5;
        c.stroke();
      }

      /* Orange pulse ring = currently active node */
      if (n.id === snap.u) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 5, 0, Math.PI * 2);
        c.strokeStyle = '#f97316';
        c.lineWidth   = 3;
        c.stroke();
      }

      /* Green dashed ring = target just found */
      if (snap.type === 'found' && n.id === snap.v) {
        c.beginPath();
        c.arc(pos.x, pos.y, NODE_R + 7, 0, Math.PI * 2);
        c.strokeStyle = '#22c55e';
        c.lineWidth   = 3;
        c.setLineDash([4, 3]);
        c.stroke();
        c.setLineDash([]);
      }

      /* Entry/exit timestamp badge (shown once node has been entered) */
      if (snap.entry[n.id] > 0) {
        const exitVal = snap.exit[n.id] > 0 ? snap.exit[n.id] : '…';
        const badge   = `${snap.entry[n.id]}/${exitVal}`;
        c.font         = `bold 8px 'Segoe UI', sans-serif`;
        c.fillStyle    = '#f1f5f9';
        c.textAlign    = 'center';
        c.textBaseline = 'middle';
        c.fillText(badge, pos.x, pos.y + NODE_R + 10);
      }
    }
  }

  /* ── Legend ──────────────────────────────────────────────────────────────── */
  function buildLegend(maxDepth) {
    const swatches = document.getElementById('dfs-legend-swatches');
    const legend   = document.getElementById('dfs-legend');
    if (!swatches || !legend) return;
    swatches.innerHTML = '';
    for (let d = 0; d <= maxDepth; d++) {
      const col = depthToHsl(d, maxDepth);
      const div = document.createElement('div');
      div.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#cbd5e1;`;
      div.innerHTML = `
        <span style="width:12px;height:12px;border-radius:50%;background:${col.fill};display:inline-block;flex-shrink:0;"></span>
        D${d}
      `;
      swatches.appendChild(div);
    }
    legend.style.display = 'block';
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DROPDOWN SYNC
     ═══════════════════════════════════════════════════════════════════════════ */
  function syncDropdowns() {
    const nodes     = window.PlaneGraph.getNodes();
    const startSel  = document.getElementById('dfs-start');
    const targetSel = document.getElementById('dfs-target');
    if (!startSel || !targetSel) return;

    const prevStart  = startSel.value;
    const prevTarget = targetSel.value;

    startSel.innerHTML  = '<option value="">– node –</option>';
    targetSel.innerHTML = '<option value="">– any (full DFS) –</option>';

    for (const n of nodes) {
      const o1 = document.createElement('option');
      o1.value = n.id; o1.textContent = n.name;
      startSel.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = n.id; o2.textContent = n.name;
      targetSel.appendChild(o2);
    }

    if (prevStart)  startSel.value  = prevStart;
    if (prevTarget) targetSel.value = prevTarget;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════════════════════ */
  let dfsResult  = null;
  let stepIdx    = 0;
  let inStepMode = false;

  function setStatus(html) {
    const el = document.getElementById('dfs-status');
    if (el) el.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SOLVE
     ═══════════════════════════════════════════════════════════════════════════ */
  function solve() {
    const sourceId = parseInt(document.getElementById('dfs-start').value, 10);
    if (!sourceId) { setStatus('<span style="color:#f87171">Select a start node.</span>'); return; }

    const targetRaw = document.getElementById('dfs-target').value;
    const targetId  = targetRaw ? parseInt(targetRaw, 10) : null;

    if (targetId && targetId === sourceId) {
      setStatus('<span style="color:#f87171">Start and target cannot be the same node.</span>');
      return;
    }

    dfsResult = runDFS(sourceId, targetId);
    buildLegend(dfsResult.maxDepth);

    inStepMode = document.getElementById('dfs-stepwise').checked;

    if (inStepMode) {
      stepIdx = 0;
      showStep(0);
      document.getElementById('dfs-step-btns').style.display = 'flex';
      document.getElementById('dfs-btn-group').style.display = 'none';
    } else {
      const last = dfsResult.order[dfsResult.order.length - 1];
      drawDFS(last, dfsResult.maxDepth, dfsResult.treeEdges, dfsResult.edgeType);
      setStatus(last.msg || 'DFS complete.');
      document.getElementById('dfs-step-btns').style.display = 'none';
      document.getElementById('dfs-btn-group').style.display = 'flex';
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STEP NAVIGATION
     ═══════════════════════════════════════════════════════════════════════════ */
  function showStep(idx) {
    if (!dfsResult) return;
    const steps = dfsResult.order;
    idx = Math.max(0, Math.min(steps.length - 1, idx));
    stepIdx = idx;

    const snap = steps[idx];
    drawDFS(snap, dfsResult.maxDepth, dfsResult.treeEdges, dfsResult.edgeType);

    setStatus(`
      <span style="color:#94a3b8;font-size:10px;">Step ${idx + 1} / ${steps.length}</span><br/>
      ${snap.msg || ''}
    `);

    const prevBtn = document.getElementById('dfs-prev-btn');
    const nextBtn = document.getElementById('dfs-next-btn');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === steps.length - 1;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RESET
     ═══════════════════════════════════════════════════════════════════════════ */
  function resetDFS() {
    dfsResult  = null;
    stepIdx    = 0;
    inStepMode = false;
    document.getElementById('dfs-step-btns').style.display = 'none';
    document.getElementById('dfs-btn-group').style.display = 'flex';
    document.getElementById('dfs-legend').style.display    = 'none';
    setStatus('');
    window.PlaneGraph.redraw();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════════════════════ */
  function init() {
    injectSolvePanel();
    syncDropdowns();

    const origRefreshAll = window.Plane.ui.refreshAll.bind(window.Plane.ui);
    window.Plane.ui.refreshAll = function () {
      origRefreshAll();
      syncDropdowns();
      if (dfsResult) resetDFS();
    };

    document.getElementById('dfs-solve-btn').addEventListener('click', solve);
    document.getElementById('dfs-reset-btn').addEventListener('click', resetDFS);

    document.getElementById('dfs-prev-btn').addEventListener('click', () => showStep(stepIdx - 1));
    document.getElementById('dfs-next-btn').addEventListener('click', () => showStep(stepIdx + 1));

    /* Unticking stepwise exits step mode gracefully */
    document.getElementById('dfs-stepwise').addEventListener('change', e => {
      if (!e.target.checked && dfsResult && inStepMode) {
        inStepMode = false;
        const last = dfsResult.order[dfsResult.order.length - 1];
        drawDFS(last, dfsResult.maxDepth, dfsResult.treeEdges, dfsResult.edgeType);
        setStatus(last.msg || 'DFS complete.');
        document.getElementById('dfs-step-btns').style.display = 'none';
        document.getElementById('dfs-btn-group').style.display = 'flex';
      }
    });

    /* Arrow key navigation */
    document.addEventListener('keydown', e => {
      if (!dfsResult || !inStepMode) return;
      if (e.key === 'ArrowLeft')  showStep(stepIdx - 1);
      if (e.key === 'ArrowRight') showStep(stepIdx + 1);
    });
  }

})();