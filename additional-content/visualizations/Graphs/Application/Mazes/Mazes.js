/**
 * Mazes.js  –  main entry point
 *
 * Maze generation: Randomised Prim's Algorithm
 *   – Creates a perfect maze with dense branching and many dead-ends.
 *   – Grows outward from a seed, randomly picking frontier walls to knock down.
 *   – Produces a visually rich maze with many short dead-end corridors and
 *     frequent junctions — very different from the single-winding-path that
 *     Recursive Backtracker tends to produce.
 *
 * Solvers (loaded from separate scripts):
 *   BFS.js   –  breadth-first search  (window.solveBFS)
 *   DFS.js   –  depth-first search    (window.solveDFS)
 */

// ─────────────────────────────────────────────
//  Canvas setup
// ─────────────────────────────────────────────
const canvas = document.getElementById("mazeCanvas");
const ctx    = canvas.getContext("2d");

const MAX_CANVAS_W = Math.max(400, window.innerWidth - 340);
const MAX_CANVAS_H = Math.min(window.innerHeight - 180, 700);

// ─────────────────────────────────────────────
//  Cell constants
// ─────────────────────────────────────────────
const CELL = {
    WALL:     0,
    PATH:     1,
    START:    2,
    END:      3,
    VISITED:  4,
    SOLUTION: 5,
};

const COLOUR = {
    [CELL.WALL]:     "#1f2937",
    [CELL.PATH]:     "#ffffff",
    [CELL.START]:    "#22c55e",
    [CELL.END]:      "#ef4444",
    [CELL.VISITED]:  "#93c5fd",
    [CELL.SOLUTION]: "#f59e0b",
};

// ─────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────
let numRows     = 51;
let numCols     = 151;
let grid        = [];
let allSteps    = [];
let currentStep = 0;

// ─────────────────────────────────────────────
//  Canvas sizing
// ─────────────────────────────────────────────
function resizeCanvas() {
    const cellW = Math.floor(MAX_CANVAS_W / numCols);
    const cellH = Math.floor(MAX_CANVAS_H / numRows);
    const cs    = Math.max(1, Math.min(cellW, cellH));
    canvas.width  = cs * numCols;
    canvas.height = cs * numRows;
}

function cellSize() {
    return canvas.width / numCols;
}

// ─────────────────────────────────────────────
//  Grid init
// ─────────────────────────────────────────────
function initGrid(rows, cols) {
    numRows = rows;
    numCols = cols;
    grid = [];
    for (let r = 0; r < rows; r++) {
        grid.push(new Array(cols).fill(CELL.WALL));
    }
}

// ─────────────────────────────────────────────
//  Maze generation – Randomised Prim's
//
//  The maze is built on a "passage grid" where odd row/col positions
//  are passage cells and even positions are walls.
//
//  Algorithm:
//    1. Start with all walls.
//    2. Pick a seed passage cell, add it to the "in" set.
//    3. Add all passage-cell neighbours of the seed to the "frontier" list.
//    4. While frontier is non-empty:
//       a. Pick a random frontier cell F.
//       b. Find all "in" neighbours of F (passage cells 2 steps away already in maze).
//       c. Pick one randomly, knock down the wall between F and that neighbour.
//       d. Add F to "in" set. Add F's un-visited passage neighbours to frontier.
//
//  Result: dense, organic maze with lots of branching and short dead-ends.
// ─────────────────────────────────────────────
function generateMaze(rows, cols) {
    initGrid(rows, cols);

    const DIRS = [[-2,0],[2,0],[0,-2],[0,2]];

    function inBounds(r, c) {
        return r > 0 && r < rows - 1 && c > 0 && c < cols - 1;
    }

    // Mark a passage cell and add its unvisited neighbours to frontier
    const inMaze   = new Set();
    const frontier = [];  // Array of [r, c]
    const inFrontier = new Set();

    function addToFrontier(r, c) {
        for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc) && !inMaze.has(`${nr},${nc}`) && !inFrontier.has(`${nr},${nc}`)) {
                frontier.push([nr, nc]);
                inFrontier.add(`${nr},${nc}`);
            }
        }
    }

    // Seed — top-left passage cell
    const seedR = 1, seedC = 1;
    grid[seedR][seedC] = CELL.PATH;
    inMaze.add(`${seedR},${seedC}`);
    addToFrontier(seedR, seedC);

    while (frontier.length > 0) {
        // Pick a random frontier cell
        const idx = Math.floor(Math.random() * frontier.length);
        const [fr, fc] = frontier[idx];
        // Remove from frontier (swap with last for O(1) removal)
        frontier[idx] = frontier[frontier.length - 1];
        frontier.pop();

        // Find all "in-maze" passage-cell neighbours
        const inNeighbours = [];
        for (const [dr, dc] of DIRS) {
            const nr = fr + dr, nc = fc + dc;
            if (inBounds(nr, nc) && inMaze.has(`${nr},${nc}`)) {
                inNeighbours.push([nr, nc]);
            }
        }

        if (inNeighbours.length === 0) continue; // Shouldn't happen, but guard anyway

        // Pick a random in-maze neighbour and carve the wall between them
        const [nr, nc] = inNeighbours[Math.floor(Math.random() * inNeighbours.length)];
        const wr = (fr + nr) / 2, wc = (fc + nc) / 2; // wall cell between fr,fc and nr,nc
        grid[wr][wc] = CELL.PATH;
        grid[fr][fc] = CELL.PATH;

        inMaze.add(`${fr},${fc}`);
        addToFrontier(fr, fc);
    }

    // Place Start and End
    grid[1][1]               = CELL.START;
    grid[rows - 2][cols - 2] = CELL.END;
}

// ─────────────────────────────────────────────
//  Rendering
// ─────────────────────────────────────────────
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cs = cellSize();

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            ctx.fillStyle = COLOUR[grid[r][c]] ?? "#ffffff";
            ctx.fillRect(Math.floor(c * cs), Math.floor(r * cs),
                         Math.ceil(cs), Math.ceil(cs));
        }
    }

    if (cs >= 8) {
        ctx.strokeStyle = "rgba(0,0,0,0.07)";
        ctx.lineWidth   = 0.5;
        for (let r = 0; r <= numRows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cs);
            ctx.lineTo(canvas.width, r * cs);
            ctx.stroke();
        }
        for (let c = 0; c <= numCols; c++) {
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
}

// ─────────────────────────────────────────────
//  Step-by-step UI
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

function applyStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= allSteps.length) return;
    grid = allSteps[stepIndex].map(row => [...row]);
    redraw();
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function forceOdd(val, min, max) {
    let v = Math.max(min, Math.min(max, val));
    if (v % 2 === 0) v++;
    return v;
}

/**
 * Run the selected solver.
 * In step mode: populate allSteps and go to step 0.
 * In instant mode: apply the final grid immediately.
 */
function runSolver(algo) {
    const isStepMode = document.getElementById("visualiseCheck").checked;

    // Reset any previous solution by re-normalising visited/solution cells back to PATH
    const cleanGrid = grid.map(row => row.map(cell =>
        (cell === CELL.VISITED || cell === CELL.SOLUTION) ? CELL.PATH : cell
    ));
    grid = cleanGrid;

    let result;
    if (algo === "bfs") {
        if (typeof window.solveBFS !== "function") {
            alert("BFS.js not loaded — make sure it is included in the page.");
            return;
        }
        result = window.solveBFS(grid, numRows, numCols, isStepMode);
    } else {
        if (typeof window.solveDFS !== "function") {
            alert("DFS.js not loaded — make sure it is included in the page.");
            return;
        }
        result = window.solveDFS(grid, numRows, numCols, isStepMode);
    }

    if (isStepMode) {
        allSteps    = result.steps;
        currentStep = 0;
        if (allSteps.length > 0) {
            // Show first step
            grid = allSteps[0].map(row => [...row]);
        }
    } else {
        allSteps    = [];
        currentStep = 0;
        grid = result.finalGrid;
    }

    redraw();
}

// ─────────────────────────────────────────────
//  Button wiring
// ─────────────────────────────────────────────
document.getElementById("generateBtn").addEventListener("click", () => {
    const rawRows = parseInt(document.getElementById("gridRows").value, 10);
    const rawCols = parseInt(document.getElementById("gridCols").value, 10);

    const rows = forceOdd(rawRows, 5, 201);
    const cols = forceOdd(rawCols, 5, 401);

    document.getElementById("gridRows").value = rows;
    document.getElementById("gridCols").value = cols;

    allSteps    = [];
    currentStep = 0;

    generateMaze(rows, cols);
    resizeCanvas();
    redraw();
});

document.getElementById("clearBtn").addEventListener("click", () => {
    allSteps    = [];
    currentStep = 0;
    initGrid(numRows, numCols);
    resizeCanvas();
    redraw();
});

document.getElementById("solveBtn").addEventListener("click", () => {
    const algo = document.querySelector("input[name='algorithm']:checked")?.value;
    runSolver(algo);
});

document.getElementById("stepBackBtn").addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        applyStep(currentStep);
    }
});

document.getElementById("stepForwardBtn").addEventListener("click", () => {
    if (currentStep < allSteps.length) {
        currentStep++;
        applyStep(currentStep - 1);
    }
});

document.getElementById("visualiseCheck").addEventListener("change", (e) => {
    const stepControls = document.getElementById("stepControls");
    stepControls.style.display = e.target.checked ? "flex" : "none";
    if (!e.target.checked) {
        allSteps    = [];
        currentStep = 0;
    }
    updateStepUI();
});

document.querySelectorAll("input[name='algorithm']").forEach(radio => {
    radio.addEventListener("change", () => {
        document.querySelectorAll(".radio-option").forEach(el => el.classList.remove("selected"));
        radio.closest(".radio-option").classList.add("selected");
    });
});

// ─────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────
(function init() {
    document.getElementById("stepControls").style.display = "none";
    document.getElementById("stepBackBtn").disabled       = true;
    document.getElementById("stepForwardBtn").disabled    = true;

    generateMaze(numRows, numCols);
    resizeCanvas();
    redraw();
})();