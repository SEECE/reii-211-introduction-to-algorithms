/**
 * Solver.js – Shared base class for maze solving algorithms
 * 
 * This provides common functionality for both BFS and DFS solvers:
 *   - Grid manipulation (cloning, bounds checking)
 *   - Corridor walking logic
 *   - Path reconstruction with full path filling (no gaps)
 *   - Step recording for visualisation
 * 
 * Individual solvers extend this class and implement their specific
 * traversal strategy (queue for BFS, stack for DFS).
 */

(function() {

    // Cell type constants
    const CELL = {
        WALL:     0,
        PATH:     1,
        START:    2,
        END:      3,
        VISITED:  4,
        SOLUTION: 5,
    };

    class MazeSolver {
        constructor(gridIn, numRows, numCols, stepMode) {
            this.grid = this.cloneGrid(gridIn);
            this.numRows = numRows;
            this.numCols = numCols;
            this.stepMode = stepMode;
            this.steps = [];
            
            this.findStartAndGoal();
        }

        /**
         * Deep-clone a 2-D grid
         */
        cloneGrid(g) {
            return g.map(row => row.slice());
        }

        /**
         * Locate START (2) and END (3) cells
         */
        findStartAndGoal() {
            this.startR = -1;
            this.startC = -1;
            this.goalR = -1;
            this.goalC = -1;
            
            for (let r = 0; r < this.numRows; r++) {
                for (let c = 0; c < this.numCols; c++) {
                    if (this.grid[r][c] === CELL.START) {
                        this.startR = r;
                        this.startC = c;
                    }
                    if (this.grid[r][c] === CELL.END) {
                        this.goalR = r;
                        this.goalC = c;
                    }
                }
            }
        }

        /**
         * Check if start and goal exist
         */
        hasValidStartAndGoal() {
            return this.startR !== -1 && this.goalR !== -1;
        }

        /**
         * Return passable (non-WALL) orthogonal neighbours of (r,c)
         */
        getPassableNeighbours(r, c, ignoreVisited = false) {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const result = [];
            
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.numRows && nc >= 0 && nc < this.numCols
                    && this.grid[nr][nc] !== CELL.WALL) {
                    
                    if (ignoreVisited) {
                        result.push([nr, nc]);
                    } else if (this.grid[nr][nc] !== CELL.VISITED) {
                        result.push([nr, nc]);
                    }
                }
            }
            return result;
        }

        /**
         * Walk along a corridor from (r, c) coming from (fromR, fromC).
         * Marks every cell VISITED as it goes.
         * Stops at junctions, dead ends, or the goal.
         * Returns endpoint { r, c }.
         */
        walkCorridor(r, c, fromR, fromC) {
            while (true) {
                // Mark current cell as visited (preserve START/END)
                if (this.grid[r][c] !== CELL.START && this.grid[r][c] !== CELL.END) {
                    this.grid[r][c] = CELL.VISITED;
                }

                // Reached the goal?
                if (r === this.goalR && c === this.goalC) {
                    return { r, c };
                }

                // Find forward neighbours (not where we came from, not visited)
                const neighbours = this.getPassableNeighbours(r, c)
                    .filter(([nr, nc]) => !(nr === fromR && nc === fromC))
                    .filter(([nr, nc]) => this.grid[nr][nc] !== CELL.VISITED);

                // Dead end (0) or junction (2+) → stop walking
                if (neighbours.length !== 1) {
                    return { r, c };
                }

                // Continue straight
                fromR = r;
                fromC = c;
                [r, c] = neighbours[0];
            }
        }

        /**
         * Find the full path between two points using BFS.
         * This ensures no gaps in the solution line.
         */
        findFullPath(startR, startC, endR, endC) {
            const queue = [[startR, startC]];
            const parent = new Map();
            parent.set(`${startR},${startC}`, null);
            const visitedSet = new Set();
            visitedSet.add(`${startR},${startC}`);
            
            while (queue.length > 0) {
                const [r, c] = queue.shift();
                
                if (r === endR && c === endC) {
                    // Reconstruct path
                    const path = [];
                    let cur = `${r},${c}`;
                    while (cur) {
                        const [pr, pc] = cur.split(',').map(Number);
                        path.unshift([pr, pc]);
                        const p = parent.get(cur);
                        cur = p ? `${p[0]},${p[1]}` : null;
                    }
                    return path;
                }
                
                const neighbours = this.getPassableNeighbours(r, c, true);
                for (const [nr, nc] of neighbours) {
                    const key = `${nr},${nc}`;
                    if (visitedSet.has(key)) continue;
                    // Only walk through visited cells or start/end
                    if (this.grid[nr][nc] !== CELL.VISITED && 
                        this.grid[nr][nc] !== CELL.START && 
                        this.grid[nr][nc] !== CELL.END) continue;
                    visitedSet.add(key);
                    parent.set(key, [r, c]);
                    queue.push([nr, nc]);
                }
            }
            
            return [];
        }

        /**
         * Record a snapshot of the current grid state
         */
        recordSnapshot(status = null) {
            if (this.stepMode) {
                this.steps.push(this.cloneGrid(this.grid));
            }
        }

        /**
         * Reconstruct and highlight the solution path
         * @param {Map} parentMap - Maps cell keys to parent cell coordinates
         */
        reconstructPath(parentMap) {
            // Collect waypoints from goal back to start
            const waypoints = [];
            let key = `${this.goalR},${this.goalC}`;
            while (key !== null) {
                const [wr, wc] = key.split(',').map(Number);
                waypoints.unshift([wr, wc]);
                const p = parentMap.get(key);
                key = p ? `${p[0]},${p[1]}` : null;
            }

            // For each consecutive pair of waypoints, find the full path
            // and mark every cell as SOLUTION
            for (let i = 0; i < waypoints.length - 1; i++) {
                const [fromR, fromC] = waypoints[i];
                const [toR, toC] = waypoints[i + 1];
                
                const fullPath = this.findFullPath(fromR, fromC, toR, toC);
                
                for (const [r, c] of fullPath) {
                    if (this.grid[r][c] !== CELL.START && this.grid[r][c] !== CELL.END) {
                        this.grid[r][c] = CELL.SOLUTION;
                    }
                }
                
                this.recordSnapshot();
            }

            // Ensure START and END are correctly coloured
            this.grid[this.startR][this.startC] = CELL.START;
            this.grid[this.goalR][this.goalC] = CELL.END;
            this.recordSnapshot();
        }

        /**
         * Explore a corridor from a neighbour cell
         * @returns {Object} - The endpoint of the corridor
         */
        exploreCorridor(r, c, parentR, parentC, parentMap, visitedSet) {
            // Walk the corridor from (r,c) coming from (parentR, parentC)
            const gridCopy = this.cloneGrid(this.grid);
            const tempSolver = new MazeSolver(gridCopy, this.numRows, this.numCols, false);
            tempSolver.startR = this.startR;
            tempSolver.startC = this.startC;
            tempSolver.goalR = this.goalR;
            tempSolver.goalC = this.goalC;
            
            const endpoint = tempSolver.walkCorridor(r, c, parentR, parentC);

            // Commit visited cells from the temporary solver to the main grid
            for (let row = 0; row < this.numRows; row++) {
                for (let col = 0; col < this.numCols; col++) {
                    if (tempSolver.grid[row][col] === CELL.VISITED && 
                        this.grid[row][col] !== CELL.START && 
                        this.grid[row][col] !== CELL.END) {
                        this.grid[row][col] = CELL.VISITED;
                    }
                }
            }

            // Mark endpoint as visited
            const epKey = `${endpoint.r},${endpoint.c}`;
            if (!visitedSet.has(epKey)) {
                visitedSet.add(epKey);
                parentMap.set(epKey, [parentR, parentC]);
            }

            this.recordSnapshot();

            return endpoint;
        }

        /**
         * Get the final result
         */
        getResult() {
            return {
                steps: this.steps,
                finalGrid: this.cloneGrid(this.grid)
            };
        }
    }

    // Export the base class and constants
    window.MazeSolver = MazeSolver;
    window.CELL = {
        WALL: 0,
        PATH: 1,
        START: 2,
        END: 3,
        VISITED: 4,
        SOLUTION: 5
    };

})();