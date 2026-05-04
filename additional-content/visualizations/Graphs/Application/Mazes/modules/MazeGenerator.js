/**
 * MazeGenerator.js - Handles maze generation using Prim's algorithm
 */

const MazeGenerator = (function() {
    const CELL = window.CELL || { WALL: 0, PATH: 1, START: 2, END: 3 };
    
    function initGrid(rows, cols) {
        const grid = [];
        for (let r = 0; r < rows; r++) {
            grid.push(new Array(cols).fill(CELL.WALL));
        }
        return grid;
    }
    
    function forceOdd(val, min, max) {
        let v = Math.max(min, Math.min(max, val));
        if (v % 2 === 0) v++;
        return v;
    }
    
    function generateMaze(rows, cols) {
        const grid = initGrid(rows, cols);
        const DIRS = [[-2,0], [2,0], [0,-2], [0,2]];
        
        function inBounds(r, c) {
            return r > 0 && r < rows - 1 && c > 0 && c < cols - 1;
        }
        
        const inMaze = new Set();
        const frontier = [];
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
        
        const seedR = 1, seedC = 1;
        grid[seedR][seedC] = CELL.PATH;
        inMaze.add(`${seedR},${seedC}`);
        addToFrontier(seedR, seedC);
        
        while (frontier.length > 0) {
            const idx = Math.floor(Math.random() * frontier.length);
            const [fr, fc] = frontier[idx];
            frontier[idx] = frontier[frontier.length - 1];
            frontier.pop();
            
            const inNeighbours = [];
            for (const [dr, dc] of DIRS) {
                const nr = fr + dr, nc = fc + dc;
                if (inBounds(nr, nc) && inMaze.has(`${nr},${nc}`)) {
                    inNeighbours.push([nr, nc]);
                }
            }
            
            if (inNeighbours.length === 0) continue;
            
            const [nr, nc] = inNeighbours[Math.floor(Math.random() * inNeighbours.length)];
            const wr = (fr + nr) / 2, wc = (fc + nc) / 2;
            grid[wr][wc] = CELL.PATH;
            grid[fr][fc] = CELL.PATH;
            
            inMaze.add(`${fr},${fc}`);
            addToFrontier(fr, fc);
        }
        
        grid[1][1] = CELL.START;
        grid[rows - 2][cols - 2] = CELL.END;
        
        return grid;
    }
    
    return {
        generateMaze,
        forceOdd,
        initGrid
    };
})();