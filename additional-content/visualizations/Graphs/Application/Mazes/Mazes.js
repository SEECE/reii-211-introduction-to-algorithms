/**
 * Mazes.js  –  main entry point
 *
 * Planned imports (not wired yet):
 *   CreateMaze.js  –  maze generation
 *   DFS.js         –  depth-first search solver
 *   BFS.js         –  breadth-first search solver
 */

// ─────────────────────────────────────────────
//  Canvas & state
// ─────────────────────────────────────────────
const canvas = document.getElementById("mazeCanvas");
const ctx    = canvas.getContext("2d");

// Cell types
const CELL = {
    WALL:    0,
    PATH:    1,
    START:   2,
    END:     3,
    VISITED: 4,
    SOLUTION:5,
};

// Colours for each cell type
const COLOUR = {
    [CELL.WALL]:    "#1f2937",
    [CELL.PATH]:    "#ffffff",
    [CELL.START]:   "#22c55e",
    [CELL.END]:     "#ef4444",
    [CELL.VISITED]: "#93c5fd",
    [CELL.SOLUTION]:"#f59e0b",
};

let gridSize  = 21;       // always odd so walls align nicely
let grid      = [];       // 2-D array [row][col] of CELL.*
let allSteps  = [];       // snapshot array for step-by-step mode
let currentStep = 0;

// ─────────────────────────────────────────────
//  Grid helpers
// ─────────────────────────────────────────────
function cellSize() {
    return canvas.width / gridSize;
}

/** Initialise an empty (all-wall) grid */
function initGrid(size) {
    gridSize = size;
    grid = [];
    for (let r = 0; r < size; r++) {
        grid.push(new Array(size).fill(CELL.WALL));
    }
}

/** Fill with open paths — placeholder until CreateMaze.js is wired */
function buildPlaceholderGrid() {
    initGrid(gridSize);

    // Checkerboard of open cells so something is visible
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (r % 2 === 1 && c % 2 === 1) grid[r][c] = CELL.PATH;
            if (r % 2 === 1 && c % 2 === 0) grid[r][c] = CELL.WALL;
            if (r % 2 === 0 && c % 2 === 1) grid[r][c] = CELL.WALL;
        }
    }

    // Mark start / end
    grid[1][1]                          = CELL.START;
    grid[gridSize - 2][gridSize - 2]    = CELL.END;
}

// ─────────────────────────────────────────────
//  Rendering
// ─────────────────────────────────────────────
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cs = cellSize();

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            ctx.fillStyle = COLOUR[grid[r][c]] ?? "#ffffff";
            ctx.fillRect(c * cs, r * cs, cs, cs);
        }
    }

    // Subtle grid lines only when cells are large enough to see them
    if (cs >= 10) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth   = 0.5;
        for (let r = 0; r <= gridSize; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cs);
            ctx.lineTo(canvas.width, r * cs);
            ctx.stroke();
        }
        for (let c = 0; c <= gridSize; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cs, 0);
            ctx.lineTo(c * cs, canvas.height);
            ctx.stroke();
        }
    }
}

function redraw() {
    drawGrid();
    updateStepUI();
    updateStats();
}

// ─────────────────────────────────────────────
//  Stats & status helpers
// ─────────────────────────────────────────────
function setStatus(msg) {
    document.getElementById("statusBox").textContent = msg;
}

function updateStats() {
    const size = gridSize;
    document.getElementById("stat-size").textContent = `${size} × ${size}`;

    let visited = 0, path = 0;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === CELL.VISITED)  visited++;
            if (grid[r][c] === CELL.SOLUTION) path++;
        }
    }

    document.getElementById("stat-visited").textContent = visited || "—";
    document.getElementById("stat-path").textContent    = path    || "—";

    const algo = document.querySelector("input[name='algorithm']:checked")?.value?.toUpperCase() ?? "—";
    document.getElementById("stat-algo").textContent = algo;
}

// ─────────────────────────────────────────────
//  Step-by-step helpers
// ─────────────────────────────────────────────
function updateStepUI() {
    const isStepMode = document.getElementById("visualiseCheck").checked;
    const pill       = document.getElementById("stepPill");
    const backBtn    = document.getElementById("stepBackBtn");
    const fwdBtn     = document.getElementById("stepForwardBtn");

    if (!isStepMode || allSteps.length === 0) {
        pill.style.display = "none";
        backBtn.disabled   = true;
        fwdBtn.disabled    = true;
        return;
    }

    pill.style.display  = "block";
    pill.textContent    = `Step ${currentStep} / ${allSteps.length}`;
    backBtn.disabled    = currentStep <= 0;
    fwdBtn.disabled     = currentStep >= allSteps.length;
}

/** Apply a step snapshot to the grid */
function applyStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= allSteps.length) return;
    grid = allSteps[stepIndex].map(row => [...row]);  // deep-copy the snapshot
    redraw();
}

// ─────────────────────────────────────────────
//  Button wiring
// ─────────────────────────────────────────────

// Generate maze
document.getElementById("generateBtn").addEventListener("click", () => {
    const rawSize = parseInt(document.getElementById("gridSize").value, 10);
    // Force odd number so the grid structure works correctly
    gridSize = rawSize % 2 === 0 ? rawSize + 1 : rawSize;
    document.getElementById("gridSize").value = gridSize;

    allSteps    = [];
    currentStep = 0;

    // TODO: replace with CreateMaze.generate(gridSize) once CreateMaze.js is ready
    buildPlaceholderGrid();
    setStatus("Maze generated");
    redraw();
});

// Clear grid
document.getElementById("clearBtn").addEventListener("click", () => {
    allSteps    = [];
    currentStep = 0;
    initGrid(gridSize);
    setStatus("Ready");
    redraw();
});

// Solve (placeholder — algorithms not implemented yet)
document.getElementById("solveBtn").addEventListener("click", () => {
    const algo = document.querySelector("input[name='algorithm']:checked")?.value;
    setStatus(`${algo?.toUpperCase()} — coming soon`);

    // TODO:
    // const steps = algo === 'dfs'
    //     ? DFS.solve(grid, startCell, endCell)
    //     : BFS.solve(grid, startCell, endCell);
    //
    // if (visualiseCheck.checked) { allSteps = steps; currentStep = 0; }
    // else { /* apply full result */ }

    redraw();
});

// Step back
document.getElementById("stepBackBtn").addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        applyStep(currentStep);
    }
});

// Step forward
document.getElementById("stepForwardBtn").addEventListener("click", () => {
    if (currentStep < allSteps.length) {
        currentStep++;
        applyStep(currentStep - 1);
    }
});

// Show/hide step controls
document.getElementById("visualiseCheck").addEventListener("change", (e) => {
    const stepControls = document.getElementById("stepControls");
    stepControls.style.display = e.target.checked ? "flex" : "none";

    if (!e.target.checked) {
        allSteps    = [];
        currentStep = 0;
    }
    updateStepUI();
});

// Radio highlight sync
document.querySelectorAll("input[name='algorithm']").forEach(radio => {
    radio.addEventListener("change", () => {
        document.querySelectorAll(".radio-option").forEach(el => el.classList.remove("selected"));
        radio.closest(".radio-option").classList.add("selected");
        updateStats();
    });
});

// ─────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────
(function init() {
    buildPlaceholderGrid();
    setStatus("Ready");

    // Step controls start hidden
    document.getElementById("stepControls").style.display = "none";
    document.getElementById("stepBackBtn").disabled       = true;
    document.getElementById("stepForwardBtn").disabled    = true;

    redraw();
})();