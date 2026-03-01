# Logan
Cognition Battleship Challenge
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Star Wars: Fleet Battle</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="galaxy-bg">
        <div class="stars-layer"></div>
        <div class="comet comet-1"></div>
        <div class="comet comet-2"></div>
        <div class="comet comet-3"></div>
        <div class="spaceship spaceship-1"></div>
        <div class="spaceship spaceship-2"></div>
    </div>
    <div id="damage-flash"></div>
    <div class="game-container">
        <h1>Star Wars: Fleet Battle</h1>

        
        <div id="game-info">
            <div id="phase-indicator">Setup Phase</div>
            <div id="instructions">Drag ships to your grid. Press R to rotate. [↔ Horizontal]</div>
            <button id="leaderboard-btn">📊 Stats</button>
        </div>

        <div id="current-player">Your Turn</div>

        <div id="game-boards">
            <div class="fleet-section rebel-section">
                <div class="ships-captured">
                    <h3>Imperial Ships Destroyed</h3>
                    <div id="rebel-captures" class="captures-list"></div>
                </div>
                <div class="board-container">
                    <h2>Rebel Alliance Fleet</h2>
                    <div id="player-board" class="board"></div>
                </div>
            </div>
            <div class="fleet-section empire-section">
                <div class="board-container">
                    <h2>Imperial Fleet</h2>
                    <div id="enemy-board" class="board"></div>
                </div>
                <div class="ships-captured">
                    <h3>Rebel Ships Destroyed</h3>
                    <div id="empire-captures" class="captures-list"></div>
                </div>
            </div>
        </div>

        <div id="ship-selection">
            <h3>Rebel Ships to Deploy:</h3>
            <div id="ships-list"></div>
            <button id="confirm-placement-btn" class="hidden">Confirm Fleet Deployment</button>
        </div>

        <div id="game-over" class="hidden">
            <div class="game-over-content">
                <h2 id="winner-message">Player 1 Wins!</h2>
                <div class="game-over-buttons">
                    <button id="play-again-btn">Play Again</button>
                    <button id="watch-replay-btn">Watch Replay</button>
                </div>
            </div>
        </div>

        <div id="replay-modal" class="hidden">
            <div class="replay-content">
                <h2>Battle Replay</h2>
                <div class="replay-boards">
                    <div class="replay-board-section">
                        <h3>Rebel Alliance Fleet</h3>
                        <div id="replay-player-board" class="board replay-board"></div>
                    </div>
                    <div class="replay-board-section">
                        <h3>Imperial Fleet</h3>
                        <div id="replay-enemy-board" class="board replay-board"></div>
                    </div>
                </div>
                <div id="replay-action-text">Battle begins...</div>
                <div class="replay-controls">
                    <div class="replay-timeline-container">
                        <span id="replay-turn-label">Turn 0</span>
                        <input type="range" id="replay-timeline" min="0" max="100" value="0">
                    </div>
                    <div class="replay-buttons">
                        <button id="replay-prev-btn">⏮ Prev</button>
                        <button id="replay-play-btn">▶ Play</button>
                        <button id="replay-next-btn">Next ⏭</button>
                        <button id="close-replay-btn">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="leaderboard-modal" class="hidden">
            <div class="leaderboard-content">
                <h2>Battle Statistics</h2>
                <div class="stats-summary">
                    <div class="stat-card">
                        <span class="stat-value" id="stat-wins">0</span>
                        <span class="stat-label">Wins</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="stat-losses">0</span>
                        <span class="stat-label">Losses</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="stat-winrate">0%</span>
                        <span class="stat-label">Win Rate</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="stat-streak">0</span>
                        <span class="stat-label">Best Streak</span>
                    </div>
                </div>
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th data-sort="game" class="sortable">Game #</th>
                            <th data-sort="result" class="sortable">Result</th>
                            <th data-sort="difficulty" class="sortable">Difficulty</th>
                            <th data-sort="shots" class="sortable">Shots</th>
                            <th data-sort="hits" class="sortable">Hits</th>
                            <th data-sort="accuracy" class="sortable">Accuracy</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboard-body">
                    </tbody>
                </table>
                <div class="leaderboard-actions">
                    <button id="clear-stats-btn">Clear Stats</button>
                    <button id="close-leaderboard-btn">Close</button>
                </div>
            </div>
        </div>

        <div id="ship-destroyed-modal" class="hidden">
            <div class="modal-content">
                <img id="modal-insignia" src="" alt="">
                <h2 id="modal-title">Ship Destroyed!</h2>
                <div id="modal-ship-image">
                    <div class="ship-explosion-effect"></div>
                    <div class="explosion-debris"></div>
                    <div class="explosion-debris"></div>
                    <div class="explosion-debris"></div>
                    <div class="explosion-debris"></div>
                    <div class="explosion-debris"></div>
                    <div class="explosion-debris"></div>
                </div>
                <h3 id="modal-ship-name"></h3>
                <button id="modal-continue-btn">Continue</button>
            </div>
        </div>
    </div>

    <script src="game.js"></script>
</body>
</html>
