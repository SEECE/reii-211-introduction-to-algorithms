/**
 * Mazes.js - Main entry point
 * Uses modular components for better organization
 */

// Constants
const MAX_CANVAS_W = Math.max(400, window.innerWidth - 340);
const MAX_CANVAS_H = Math.min(window.innerHeight - 180, 700);

// State
let numRows = 51;
let numCols = 151;
let grid = [];

// Initialize modules
CanvasRenderer.init();
const ui = UIControls.initControls();

// Helper functions
function forceOdd(val, min, max) {
    let v = Math.max(min, Math.min(max, val));
    if (v % 2 === 0) v++;
    return v;
}

function redraw() {
    CanvasRenderer.drawGrid(grid, numRows, numCols);
    ui.updateStepUI(VisualizationController.getCurrentStep(), VisualizationController.getTotalSteps());
}

function resetSolution() {
    if (VisualizationController.isSolving()) return;
    
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            if (grid[r][c] === CELL.VISITED || grid[r][c] === CELL.SOLUTION) {
                grid[r][c] = CELL.PATH;
            }
        }
    }
    grid[1][1] = CELL.START;
    grid[numRows - 2][numCols - 2] = CELL.END;
    
    VisualizationController.reset();
    redraw();
    
    const solveBtn = document.getElementById("solveBtn");
    if (solveBtn) {
        solveBtn.disabled = false;
        solveBtn.textContent = "Solve Maze";
    }
}

async function runSolverAnimated(algo) {
    if (VisualizationController.isSolving()) return;
    VisualizationController.setSolving(true);
    
    const solveBtn = document.getElementById("solveBtn");
    solveBtn.disabled = true;
    solveBtn.textContent = "Solving...";
    
    resetSolution();
    
    let result;
    if (algo === "bfs") {
        result = window.solveBFS(grid, numRows, numCols, true);
    } else {
        result = window.solveDFS(grid, numRows, numCols, true);
    }
    
    VisualizationController.setSteps(result.steps);
    
    for (let i = 0; i < result.steps.length; i++) {
        if (!VisualizationController.isSolving()) break;
        grid = result.steps[i].map(row => [...row]);
        redraw();
        await new Promise(resolve => setTimeout(resolve, ui.getSpeedDelay()));
    }
    
    VisualizationController.setSolving(false);
    solveBtn.disabled = false;
    solveBtn.textContent = "Solve Maze";
}

function runSolver(algo) {
    if (ui.isStepMode()) {
        runSolverAnimated(algo);
    } else {
        if (VisualizationController.isSolving()) return;
        
        const solveBtn = document.getElementById("solveBtn");
        solveBtn.disabled = true;
        solveBtn.textContent = "Solving...";
        
        resetSolution();
        
        let result;
        if (algo === "bfs") {
            result = window.solveBFS(grid, numRows, numCols, false);
        } else {
            result = window.solveDFS(grid, numRows, numCols, false);
        }
        
        VisualizationController.reset();
        grid = result.finalGrid;
        redraw();
        
        solveBtn.disabled = false;
        solveBtn.textContent = "Solve Maze";
    }
}

// Event listeners
function setupEventListeners() {
    document.getElementById("generateBtn")?.addEventListener("click", () => {
        if (VisualizationController.isSolving()) return;
        
        const rawRows = ui.getNumRows();
        const rawCols = ui.getNumCols();
        
        numRows = forceOdd(rawRows, 5, 201);
        numCols = forceOdd(rawCols, 5, 401);
        
        document.getElementById("gridRows").value = numRows;
        document.getElementById("gridCols").value = numCols;
        
        VisualizationController.reset();
        grid = MazeGenerator.generateMaze(numRows, numCols);
        CanvasRenderer.resizeCanvas(numRows, numCols, MAX_CANVAS_W, MAX_CANVAS_H);
        redraw();
    });
    
    document.getElementById("clearBtn")?.addEventListener("click", () => {
        if (VisualizationController.isSolving()) return;
        
        VisualizationController.reset();
        grid = MazeGenerator.initGrid(numRows, numCols);
        CanvasRenderer.resizeCanvas(numRows, numCols, MAX_CANVAS_W, MAX_CANVAS_H);
        redraw();
    });
    
    document.getElementById("resetSolutionBtn")?.addEventListener("click", () => {
        resetSolution();
    });
    
    document.getElementById("solveBtn")?.addEventListener("click", () => {
        if (VisualizationController.isSolving()) return;
        const algo = ui.getAlgorithm();
        runSolver(algo);
    });
    
    document.getElementById("stepBackBtn")?.addEventListener("click", () => {
        if (VisualizationController.isSolving()) return;
        const stepIndex = VisualizationController.prevStep();
        if (stepIndex >= 0) {
            const stepGrid = VisualizationController.getGridAtStep(stepIndex, grid);
            if (stepGrid) {
                grid = stepGrid;
                redraw();
            }
        }
    });
    
    document.getElementById("stepForwardBtn")?.addEventListener("click", () => {
        if (VisualizationController.isSolving()) return;
        const stepIndex = VisualizationController.nextStep();
        if (stepIndex >= 0) {
            const stepGrid = VisualizationController.getGridAtStep(stepIndex, grid);
            if (stepGrid) {
                grid = stepGrid;
                redraw();
            }
        }
    });
    
    document.getElementById("visualiseCheck")?.addEventListener("change", (e) => {
        const stepControls = document.getElementById("stepControls");
        const speedControl = document.getElementById("speedControl");
        if (stepControls) stepControls.style.display = e.target.checked ? "flex" : "none";
        if (speedControl) speedControl.style.display = e.target.checked ? "block" : "none";
        if (!e.target.checked && VisualizationController.isSolving()) {
            VisualizationController.setSolving(false);
        }
        if (!e.target.checked) {
            VisualizationController.reset();
        }
        ui.updateStepUI(VisualizationController.getCurrentStep(), VisualizationController.getTotalSteps());
    });
    
    document.querySelectorAll("input[name='algorithm']").forEach(radio => {
        radio.addEventListener("change", () => {
            document.querySelectorAll(".radio-option").forEach(el => el.classList.remove("selected"));
            radio.closest(".radio-option").classList.add("selected");
        });
    });
}

// Initialize
(function init() {
    const stepControls = document.getElementById("stepControls");
    const speedControl = document.getElementById("speedControl");
    if (stepControls) stepControls.style.display = "none";
    if (speedControl) speedControl.style.display = "none";
    
    grid = MazeGenerator.generateMaze(numRows, numCols);
    CanvasRenderer.resizeCanvas(numRows, numCols, MAX_CANVAS_W, MAX_CANVAS_H);
    redraw();
    setupEventListeners();
})();