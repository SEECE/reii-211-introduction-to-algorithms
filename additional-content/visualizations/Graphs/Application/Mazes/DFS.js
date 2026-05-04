/**
 * DFS.js  –  Depth-First Search maze solver
 *
 * Strategy: "Junction-to-Junction" DFS
 *   • From the start, push each corridor endpoint onto a stack.
 *   • When popped, walk its unvisited corridors depth-first.
 *   • Each step in step-mode reveals one corridor segment.
 *   • Because DFS commits fully to one branch before backtracking,
 *     you'll see it dive deep then retreat — a very different visual
 *     character from BFS's wavefront spread.
 *
 * Path reconstruction:
 *   • Each junction/endpoint stores its parent (which junction spawned it).
 *   • On finding the goal, we trace the parent chain back and re-highlight
 *     the corridors that form the actual solution path, segment by segment.
 *
 * Exports (attached to window):
 *   window.solveDFS(grid, numRows, numCols, stepMode)
 *     → { steps: Array<grid>, finalGrid: grid }
 */

(function () {

    function passableNeighbours(grid, r, c, numRows, numCols) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        const result = [];
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols
                && grid[nr][nc] !== 0) {
                result.push([nr, nc]);
            }
        }
        return result;
    }

    function cloneGrid(g) {
        return g.map(row => row.slice());
    }

    /**
     * Walk a corridor from (r,c) coming from (fromR,fromC), marking
     * cells VISITED (4) as we go.  Stops at junctions, dead-ends, goal.
     * Returns endpoint { r, c }.
     */
    function walkCorridor(grid, r, c, fromR, fromC, numRows, numCols, goalR, goalC) {
        while (true) {
            if (grid[r][c] !== 2 && grid[r][c] !== 3) {
                grid[r][c] = 4; // VISITED
            }
            if (r === goalR && c === goalC) return { r, c };

            const fwd = passableNeighbours(grid, r, c, numRows, numCols)
                .filter(([nr, nc]) => !(nr === fromR && nc === fromC))
                .filter(([nr, nc]) => grid[nr][nc] !== 4);

            if (fwd.length !== 1) return { r, c };

            fromR = r; fromC = c;
            [r, c] = fwd[0];
        }
    }

    /**
     * Main DFS solver.
     */
    function solveDFS(gridIn, numRows, numCols, stepMode) {
        const steps = [];
        const grid  = cloneGrid(gridIn);

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

        // parent map: "r,c" key → [parentR, parentC] junction
        const parent  = new Map();
        const visited = new Set();

        // DFS stack — each entry is a junction/endpoint cell
        const stack = [[startR, startC]];
        visited.add(`${startR},${startC}`);
        parent.set(`${startR},${startC}`, null);

        let found = false;

        while (stack.length > 0 && !found) {
            const [r, c] = stack[stack.length - 1];

            // Find an unvisited corridor to explore from (r,c)
            const neighbours = passableNeighbours(grid, r, c, numRows, numCols)
                .filter(([nr, nc]) => grid[nr][nc] !== 4 && !visited.has(`${nr},${nc}`));

            if (neighbours.length === 0) {
                // All corridors from here exhausted → backtrack
                stack.pop();
                continue;
            }

            // DFS: take the first available neighbour (depth-first)
            const [nr, nc] = neighbours[0];

            // Walk the corridor from (nr,nc) coming from (r,c)
            const scratchGrid = cloneGrid(grid);
            const endpoint    = walkCorridor(scratchGrid, nr, nc, r, c, numRows, numCols, goalR, goalC);

            // Commit corridor to main grid
            for (let row = 0; row < numRows; row++) {
                for (let col = 0; col < numCols; col++) {
                    if (scratchGrid[row][col] === 4 && grid[row][col] !== 2 && grid[row][col] !== 3) {
                        grid[row][col] = 4;
                    }
                }
            }

            const epKey = `${endpoint.r},${endpoint.c}`;
            if (!visited.has(epKey)) {
                visited.add(epKey);
                parent.set(epKey, [r, c]);
                stack.push([endpoint.r, endpoint.c]);
            }

            if (stepMode) {
                steps.push(cloneGrid(grid));
            }

            if (endpoint.r === goalR && endpoint.c === goalC) {
                found = true;
            }
        }

        // ── Path reconstruction ─────────────────────────────────────────
        if (found) {
            // Collect waypoints from goal back to start
            const waypoints = [];
            let key = `${goalR},${goalC}`;
            while (key !== null) {
                const [wr, wc] = key.split(',').map(Number);
                waypoints.unshift([wr, wc]);
                const p = parent.get(key);
                key = p ? `${p[0]},${p[1]}` : null;
            }

            // Highlight corridor between each consecutive waypoint pair
            function tracePath(grid, fromR, fromC, toR, toC) {
                if (fromR === toR && fromC === toC) return;
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

            grid[startR][startC] = 2;
            grid[goalR][goalC]   = 3;
            if (stepMode) steps.push(cloneGrid(grid));
        }

        return { steps, finalGrid: cloneGrid(grid) };
    }

    window.solveDFS = solveDFS;

})();