/**
 * BFS.js  –  Breadth-First Search maze solver
 * 
 * Strategy: "Junction-to-Junction" BFS
 *   • From the start node, flood along each open corridor until a
 *     junction (cell with 3+ open neighbours), dead end, or the goal is reached.
 *   • Each such endpoint is enqueued as a BFS frontier node.
 *   • Uses a QUEUE data structure (FIFO) → spreads outward in waves.
 *   • Guarantees the shortest path in an unweighted grid.
 *
 * Exports (attached to window):
 *   window.solveBFS(grid, numRows, numCols, stepMode)
 *     → { steps: Array<grid>, finalGrid: grid }
 */

(function() {

    function solveBFS(gridIn, numRows, numCols, stepMode) {
        // Create solver instance
        const solver = new window.MazeSolver(gridIn, numRows, numCols, stepMode);
        
        if (!solver.hasValidStartAndGoal()) {
            return solver.getResult();
        }

        // BFS data structures
        const parent = new Map();      // Maps cell → parent cell
        const visited = new Set();      // Tracks visited junction/endpoints
        const queue = [];               // Queue for BFS traversal

        // Initialize
        const startKey = `${solver.startR},${solver.startC}`;
        visited.add(startKey);
        parent.set(startKey, null);
        queue.push([solver.startR, solver.startC]);

        let found = false;

        while (queue.length > 0 && !found) {
            const [r, c] = queue.shift();  // Dequeue (FIFO)

            // Explore each unvisited passable neighbour as a corridor
            const neighbours = solver.getPassableNeighbours(r, c);

            for (const [nr, nc] of neighbours) {
                // Skip if already visited
                if (solver.grid[nr][nc] === window.CELL.VISITED) continue;
                const neighbourKey = `${nr},${nc}`;
                if (visited.has(neighbourKey)) continue;

                // Walk down the corridor from (nr,nc), coming from (r,c)
                const endpoint = solver.exploreCorridor(nr, nc, r, c, parent, visited);
                
                // Add endpoint to queue
                const epKey = `${endpoint.r},${endpoint.c}`;
                if (!visited.has(epKey)) {
                    visited.add(epKey);
                    queue.push([endpoint.r, endpoint.c]);
                }

                // Check if we reached the goal
                if (endpoint.r === solver.goalR && endpoint.c === solver.goalC) {
                    found = true;
                    break;
                }
            }
        }

        // Reconstruct and highlight the solution path
        if (found) {
            solver.reconstructPath(parent);
        }

        return solver.getResult();
    }

    // Attach to window
    window.solveBFS = solveBFS;

})();