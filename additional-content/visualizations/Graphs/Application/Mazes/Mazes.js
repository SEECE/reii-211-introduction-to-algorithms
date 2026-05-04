/**
 * Mazes.js - Main entry point
 * Uses modular components for better organization
 */

// Constants
const MAX_CANVAS_W = Math.max(400, window.innerWidth - 380);
const MAX_CANVAS_H = Math.min(window.innerHeight - 180, 700);

// State
let numRows = 51;
let numCols = 51;
let grid = [];
let animationTimeout = null; // Track animation timeout for cleanup

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
    
    // Clear any ongoing animation
    if (animationTimeout) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
    }

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            if (grid[r][c] === CELL.VISITED || grid[r][c] === CELL.SOLUTION) {
                grid[r][c] = CELL.PATH;
            }
        }
    }
    
    // Restore start and end
    let startFound = false, endFound = false;
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            if (grid[r][c] === CELL.START) startFound = true;
            if (grid[r][c] === CELL.END) endFound = true;
        }
    }
    
    if (!startFound) grid[1][1] = CELL.START;
    if (!endFound) grid[numRows - 2][numCols - 2] = CELL.END;

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
    
    // Animate through steps with proper delay
    let stepIndex = 0;
    
    function animateStep() {
        if (!VisualizationController.isSolving()) {
            // Animation was cancelled
            solveBtn.disabled = false;
            solveBtn.textContent = "Solve Maze";
            return;
        }
        
        if (stepIndex < result.steps.length) {
            grid = result.steps[stepIndex].map(row => [...row]);
            redraw();
            stepIndex++;
            VisualizationController.currentStep = stepIndex; // Update current step
            ui.updateStepUI(stepIndex, result.steps.length);
            
            // Get delay from UI - this will reflect current slider value
            const delay = ui.getSpeedDelay();
            animationTimeout = setTimeout(animateStep, delay);
        } else {
            // Animation complete
            VisualizationController.setSolving(false);
            solveBtn.disabled = false;
            solveBtn.textContent = "Solve Maze";
            animationTimeout = null;
        }
    }
    
    // Start animation
    animateStep();
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
        if (VisualizationController.isSolving()) {
            // Cancel ongoing animation
            if (animationTimeout) {
                clearTimeout(animationTimeout);
                animationTimeout = null;
            }
            VisualizationController.setSolving(false);
        }

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
        
        const solveBtn = document.getElementById("solveBtn");
        if (solveBtn) {
            solveBtn.disabled = false;
            solveBtn.textContent = "Solve Maze";
        }
    });

    document.getElementById("clearBtn")?.addEventListener("click", () => {
        if (VisualizationController.isSolving()) {
            if (animationTimeout) {
                clearTimeout(animationTimeout);
                animationTimeout = null;
            }
            VisualizationController.setSolving(false);
        }

        VisualizationController.reset();
        grid = MazeGenerator.initGrid(numRows, numCols);
        CanvasRenderer.resizeCanvas(numRows, numCols, MAX_CANVAS_W, MAX_CANVAS_H);
        redraw();
        
        const solveBtn = document.getElementById("solveBtn");
        if (solveBtn) {
            solveBtn.disabled = false;
            solveBtn.textContent = "Solve Maze";
        }
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
        
        if (stepControls) stepControls.style.display = e.target.checked ? "flex" : "none";

        if (!e.target.checked && VisualizationController.isSolving()) {
            // Cancel animation if switching modes mid-solve
            if (animationTimeout) {
                clearTimeout(animationTimeout);
                animationTimeout = null;
            }
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

    // Speed slider live update - show current speed
    document.getElementById("slider-speed")?.addEventListener("input", () => {
        ui.getSpeedDelay(); // This updates the label
    });
}

// Initialize
(function init() {
    const stepControls = document.getElementById("stepControls");
    if (stepControls) stepControls.style.display = "none";

    grid = MazeGenerator.generateMaze(numRows, numCols);
    CanvasRenderer.resizeCanvas(numRows, numCols, MAX_CANVAS_W, MAX_CANVAS_H);
    redraw();
    setupEventListeners();
})();