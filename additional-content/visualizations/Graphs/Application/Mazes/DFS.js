/**
 * DFS.js  –  Depth-First Search maze solver
 * 
 * Strategy: "Junction-to-Junction" DFS
 *   • From the start node, push each corridor endpoint onto a stack.
 *   • When popped, walk its unvisited corridors depth-first.
 *   • Uses a STACK data structure (LIFO) → dives deep before backtracking.
 *   • Creates a very different visual character from BFS's wavefront spread.
 *
 * Exports (attached to window):
 *   window.solveDFS(grid, numRows, numCols, stepMode)
 *     → { steps: Array<grid>, finalGrid: grid }
 */

(function() {

    function solveDFS(gridIn, numRows, numCols, stepMode) {
        // Create solver instance
        const solver = new window.MazeSolver(gridIn, numRows, numCols, stepMode);
        
        if (!solver.hasValidStartAndGoal()) {
            return solver.getResult();
        }

        // DFS data structures
        const parent = new Map();      // Maps cell → parent cell
        const visited = new Set();      // Tracks visited junction/endpoints
        const stack = [];               // Stack for DFS traversal

        // Initialize
        const startKey = `${solver.startR},${solver.startC}`;
        visited.add(startKey);
        parent.set(startKey, null);
        stack.push([solver.startR, solver.startC]);

        let found = false;

        while (stack.length > 0 && !found) {
            // Get the top of the stack without removing it first
            const [r, c] = stack[stack.length - 1];

            // Find an unvisited corridor to explore from (r,c)
            const neighbours = solver.getPassableNeighbours(r, c)
                .filter(([nr, nc]) => solver.grid[nr][nc] !== window.CELL.VISITED)
                .filter(([nr, nc]) => !visited.has(`${nr},${nc}`));

            if (neighbours.length === 0) {
                // All corridors from here exhausted → backtrack
                stack.pop();
                continue;
            }

            // DFS: take the first available neighbour (depth-first)
            const [nr, nc] = neighbours[0];

            // Walk the corridor from (nr,nc) coming from (r,c)
            const endpoint = solver.exploreCorridor(nr, nc, r, c, parent, visited);

            // Add endpoint to stack
            const epKey = `${endpoint.r},${endpoint.c}`;
            if (!visited.has(epKey)) {
                visited.add(epKey);
                stack.push([endpoint.r, endpoint.c]);
            }

            // Check if we reached the goal
            if (endpoint.r === solver.goalR && endpoint.c === solver.goalC) {
                found = true;
            }
        }

        // Reconstruct and highlight the solution path
        if (found) {
            solver.reconstructPath(parent);
        }

        return solver.getResult();
    }

    // Attach to window
    window.solveDFS = solveDFS;

})();