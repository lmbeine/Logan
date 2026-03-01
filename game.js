const BOARD_SIZE = 10;

const REBEL_SHIPS = [
    { name: 'Mon Calamari Cruiser', size: 5, image: 'ships/mon-calamari.svg' },
    { name: 'Nebulon-B Frigate', size: 4, image: 'ships/nebulon-b.svg' },
    { name: 'CR90 Corvette', size: 3, image: 'ships/cr90.svg' },
    { name: 'X-Wing Squadron', size: 3, image: 'ships/x-wing.svg' },
    { name: 'Y-Wing Squadron', size: 2, image: 'ships/y-wing.svg' }
];

const EMPIRE_SHIPS = [
    { name: 'Super Star Destroyer', size: 5, image: 'ships/super-star-destroyer.svg' },
    { name: 'Imperial Star Destroyer', size: 4, image: 'ships/star-destroyer.svg' },
    { name: 'Victory-Class Destroyer', size: 3, image: 'ships/victory-destroyer.svg' },
    { name: 'TIE Fighter Squadron', size: 3, image: 'ships/tie-fighter.svg' },
    { name: 'TIE Bomber Squadron', size: 2, image: 'ships/tie-bomber.svg' }
];

class BattleshipGame {
    constructor() {
        this.player = { board: this.createEmptyBoard(), ships: [], shipsPlaced: 0 };
        this.ai = { board: this.createEmptyBoard(), ships: [], shipsPlaced: 0 };
        this.phase = 'setup';
        this.selectedShip = null;
        this.isHorizontal = true;
        this.gameOver = false;
        this.isPlayerTurn = true;
        
        this.aiRemainingShips = REBEL_SHIPS.map(s => s.size);
        this.probabilityMap = this.createProbabilityMap();
        this.showHeatmap = true;
        
        this.rebelCaptures = [];
        this.empireCaptures = [];
        this.pendingCallback = null;
        
        this.playerShots = 0;
        this.playerHits = 0;
        this.currentSortColumn = 'game';
        this.currentSortDirection = 'desc';
        
        this.gameActions = [];
        this.isReplayMode = false;
        this.replayIndex = 0;
        this.lastCompletedGame = null;

        this.dragOriginalShip = null;
        this.dragGhost = null;
        this._dragMoveHandler = null;

        this.initializeDOM();
        this.setupEventListeners();
        this.renderShipSelection();
        this.renderBoards();
    }
    
    createProbabilityMap() {
        return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    }

    createEmptyBoard() {
        return Array(BOARD_SIZE).fill(null).map(() => 
            Array(BOARD_SIZE).fill(null).map(() => ({ ship: null, hit: false }))
        );
    }

    initializeDOM() {
        this.gameInfoEl = document.getElementById('game-info');
        this.gameBoardsEl = document.getElementById('game-boards');
        this.playerBoardEl = document.getElementById('player-board');
        this.enemyBoardEl = document.getElementById('enemy-board');
        this.shipsListEl = document.getElementById('ships-list');
        this.phaseIndicatorEl = document.getElementById('phase-indicator');
        this.currentPlayerEl = document.getElementById('current-player');
        this.instructionsEl = document.getElementById('instructions');
        this.gameOverEl = document.getElementById('game-over');
        this.winnerMessageEl = document.getElementById('winner-message');
        this.playAgainBtnEl = document.getElementById('play-again-btn');
        this.shipSelectionEl = document.getElementById('ship-selection');
        this.rebelCapturesEl = document.getElementById('rebel-captures');
        this.empireCapturesEl = document.getElementById('empire-captures');
        this.shipDestroyedModal = document.getElementById('ship-destroyed-modal');
        this.modalContent = this.shipDestroyedModal.querySelector('.modal-content');
        this.modalInsignia = document.getElementById('modal-insignia');
        this.modalTitle = document.getElementById('modal-title');
        this.modalShipImage = document.getElementById('modal-ship-image');
        this.modalShipName = document.getElementById('modal-ship-name');
        this.modalContinueBtn = document.getElementById('modal-continue-btn');
        this.confirmPlacementBtn = document.getElementById('confirm-placement-btn');
        this.damageFlashEl = document.getElementById('damage-flash');
        
        this.leaderboardBtn = document.getElementById('leaderboard-btn');
        this.leaderboardModal = document.getElementById('leaderboard-modal');
        this.leaderboardBody = document.getElementById('leaderboard-body');
        this.closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
        this.clearStatsBtn = document.getElementById('clear-stats-btn');
        this.statWins = document.getElementById('stat-wins');
        this.statLosses = document.getElementById('stat-losses');
        this.statWinrate = document.getElementById('stat-winrate');
        this.statStreak = document.getElementById('stat-streak');
        
        this.replayModal = document.getElementById('replay-modal');
        this.replayTimeline = document.getElementById('replay-timeline');
        this.replayTurnLabel = document.getElementById('replay-turn-label');
        this.replayPlayerBoard = document.getElementById('replay-player-board');
        this.replayEnemyBoard = document.getElementById('replay-enemy-board');
        this.replayPrevBtn = document.getElementById('replay-prev-btn');
        this.replayNextBtn = document.getElementById('replay-next-btn');
        this.replayPlayBtn = document.getElementById('replay-play-btn');
        this.closeReplayBtn = document.getElementById('close-replay-btn');
        this.replayActionText = document.getElementById('replay-action-text');
        this.watchReplayBtn = document.getElementById('watch-replay-btn');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r' && this.phase === 'setup') {
                this.isHorizontal = !this.isHorizontal;
                
                if (this.isDragging && this.lastDragRow !== undefined) {
                    this.clearPreview();
                    const ship = REBEL_SHIPS[this.draggedShipIndex];
                    const cells = this.getShipCells(this.lastDragRow, this.lastDragCol, ship.size, this.isHorizontal);
                    const isValid = this.canPlaceShip(this.player.board, this.lastDragRow, this.lastDragCol, ship.size, this.isHorizontal);
                    
                    cells.forEach(([r, c]) => {
                        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                            const cellEl = this.playerBoardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                            if (cellEl) {
                                cellEl.classList.add(isValid ? 'preview' : 'invalid');
                            }
                        }
                    });
                }
                
                if (this.dragGhost) {
                    this.dragGhost.classList.toggle('vertical', !this.isHorizontal);
                }
                
                this.updateRotationIndicator();
            }
        });

        this.playAgainBtnEl.addEventListener('click', () => this.resetGame());
        this.modalContinueBtn.addEventListener('click', () => this.closeModal());
        this.confirmPlacementBtn.addEventListener('click', () => this.startBattle());
        
        this.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.closeLeaderboardBtn.addEventListener('click', () => this.closeLeaderboard());
        this.clearStatsBtn.addEventListener('click', () => this.clearStats());
        
        document.querySelectorAll('.leaderboard-table th.sortable').forEach(th => {
            th.addEventListener('click', () => this.sortLeaderboard(th.dataset.sort));
        });
        
        this.replayTimeline.addEventListener('input', (e) => this.scrubReplay(parseInt(e.target.value)));
        this.replayPrevBtn.addEventListener('click', () => this.replayStep(-1));
        this.replayNextBtn.addEventListener('click', () => this.replayStep(1));
        this.replayPlayBtn.addEventListener('click', () => this.toggleReplayAutoPlay());
        this.closeReplayBtn.addEventListener('click', () => this.closeReplay());
        this.watchReplayBtn.addEventListener('click', () => this.showReplay());
    }

    renderShipSelection() {
        this.shipsListEl.innerHTML = '';

        REBEL_SHIPS.forEach((ship, index) => {
            const shipItem = document.createElement('div');
            shipItem.className = 'ship-item';
            
            const isPlaced = this.player.ships.some(s => s.name === ship.name);
            if (isPlaced) {
                shipItem.classList.add('placed');
            }

            const shipName = document.createElement('div');
            shipName.className = 'ship-name';
            shipName.textContent = ship.name;
            
            const shipSize = document.createElement('div');
            shipSize.className = 'ship-size';
            shipSize.textContent = `Size: ${ship.size}`;

            const shipVisual = document.createElement('div');
            shipVisual.className = 'ship-visual draggable-ship';
            shipVisual.dataset.shipIndex = index;
            shipVisual.dataset.size = ship.size;
            shipVisual.setAttribute('draggable', 'true');
            
            for (let i = 0; i < ship.size; i++) {
                const cell = document.createElement('div');
                cell.className = 'ship-cell';
                shipVisual.appendChild(cell);
            }

            shipItem.appendChild(shipName);
            shipItem.appendChild(shipSize);
            shipItem.appendChild(shipVisual);

            shipVisual.addEventListener('dragstart', (e) => {
                if (isPlaced) {
                    const shipData = this.player.ships.find(s => s.name === ship.name);
                    if (shipData) {
                        this.dragOriginalShip = {
                            name: shipData.name,
                            size: shipData.size,
                            cells: shipData.cells.map(c => [...c]),
                            hits: shipData.hits
                        };
                    }
                    this.removeShipFromBoard(ship.name);
                }
                this.handleDragStart(e, index);
            });
            shipVisual.addEventListener('dragend', (e) => this.handleDragEnd(e));

            this.shipsListEl.appendChild(shipItem);
        });
    }
    
    removeShipFromBoard(shipName) {
        const shipData = this.player.ships.find(s => s.name === shipName);
        if (!shipData) return;
        
        shipData.cells.forEach(([r, c]) => {
            this.player.board[r][c] = { ship: null, hit: false };
        });
        
        this.player.ships = this.player.ships.filter(s => s.name !== shipName);
        this.player.shipsPlaced--;
        
        if (this.player.shipsPlaced < REBEL_SHIPS.length) {
            this.confirmPlacementBtn.classList.add('hidden');
        }
        
        this.renderBoards();
    }

    renderBoards() {
        this.renderPlayerBoard();
        this.renderEnemyBoard();
    }

    renderPlayerBoard() {
        this.playerBoardEl.innerHTML = '';

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const cellData = this.player.board[row][col];
                
                if (cellData.ship !== null) {
                    cell.classList.add('ship');
                }
                if (cellData.hit) {
                    cell.classList.add(cellData.ship !== null ? 'hit' : 'miss');
                }

                if (this.phase === 'setup') {
                    cell.addEventListener('dragenter', (e) => e.preventDefault());
                    cell.addEventListener('dragover', (e) => this.handleDragOver(e, row, col));
                    cell.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                    cell.addEventListener('drop', (e) => this.handleDrop(e, row, col));
                    
                    if (cellData.ship !== null) {
                        cell.setAttribute('draggable', 'true');
                        cell.classList.add('ship-draggable');
                        const shipName = cellData.ship;
                        cell.addEventListener('dragstart', (e) => {
                            const shipIndex = REBEL_SHIPS.findIndex(s => s.name === shipName);
                            const shipData = this.player.ships.find(s => s.name === shipName);
                            if (shipData) {
                                this.dragOriginalShip = {
                                    name: shipData.name,
                                    size: shipData.size,
                                    cells: shipData.cells.map(c => [...c]),
                                    hits: shipData.hits
                                };
                                shipData.cells.forEach(([r, c]) => {
                                    this.player.board[r][c] = { ship: null, hit: false };
                                });
                                this.player.ships = this.player.ships.filter(s => s.name !== shipName);
                                this.player.shipsPlaced--;
                                if (this.player.shipsPlaced < REBEL_SHIPS.length) {
                                    this.confirmPlacementBtn.classList.add('hidden');
                                }
                                this.dragOriginalShip.cells.forEach(([r, c]) => {
                                    const cellEl = this.playerBoardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                                    if (cellEl) {
                                        cellEl.classList.remove('ship', 'ship-draggable');
                                        cellEl.removeAttribute('draggable');
                                    }
                                });
                            }
                            this.handleDragStart(e, shipIndex);
                        });
                        cell.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    }
                }
                
                if (this.phase === 'battle' && this.showHeatmap && !cellData.hit) {
                    const prob = this.probabilityMap[row][col];
                    const maxProb = Math.max(...this.probabilityMap.flat());
                    if (maxProb > 0 && prob > 0) {
                        const intensity = prob / maxProb;
                        const hue = 240 - (intensity * 240);
                        cell.style.setProperty('--heatmap-color', `hsla(${hue}, 100%, 50%, ${0.3 + intensity * 0.4})`);
                        cell.classList.add('heatmap');
                    }
                }

                this.playerBoardEl.appendChild(cell);
            }
        }
    }

    renderEnemyBoard() {
        this.enemyBoardEl.innerHTML = '';

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const cellData = this.ai.board[row][col];

                if (cellData.hit) {
                    cell.classList.add(cellData.ship !== null ? 'hit' : 'miss');
                    
                    if (cellData.ship !== null) {
                        const ship = this.ai.ships.find(s => s.name === cellData.ship);
                        if (ship && this.isShipSunk(this.ai, ship.name)) {
                            cell.classList.add('sunk');
                        }
                    }
                }

                if (this.phase === 'battle' && !cellData.hit && this.isPlayerTurn) {
                    cell.addEventListener('click', () => this.handlePlayerAttack(row, col));
                }

                if (this.phase === 'setup') {
                    cell.classList.add('disabled');
                }

                this.enemyBoardEl.appendChild(cell);
            }
        }

        if (this.phase === 'setup') {
            this.enemyBoardEl.classList.add('disabled');
        } else {
            this.enemyBoardEl.classList.remove('disabled');
        }
    }

    handleDragStart(e, shipIndex) {
        this.draggedShipIndex = shipIndex;
        this.isDragging = true;
        const ship = REBEL_SHIPS[shipIndex];
        
        e.dataTransfer.setData('text/plain', shipIndex);
        e.dataTransfer.effectAllowed = 'move';
        
        e.target.classList.add('dragging');
        
        const transparentImg = new Image();
        transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(transparentImg, 0, 0);
        
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'drag-ghost-custom';
        if (!this.isHorizontal) {
            this.dragGhost.classList.add('vertical');
        }
        for (let i = 0; i < ship.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'ship-cell';
            this.dragGhost.appendChild(cell);
        }
        this.dragGhost.style.left = (e.clientX + 10) + 'px';
        this.dragGhost.style.top = (e.clientY + 10) + 'px';
        document.body.appendChild(this.dragGhost);
        
        this._dragMoveHandler = (ev) => {
            if (this.dragGhost) {
                this.dragGhost.style.left = (ev.clientX + 10) + 'px';
                this.dragGhost.style.top = (ev.clientY + 10) + 'px';
            }
        };
        document.addEventListener('dragover', this._dragMoveHandler);
    }
    
    handleDragEnd(e) {
        if (this.dragOriginalShip) {
            const shipName = this.dragOriginalShip.name;
            const wasReplaced = this.player.ships.some(s => s.name === shipName);
            if (!wasReplaced) {
                this.dragOriginalShip.cells.forEach(([r, c]) => {
                    this.player.board[r][c] = { ship: shipName, hit: false };
                });
                this.player.ships.push(this.dragOriginalShip);
                this.player.shipsPlaced++;
                if (this.player.shipsPlaced === REBEL_SHIPS.length) {
                    this.confirmPlacementBtn.classList.remove('hidden');
                    this.instructionsEl.textContent = 'All ships placed! Confirm your fleet deployment.';
                }
            }
            this.dragOriginalShip = null;
        }
        
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        if (this._dragMoveHandler) {
            document.removeEventListener('dragover', this._dragMoveHandler);
            this._dragMoveHandler = null;
        }
        
        this.isDragging = false;
        this.draggedShipIndex = null;
        e.target.classList.remove('dragging');
        this.clearPreview();
        this.renderShipSelection();
        this.renderBoards();
    }
    
    handleDragOver(e, row, col) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (this.draggedShipIndex === null) return;
        
        this.clearPreview();
        const ship = REBEL_SHIPS[this.draggedShipIndex];
        const cells = this.getShipCells(row, col, ship.size, this.isHorizontal);
        const isValid = this.canPlaceShip(this.player.board, row, col, ship.size, this.isHorizontal);
        
        cells.forEach(([r, c]) => {
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                const cellEl = this.playerBoardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (cellEl) {
                    cellEl.classList.add(isValid ? 'preview' : 'invalid');
                }
            }
        });
        
        this.lastDragRow = row;
        this.lastDragCol = col;
    }
    
    handleDragLeave(e) {
        // Only clear if leaving the board entirely
        if (!e.relatedTarget || !this.playerBoardEl.contains(e.relatedTarget)) {
            this.clearPreview();
        }
    }
    
    handleDrop(e, row, col) {
        e.preventDefault();
        
        if (this.draggedShipIndex === null) return;
        
        const ship = REBEL_SHIPS[this.draggedShipIndex];
        if (!this.canPlaceShip(this.player.board, row, col, ship.size, this.isHorizontal)) {
            this.clearPreview();
            return;
        }
        
        const cells = this.getShipCells(row, col, ship.size, this.isHorizontal);
        
        cells.forEach(([r, c]) => {
            this.player.board[r][c] = { ship: ship.name, hit: false };
        });
        
        this.player.ships.push({
            name: ship.name,
            size: ship.size,
            cells: cells,
            hits: 0
        });
        
        this.recordAction('place', 'player', { ship: ship.name, cells: cells });
        
        this.player.shipsPlaced++;
        this.dragOriginalShip = null;
        this.draggedShipIndex = null;
        this.isDragging = false;
        
        if (this.player.shipsPlaced === REBEL_SHIPS.length) {
            this.confirmPlacementBtn.classList.remove('hidden');
            this.instructionsEl.textContent = 'All ships placed! Confirm your fleet deployment.';
        }
        
        this.clearPreview();
        this.renderShipSelection();
        this.renderBoards();
    }

    clearPreview() {
        const cells = this.playerBoardEl.querySelectorAll('.preview, .invalid');
        cells.forEach(cell => {
            cell.classList.remove('preview', 'invalid');
        });
    }

    getShipCells(row, col, size, horizontal) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            if (horizontal) {
                cells.push([row, col + i]);
            } else {
                cells.push([row + i, col]);
            }
        }
        return cells;
    }

    canPlaceShip(board, row, col, size, horizontal) {
        const cells = this.getShipCells(row, col, size, horizontal);

        for (const [r, c] of cells) {
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
                return false;
            }
            if (board[r][c].ship !== null) {
                return false;
            }
        }
        return true;
    }

    updateRotationIndicator() {
        const indicator = this.isHorizontal ? '↔ Horizontal' : '↕ Vertical';
        this.instructionsEl.textContent = `Drag ships to your grid. Press R to rotate. [${indicator}]`;
    }

    placeAIShips() {
        EMPIRE_SHIPS.forEach(ship => {
            let placed = false;
            while (!placed) {
                const horizontal = Math.random() < 0.5;
                const row = Math.floor(Math.random() * BOARD_SIZE);
                const col = Math.floor(Math.random() * BOARD_SIZE);

                if (this.canPlaceShip(this.ai.board, row, col, ship.size, horizontal)) {
                    const cells = this.getShipCells(row, col, ship.size, horizontal);
                    cells.forEach(([r, c]) => {
                        this.ai.board[r][c] = { ship: ship.name, hit: false };
                    });
                    this.ai.ships.push({
                        name: ship.name,
                        size: ship.size,
                        cells: cells,
                        hits: 0
                    });
                    this.recordAction('place', 'ai', { ship: ship.name, cells: cells });
                    placed = true;
                }
            }
        });
    }

    startBattle() {
        this.placeAIShips();
        this.phase = 'battle';
        this.phaseIndicatorEl.textContent = 'Battle Phase';
        this.currentPlayerEl.textContent = 'Your Turn';
        this.instructionsEl.textContent = 'Click on enemy airspace to fire!';
        this.shipSelectionEl.classList.add('hidden');
        this.confirmPlacementBtn.classList.add('hidden');
        this.recordAction('battleStart', 'system', {});
        this.calculateProbabilityMap();
        this.renderBoards();
    }

    handlePlayerAttack(row, col) {
        if (this.phase !== 'battle' || this.gameOver || !this.isPlayerTurn) return;

        const cellData = this.ai.board[row][col];
        if (cellData.hit) return;

        this.ai.board[row][col] = { ...cellData, hit: true };
        this.playerShots++;
        
        const isHit = cellData.ship !== null;
        const shipName = isHit ? cellData.ship : null;

        if (cellData.ship !== null) {
            const ship = this.ai.ships.find(s => s.name === cellData.ship);
            ship.hits++;
            this.playerHits++;
            
            const isSunk = this.isShipSunk(this.ai, ship.name);
            
            this.recordAction('attack', 'player', { 
                row, col, 
                hit: isHit, 
                ship: shipName,
                sunk: isSunk
            });
            
            this.renderBoards();
            this.triggerExplosion(this.enemyBoardEl, row, col);

            if (isSunk) {
                this.instructionsEl.textContent = `You destroyed their ${ship.name}!`;
                this.rebelCaptures.push(ship.name);
                this.renderCaptures();
                setTimeout(() => {
                    this.showShipDestroyedModal('rebel', ship.name);
                }, 600);
                return;
            } else {
                this.instructionsEl.textContent = 'Hit!';
            }

            if (this.checkWin(this.ai)) {
                this.handleGameOver(true);
                return;
            }
        } else {
            this.recordAction('attack', 'player', { 
                row, col, 
                hit: isHit, 
                ship: shipName,
                sunk: false
            });
            this.instructionsEl.textContent = 'Miss!';
            this.renderBoards();
        }
        this.isPlayerTurn = false;
        this.currentPlayerEl.textContent = "Empire's Turn";

        setTimeout(() => {
            this.aiTurn();
        }, 1000);
    }

    aiTurn() {
        if (this.gameOver) return;

        this.calculateProbabilityMap();
        const [row, col] = this.getHighestProbabilityTarget();

        const cellData = this.player.board[row][col];
        this.player.board[row][col] = { ...cellData, hit: true };
        
        const isHit = cellData.ship !== null;
        const shipName = isHit ? cellData.ship : null;

        if (cellData.ship !== null) {
            const ship = this.player.ships.find(s => s.name === cellData.ship);
            ship.hits++;
            
            const isSunk = this.isShipSunk(this.player, ship.name);
            
            if (isSunk) {
                const idx = this.aiRemainingShips.indexOf(ship.size);
                if (idx > -1) this.aiRemainingShips.splice(idx, 1);
            }
            
            this.recordAction('attack', 'ai', { 
                row, col, 
                hit: isHit, 
                ship: shipName,
                sunk: isSunk
            });
            
            this.renderBoards();
            this.triggerExplosion(this.playerBoardEl, row, col);
            this.triggerDamageFlash();

            if (this.isShipSunk(this.player, ship.name)) {
                this.instructionsEl.textContent = `The Empire destroyed your ${ship.name}!`;
                this.empireCaptures.push(ship.name);
                this.renderCaptures();
                setTimeout(() => {
                    this.showShipDestroyedModal('empire', ship.name);
                }, 600);
                return;
            } else {
                this.instructionsEl.textContent = 'The Empire hit your ship!';
            }

            if (this.checkWin(this.player)) {
                this.handleGameOver(false);
                return;
            }
        } else {
            this.recordAction('attack', 'ai', { 
                row, col, 
                hit: isHit, 
                ship: shipName,
                sunk: false
            });
            this.instructionsEl.textContent = 'The Empire missed!';
        }

        this.renderBoards();

        setTimeout(() => {
            this.isPlayerTurn = true;
            this.currentPlayerEl.textContent = 'Your Turn';
            this.instructionsEl.textContent = 'Click on enemy airspace to fire!';
            this.renderBoards();
        }, 1000);
    }

    calculateProbabilityMap() {
        this.probabilityMap = this.createProbabilityMap();
        
        const unsunkHits = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = this.player.board[r][c];
                if (cell.hit && cell.ship && !this.isShipSunk(this.player, cell.ship)) {
                    unsunkHits.push({ row: r, col: c });
                }
            }
        }
        
        this.aiRemainingShips.forEach(shipSize => {
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    if (this.canPlacementFit(row, col, shipSize, true, unsunkHits)) {
                        const hitBonus = this.countHitsInPlacement(row, col, shipSize, true, unsunkHits);
                        for (let i = 0; i < shipSize; i++) {
                            if (!this.player.board[row][col + i].hit) {
                                this.probabilityMap[row][col + i] += 1 + (hitBonus * 10);
                            }
                        }
                    }
                    if (this.canPlacementFit(row, col, shipSize, false, unsunkHits)) {
                        const hitBonus = this.countHitsInPlacement(row, col, shipSize, false, unsunkHits);
                        for (let i = 0; i < shipSize; i++) {
                            if (!this.player.board[row + i][col].hit) {
                                this.probabilityMap[row + i][col] += 1 + (hitBonus * 10);
                            }
                        }
                    }
                }
            }
        });
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.player.board[r][c].hit) {
                    this.probabilityMap[r][c] = 0;
                }
            }
        }
    }
    
    canPlacementFit(row, col, size, horizontal, unsunkHits) {
        for (let i = 0; i < size; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            
            if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
            
            const cell = this.player.board[r][c];
            if (cell.hit && !cell.ship) return false;
            if (cell.hit && cell.ship && this.isShipSunk(this.player, cell.ship)) return false;
        }
        return true;
    }
    
    countHitsInPlacement(row, col, size, horizontal, unsunkHits) {
        let count = 0;
        for (let i = 0; i < size; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            if (unsunkHits.some(h => h.row === r && h.col === c)) {
                count++;
            }
        }
        return count;
    }
    
    getHighestProbabilityTarget() {
        let maxProb = 0;
        let bestTargets = [];
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (!this.player.board[row][col].hit) {
                    if (this.probabilityMap[row][col] > maxProb) {
                        maxProb = this.probabilityMap[row][col];
                        bestTargets = [[row, col]];
                    } else if (this.probabilityMap[row][col] === maxProb) {
                        bestTargets.push([row, col]);
                    }
                }
            }
        }
        
        if (bestTargets.length > 0) {
            return bestTargets[Math.floor(Math.random() * bestTargets.length)];
        }
        
        const available = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (!this.player.board[r][c].hit) {
                    available.push([r, c]);
                }
            }
        }
        return available[Math.floor(Math.random() * available.length)];
    }

    isShipSunk(player, shipName) {
        const ship = player.ships.find(s => s.name === shipName);
        return ship && ship.hits >= ship.size;
    }

    checkWin(enemy) {
        return enemy.ships.every(ship => ship.hits >= ship.size);
    }

    triggerExplosion(boardEl, row, col) {
        const cellEl = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cellEl) return;
        
        cellEl.classList.add('exploding');
        
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            explosion.appendChild(particle);
        }
        
        cellEl.appendChild(explosion);
        
        setTimeout(() => {
            explosion.remove();
            cellEl.classList.remove('exploding');
        }, 700);
    }

    triggerDamageFlash() {
        this.damageFlashEl.classList.remove('active');
        void this.damageFlashEl.offsetWidth;
        this.damageFlashEl.classList.add('active');
        
        setTimeout(() => {
            this.damageFlashEl.classList.remove('active');
        }, 400);
    }

    renderCaptures() {
        this.rebelCapturesEl.innerHTML = '';
        this.rebelCaptures.forEach(shipName => {
            const div = document.createElement('div');
            div.className = 'captured-ship';
            div.textContent = shipName;
            this.rebelCapturesEl.appendChild(div);
        });
        
        this.empireCapturesEl.innerHTML = '';
        this.empireCaptures.forEach(shipName => {
            const div = document.createElement('div');
            div.className = 'captured-ship';
            div.textContent = shipName;
            this.empireCapturesEl.appendChild(div);
        });
    }

    showShipDestroyedModal(type, shipName) {
        const isRebel = type === 'rebel';
        const shipList = isRebel ? EMPIRE_SHIPS : REBEL_SHIPS;
        const ship = shipList.find(s => s.name === shipName);
        
        this.modalContent.className = 'modal-content ' + type + ' animating';
        this.modalInsignia.src = isRebel ? 'rebel.svg' : 'empire.svg';
        this.modalTitle.textContent = isRebel ? 'Imperial Ship Destroyed!' : 'Rebel Ship Destroyed!';
        this.modalShipImage.style.backgroundImage = `url('${ship.image}')`;
        this.modalShipName.textContent = ship.name;
        
        this.shipDestroyedModal.classList.remove('hidden');
        
        if (isRebel) {
            this.pendingCallback = () => {
                if (this.checkWin(this.ai)) {
                    this.handleGameOver(true);
                    return;
                }
                this.isPlayerTurn = false;
                this.currentPlayerEl.textContent = "Empire's Turn";
                setTimeout(() => this.aiTurn(), 1000);
            };
        } else {
            this.pendingCallback = () => {
                if (this.checkWin(this.player)) {
                    this.handleGameOver(false);
                    return;
                }
                this.isPlayerTurn = true;
                this.currentPlayerEl.textContent = 'Your Turn';
                this.instructionsEl.textContent = 'Click on enemy airspace to fire!';
                this.renderBoards();
            };
        }
    }

    closeModal() {
        this.shipDestroyedModal.classList.add('hidden');
        if (this.pendingCallback) {
            this.pendingCallback();
            this.pendingCallback = null;
        }
    }

    handleGameOver(playerWon) {
        this.gameOver = true;
        this.recordAction('gameOver', 'system', { winner: playerWon ? 'player' : 'ai' });
        this.lastCompletedGame = {
            actions: [...this.gameActions],
            playerWon: playerWon
        };
        this.winnerMessageEl.textContent = playerWon ? 'The Rebel Alliance Wins!' : 'The Empire Wins!';
        this.saveGameStats(playerWon);
        this.gameOverEl.classList.remove('hidden');
    }

    resetGame() {
        this.player = { board: this.createEmptyBoard(), ships: [], shipsPlaced: 0 };
        this.ai = { board: this.createEmptyBoard(), ships: [], shipsPlaced: 0 };
        this.phase = 'setup';
        this.selectedShip = null;
        this.isHorizontal = true;
        this.gameOver = false;
        this.isPlayerTurn = true;
        this.aiRemainingShips = REBEL_SHIPS.map(s => s.size);
        this.probabilityMap = this.createProbabilityMap();
        this.rebelCaptures = [];
        this.empireCaptures = [];
        this.pendingCallback = null;
        this.playerShots = 0;
        this.playerHits = 0;
        this.gameActions = [];
        this.dragOriginalShip = null;
        this.dragGhost = null;
        this._dragMoveHandler = null;

        this.gameOverEl.classList.add('hidden');
        this.shipSelectionEl.classList.remove('hidden');
        this.renderCaptures();
        
        this.phaseIndicatorEl.textContent = 'Setup Phase';
        this.currentPlayerEl.textContent = 'Your Turn';
        this.instructionsEl.textContent = 'Drag ships to your grid. Press R to rotate. [↔ Horizontal]';

        this.renderShipSelection();
        this.renderBoards();
    }

    getStats() {
        const stats = localStorage.getItem('battleshipStats');
        return stats ? JSON.parse(stats) : { games: [], currentStreak: 0, bestStreak: 0 };
    }

    saveStats(stats) {
        localStorage.setItem('battleshipStats', JSON.stringify(stats));
    }

    saveGameStats(playerWon) {
        const stats = this.getStats();
        const accuracy = this.playerShots > 0 ? Math.round((this.playerHits / this.playerShots) * 100) : 0;
        
        const gameRecord = {
            game: stats.games.length + 1,
            result: playerWon ? 'Win' : 'Loss',
            difficulty: 'Heatmap AI',
            shots: this.playerShots,
            hits: this.playerHits,
            accuracy: accuracy,
            date: new Date().toISOString()
        };
        
        stats.games.push(gameRecord);
        
        if (playerWon) {
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
        } else {
            stats.currentStreak = 0;
        }
        
        this.saveStats(stats);
    }

    showLeaderboard() {
        const stats = this.getStats();
        
        const wins = stats.games.filter(g => g.result === 'Win').length;
        const losses = stats.games.filter(g => g.result === 'Loss').length;
        const total = wins + losses;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        
        this.statWins.textContent = wins;
        this.statLosses.textContent = losses;
        this.statWinrate.textContent = winRate + '%';
        this.statStreak.textContent = stats.bestStreak;
        
        this.renderLeaderboardTable(stats.games);
        this.leaderboardModal.classList.remove('hidden');
    }

    closeLeaderboard() {
        this.leaderboardModal.classList.add('hidden');
    }

    clearStats() {
        if (confirm('Are you sure you want to clear all statistics? This cannot be undone.')) {
            localStorage.removeItem('battleshipStats');
            this.showLeaderboard();
        }
    }

    sortLeaderboard(column) {
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'desc';
        }
        
        document.querySelectorAll('.leaderboard-table th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const currentTh = document.querySelector(`.leaderboard-table th[data-sort="${column}"]`);
        currentTh.classList.add(this.currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        
        const stats = this.getStats();
        this.renderLeaderboardTable(stats.games);
    }

    renderLeaderboardTable(games) {
        this.leaderboardBody.innerHTML = '';
        
        if (games.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="no-games-message">No games played yet. Start a battle!</td>';
            this.leaderboardBody.appendChild(row);
            return;
        }
        
        const sortedGames = [...games].sort((a, b) => {
            let aVal = a[this.currentSortColumn];
            let bVal = b[this.currentSortColumn];
            
            if (this.currentSortColumn === 'result') {
                aVal = aVal === 'Win' ? 1 : 0;
                bVal = bVal === 'Win' ? 1 : 0;
            } else if (this.currentSortColumn === 'difficulty') {
                const order = { 'Easy': 1, 'Moderate': 2, 'Hard': 3, 'Heatmap AI': 4 };
                aVal = order[aVal] || 0;
                bVal = order[bVal] || 0;
            }
            
            if (this.currentSortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        sortedGames.forEach(game => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${game.game}</td>
                <td class="${game.result.toLowerCase()}">${game.result}</td>
                <td class="${game.difficulty.toLowerCase().replace(/\s+/g, '-')}">${game.difficulty}</td>
                <td>${game.shots}</td>
                <td>${game.hits}</td>
                <td>${game.accuracy}%</td>
            `;
            this.leaderboardBody.appendChild(row);
        });
    }

    recordAction(type, actor, data) {
        this.gameActions.push({
            type,
            actor,
            data,
            turn: this.gameActions.filter(a => a.type === 'attack').length + 1,
            timestamp: Date.now()
        });
    }

    showReplay() {
        if (!this.lastCompletedGame) return;
        
        this.isReplayMode = true;
        this.replayIndex = 0;
        this.replayAutoPlay = false;
        this.replayActions = this.lastCompletedGame.actions;
        
        const attackActions = this.replayActions.filter(a => a.type === 'attack');
        this.replayTimeline.max = attackActions.length;
        this.replayTimeline.value = 0;
        
        this.gameOverEl.classList.add('hidden');
        this.replayModal.classList.remove('hidden');
        
        this.renderReplayState(0);
    }

    closeReplay() {
        this.isReplayMode = false;
        if (this.replayInterval) {
            clearInterval(this.replayInterval);
            this.replayInterval = null;
        }
        this.replayModal.classList.add('hidden');
        this.gameOverEl.classList.remove('hidden');
    }

    scrubReplay(turnIndex) {
        this.replayIndex = turnIndex;
        this.renderReplayState(turnIndex);
    }

    replayStep(direction) {
        const attackActions = this.replayActions.filter(a => a.type === 'attack');
        const newIndex = Math.max(0, Math.min(attackActions.length, this.replayIndex + direction));
        this.replayIndex = newIndex;
        this.replayTimeline.value = newIndex;
        this.renderReplayState(newIndex);
    }

    toggleReplayAutoPlay() {
        this.replayAutoPlay = !this.replayAutoPlay;
        
        if (this.replayAutoPlay) {
            this.replayPlayBtn.textContent = '⏸ Pause';
            this.replayPlayBtn.classList.add('playing');
            
            this.replayInterval = setInterval(() => {
                const attackActions = this.replayActions.filter(a => a.type === 'attack');
                if (this.replayIndex >= attackActions.length) {
                    this.toggleReplayAutoPlay();
                    return;
                }
                this.replayStep(1);
            }, 1000);
        } else {
            this.replayPlayBtn.textContent = '▶ Play';
            this.replayPlayBtn.classList.remove('playing');
            
            if (this.replayInterval) {
                clearInterval(this.replayInterval);
                this.replayInterval = null;
            }
        }
    }

    renderReplayState(turnIndex) {
        const playerBoard = this.createEmptyBoard();
        const enemyBoard = this.createEmptyBoard();
        
        const placeActions = this.replayActions.filter(a => a.type === 'place');
        placeActions.forEach(action => {
            const board = action.actor === 'player' ? playerBoard : enemyBoard;
            action.data.cells.forEach(([r, c]) => {
                board[r][c] = { ship: action.data.ship, hit: false };
            });
        });
        
        const attackActions = this.replayActions.filter(a => a.type === 'attack');
        let currentAction = null;
        
        for (let i = 0; i < turnIndex && i < attackActions.length; i++) {
            const action = attackActions[i];
            const board = action.actor === 'player' ? enemyBoard : playerBoard;
            const { row, col } = action.data;
            board[row][col] = { ...board[row][col], hit: true };
            
            if (i === turnIndex - 1) {
                currentAction = action;
            }
        }
        
        this.renderReplayBoard(this.replayPlayerBoard, playerBoard, 'player', currentAction);
        this.renderReplayBoard(this.replayEnemyBoard, enemyBoard, 'enemy', currentAction);
        
        this.replayTurnLabel.textContent = `Turn ${turnIndex} / ${attackActions.length}`;
        
        if (turnIndex === 0) {
            this.replayActionText.textContent = 'Battle begins...';
        } else if (currentAction) {
            const actor = currentAction.actor === 'player' ? 'Rebel Alliance' : 'Empire';
            const result = currentAction.data.hit ? 
                (currentAction.data.sunk ? `destroyed ${currentAction.data.ship}!` : 'HIT!') : 
                'missed';
            this.replayActionText.textContent = `${actor} fires at ${String.fromCharCode(65 + currentAction.data.col)}${currentAction.data.row + 1} - ${result}`;
        }
        
        const gameOverAction = this.replayActions.find(a => a.type === 'gameOver');
        if (turnIndex === attackActions.length && gameOverAction) {
            const winner = gameOverAction.data.winner === 'player' ? 'Rebel Alliance' : 'Empire';
            this.replayActionText.textContent = `Battle Over! The ${winner} wins!`;
        }
    }

    renderReplayBoard(boardEl, boardData, type, currentAction) {
        boardEl.innerHTML = '';
        
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const cellData = boardData[row][col];
                
                if (cellData.ship) {
                    cell.classList.add('ship');
                }
                
                if (cellData.hit) {
                    if (cellData.ship) {
                        cell.classList.add('hit');
                    } else {
                        cell.classList.add('miss');
                    }
                }
                
                if (currentAction) {
                    const isCurrentCell = currentAction.data.row === row && currentAction.data.col === col;
                    const isTargetBoard = (currentAction.actor === 'player' && type === 'enemy') ||
                                         (currentAction.actor === 'ai' && type === 'player');
                    if (isCurrentCell && isTargetBoard) {
                        cell.classList.add('current-action');
                    }
                }
                
                boardEl.appendChild(cell);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BattleshipGame();
});
