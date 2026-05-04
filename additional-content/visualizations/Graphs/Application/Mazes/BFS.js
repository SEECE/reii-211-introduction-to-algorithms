/**
 * BFS.js  –  Breadth-First Search maze solver
 *
 * Strategy: "Junction-to-Junction" BFS
 *   • From the start node, flood along each open corridor until a
 *     junction (cell with 3+ open neighbours), dead end, or the goal is reached.
 *   • Each such endpoint is enqueued as a BFS frontier node.
 *   • This means each BFS *step* in step-mode reveals one corridor segment,
 *     making the visualisation meaningful rather than cell-by-cell noise.
 *
 * Each step snapshot captures the full grid state so the step-controller
 * in Mazes.js can freely scrub back and forth.
 *
 * Exports (attached to window):
 *   window.solveBFS(grid, numRows, numCols, stepMode)
 *     → { steps: Array<grid>, finalGrid: grid }
 *       steps is populated only when stepMode === true
 */

(function () {

    /**
     * Return the passable (non-WALL) orthogonal neighbours of (r,c).
     */
    function passableNeighbours(grid, r, c, numRows, numCols) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        const result = [];
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols
                && grid[nr][nc] !== 0 /* WALL */) {
                result.push([nr, nc]);
            }
        }
        return result;
    }

    /**
     * Deep-clone a 2-D grid (array of arrays).
     */
    function cloneGrid(g) {
        return g.map(row => row.slice());
    }

    /**
     * Walk along a corridor from (r, c) coming from direction (fromR, fromC).
     * Keeps going while the corridor is straight (exactly one forward neighbour
     * that isn't where we came from). Marks every cell VISITED as it goes.
     *
     * Returns the endpoint { r, c } which is either:
     *   – a junction (≥2 forward neighbours)
     *   – a dead end (0 forward neighbours)
     *   – the goal cell
     */
    function walkCorridor(grid, r, c, fromR, fromC, numRows, numCols, goalR, goalC) {
        while (true) {
            // Mark current cell as visited (keep START/END colours)
            if (grid[r][c] !== 2 /* START */ && grid[r][c] !== 3 /* END */) {
                grid[r][c] = 4; // VISITED
            }

            // Reached the goal?
            if (r === goalR && c === goalC) return { r, c };

            const neighbours = passableNeighbours(grid, r, c, numRows, numCols)
                .filter(([nr, nc]) => !(nr === fromR && nc === fromC))
                .filter(([nr, nc]) => grid[nr][nc] !== 4 /* already visited */);

            // Dead end or junction → stop walking
            if (neighbours.length !== 1) return { r, c };

            // Continue straight
            fromR = r; fromC = c;
            [r, c] = neighbours[0];
        }
    }

    /**
     * Main BFS solver.
     *
     * @param {number[][]} gridIn   – the raw grid (will NOT be mutated)
     * @param {number}     numRows
     * @param {number}     numCols
     * @param {boolean}    stepMode – if true, record a snapshot after each corridor segment
     * @returns {{ steps: number[][][], finalGrid: number[][] }}
     */
    function solveBFS(gridIn, numRows, numCols, stepMode) {
        const steps = [];

        // Working copy
        const grid = cloneGrid(gridIn);

        // Locate START (2) and END (3)
        let startR = -1, startC = -1, goalR = -1, goalC = -1;
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                if (gridIn[r][c] === 2) { startR = r; startC = c; }
                if (gridIn[r][c] === 3) { goalR  = r; goalC  = c; }
            }
        }

        if (startR === -1 || goalR === -1) {
            return { steps, finalGrid: cloneGrid(grid) };
        }

        // parent map: "r,c" → [parentR, parentC] for path reconstruction
        const parent = new Map();
        const visited = new Set();

        // BFS queue of junction/endpoint cells
        const queue = [[startR, startC]];
        visited.add(`${startR},${startC}`);
        parent.set(`${startR},${startC}`, null);

        let found = false;

        while (queue.length > 0 && !found) {
            const [r, c] = queue.shift();

            // Explore each unvisited passable neighbour as a corridor
            const neighbours = passableNeighbours(grid, r, c, numRows, numCols);

            for (const [nr, nc] of neighbours) {
                if (grid[nr][nc] === 4 /* VISITED, already explored */) continue;
                if (visited.has(`${nr},${nc}`)) continue;

                // Walk down the corridor from (nr,nc), coming from (r,c)
                // We work on a scratch copy so we can snapshot the corridor reveal
                const scratchGrid = cloneGrid(grid);
                const endpoint = walkCorridor(scratchGrid, nr, nc, r, c, numRows, numCols, goalR, goalC);

                // Commit the corridor to the main grid
                // (copy visited cells from scratch to grid)
                for (let row = 0; row < numRows; row++) {
                    for (let col = 0; col < numCols; col++) {
                        if (scratchGrid[row][col] === 4 && grid[row][col] !== 2 && grid[row][col] !== 3) {
                            grid[row][col] = 4;
                        }
                    }
                }

                // Mark endpoint as visited in BFS terms
                const epKey = `${endpoint.r},${endpoint.c}`;
                if (!visited.has(epKey)) {
                    visited.add(epKey);
                    // Record parent as (r,c) → we store the corridor entry point
                    // Actually we need cell-level parent for path tracing.
                    // We'll store parent of endpoint as (r,c) and let path tracing
                    // walk the corridor backwards via the grid.
                    parent.set(epKey, [r, c]);
                    queue.push([endpoint.r, endpoint.c]);
                }

                // Snapshot this corridor reveal
                if (stepMode) {
                    steps.push(cloneGrid(grid));
                }

                // Check if we reached the goal
                if (endpoint.r === goalR && endpoint.c === goalC) {
                    found = true;
                    break;
                }
            }
        }

        // ── Path reconstruction ──────────────────────────────────────────
        // Trace back from goal to start via the parent map, then
        // highlight the solution corridor by corridor.
        if (found) {
            // Collect the junction waypoints
            const waypoints = [];
            let key = `${goalR},${goalC}`;
            while (key !== null) {
                const [wr, wc] = key.split(',').map(Number);
                waypoints.unshift([wr, wc]);
                key = parent.get(key) ? `${parent.get(key)[0]},${parent.get(key)[1]}` : null;
            }

            // For each consecutive pair of waypoints, flood-fill the corridor
            // between them as SOLUTION (5).
            // We use a BFS on the already-visited grid confined to VISITED/START/END cells.
            function tracePath(grid, fromR, fromC, toR, toC) {
                if (fromR === toR && fromC === toC) return;
                // BFS from toR,toC back to fromR,fromC within visited cells
                const pq = new Map();
                const q2 = [[toR, toC]];
                pq.set(`${toR},${toC}`, null);
                let reached = false;
                while (q2.length > 0 && !reached) {
                    const [r, c] = q2.shift();
                    for (const [nr, nc] of passableNeighbours(grid, r, c, numRows, numCols)) {
                        const k = `${nr},${nc}`;
                        if (pq.has(k)) continue;
                        if (grid[nr][nc] !== 4 && grid[nr][nc] !== 2 && grid[nr][nc] !== 3) continue;
                        pq.set(k, [r, c]);
                        if (nr === fromR && nc === fromC) { reached = true; break; }
                        q2.push([nr, nc]);
                    }
                }
                // Paint the path
                let cur = `${fromR},${fromC}`;
                while (cur) {
                    const [r, c] = cur.split(',').map(Number);
                    if (grid[r][c] !== 2 && grid[r][c] !== 3) grid[r][c] = 5; // SOLUTION
                    const next = pq.get(cur);
                    cur = next ? `${next[0]},${next[1]}` : null;
                }
            }

            for (let i = 0; i < waypoints.length - 1; i++) {
                tracePath(grid, waypoints[i][0], waypoints[i][1], waypoints[i+1][0], waypoints[i+1][1]);
                if (stepMode) steps.push(cloneGrid(grid));
            }

            // Ensure START and END are correctly coloured
            grid[startR][startC] = 2;
            grid[goalR][goalC]   = 3;
            if (stepMode) steps.push(cloneGrid(grid));
        }

        return { steps, finalGrid: cloneGrid(grid) };
    }

    window.solveBFS = solveBFS;

})();