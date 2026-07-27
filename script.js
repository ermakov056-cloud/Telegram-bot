// === Telegram ===
let tg = window.Telegram?.WebApp;
let soundEnabled = true;

// === Игровые переменные ===
let SIZE = 12;
let difficulty = 'medium';
let gameMode = 'ai';
let playerBoard, enemyBoard, enemyVisible;
let playerShips, enemyShips;
let gameOver = false;
let isPlayerTurn = true;
let moves = 0;
let stats = { wins: 0, losses: 0, shots: 0, hits: 0 };
let currentGameShots = 0;
let currentGameHits = 0;

// === КОРАБЛИ ===
const shipSizes = [6, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

// === Звуки ===
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        switch(type) {
            case 'hit':
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.15);
                break;
            case 'miss':
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.12);
                break;
            case 'win':
                [523, 659, 784, 1047].forEach((freq, i) => {
                    const o = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    o.connect(g);
                    g.connect(audioCtx.destination);
                    o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);
                    g.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.12 + 0.2);
                    o.start(audioCtx.currentTime + i * 0.12);
                    o.stop(audioCtx.currentTime + i * 0.12 + 0.2);
                });
                break;
            case 'lose':
                osc.frequency.setValueAtTime(400, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.5);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.5);
                break;
        }
    } catch(e) {}
}

// === Загрузка/сохранение ===
function loadSettings() {
    const saved = localStorage.getItem('seaBattleSettings');
    if (saved) {
        const s = JSON.parse(saved);
        SIZE = s.size || 12;
        difficulty = s.difficulty || 'medium';
        soundEnabled = s.soundEnabled !== undefined ? s.soundEnabled : true;
        document.getElementById('sizeSelect').value = SIZE;
        document.getElementById('difficultySelect').value = difficulty;
        document.getElementById('soundToggle').checked = soundEnabled;
    }
    const statsSaved = localStorage.getItem('seaBattleStats');
    if (statsSaved) {
        stats = JSON.parse(statsSaved);
        updateStatsDisplay();
    }
}

function saveSettings() {
    const settings = {
        size: parseInt(document.getElementById('sizeSelect').value),
        difficulty: document.getElementById('difficultySelect').value,
        soundEnabled: document.getElementById('soundToggle').checked
    };
    localStorage.setItem('seaBattleSettings', JSON.stringify(settings));
    SIZE = settings.size;
    difficulty = settings.difficulty;
    soundEnabled = settings.soundEnabled;
}

// === Игровая логика ===
function createEmptyBoard() {
    return Array.from({length: SIZE}, () => Array(SIZE).fill(0));
}

function canPlace(board, row, col, size, horizontal) {
    for (let i = -1; i < size + 1; i++) {
        for (let j = -1; j < 2; j++) {
            let r = row + (horizontal ? i : j);
            let c = col + (horizontal ? j : i);
            if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
                if (board[r][c] !== 0) return false;
            }
        }
    }
    for (let i = 0; i < size; i++) {
        let r = row + (horizontal ? 0 : i);
        let c = col + (horizontal ? i : 0);
        if (r >= SIZE || c >= SIZE) return false;
        if (board[r][c] !== 0) return false;
    }
    return true;
}

function placeShips(board) {
    let ships = [...shipSizes];
    for (let size of ships) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 2000) {
            attempts++;
            let row = Math.floor(Math.random() * SIZE);
            let col = Math.floor(Math.random() * SIZE);
            let horizontal = Math.random() > 0.5;
            if (canPlace(board, row, col, size, horizontal)) {
                for (let i = 0; i < size; i++) {
                    board[row + (horizontal ? 0 : i)][col + (horizontal ? i : 0)] = 1; // ВСЕГДА 1
                }
                placed = true;
            }
        }
        if (!placed) {
            board = createEmptyBoard();
            return placeShips(board);
        }
    }
    return board;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startGame(mode) {
    gameMode = mode;
    if (tg) tg.expand();
    showScreen('game');
    
    if (mode === 'pvp') {
        document.getElementById('enemyBoardTitle').textContent = '👥 Игрок 2';
        document.getElementById('gameTitle').textContent = '👥 2 игрока';
    } else {
        document.getElementById('enemyBoardTitle').textContent = '🌊 Акватория';
        document.getElementById('gameTitle').textContent = '🤖 Против ИИ';
    }
    resetGame();
}

function backToMenu() {
    showScreen('menu');
    if (tg) tg.close();
}

function resetGame() {
    playerBoard = createEmptyBoard();
    enemyBoard = createEmptyBoard();
    enemyVisible = createEmptyBoard();
    placeShips(playerBoard);
    placeShips(enemyBoard);
    
    playerShips = shipSizes.reduce((a,b) => a+b, 0);
    enemyShips = playerShips;
    gameOver = false;
    isPlayerTurn = true;
    moves = 0;
    currentGameShots = 0;
    currentGameHits = 0;
    
    document.getElementById('status').textContent = 'Нажми на клетку чтобы выстрелить';
    document.getElementById('turnIndicator').textContent = '🎯';
    document.getElementById('moveCounter').textContent = '0';
    render();
    updateStatsDisplay();
}

function render() {
    const p1Board = document.getElementById('playerBoard');
    const p2Board = document.getElementById('enemyBoard');
    
    const containerWidth = Math.min(window.innerWidth * 0.42, 190);
    const cellSize = Math.max(18, Math.floor((containerWidth - (SIZE - 1) * 2) / SIZE));
    const gridSize = cellSize * SIZE + (SIZE - 1) * 2;
    
    p1Board.style.gridTemplateColumns = `repeat(${SIZE}, ${cellSize}px)`;
    p1Board.style.width = gridSize + 'px';
    p1Board.style.height = gridSize + 'px';
    p2Board.style.gridTemplateColumns = `repeat(${SIZE}, ${cellSize}px)`;
    p2Board.style.width = gridSize + 'px';
    p2Board.style.height = gridSize + 'px';
    
    p1Board.innerHTML = '';
    p2Board.innerHTML = '';
    
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            // === ИГРОК (свои корабли видны) ===
            let cell1 = document.createElement('div');
            cell1.className = 'cell';
            let val = playerBoard[r][c];
            
            if (val === 1) {
                cell1.classList.add('ship');
            } else if (val === 2) {
                cell1.classList.add('hit');
                cell1.textContent = '✕';
            } else if (val === 3) {
                cell1.classList.add('miss');
            }
            p1Board.appendChild(cell1);
            
            // === ВРАГ (корабли скрыты) ===
            let cell2 = document.createElement('div');
            cell2.className = 'cell';
            let v = enemyVisible[r][c];
            
            if (v === 2) {
                cell2.classList.add('hit');
                cell2.textContent = '✕';
            } else if (v === 3) {
                cell2.classList.add('miss');
            } else {
                cell2.classList.add('fog');
            }
            
            cell2.dataset.row = r;
            cell2.dataset.col = c;
            cell2.addEventListener('click', function() {
                makeShot(parseInt(this.dataset.row), parseInt(this.dataset.col));
            });
            p2Board.appendChild(cell2);
        }
    }
    
    document.getElementById('p1Ships').textContent = playerShips;
    document.getElementById('p2Ships').textContent = enemyShips;
    document.getElementById('moveCounter').textContent = moves;
}

function makeShot(row, col) {
    console.log('Выстрел по:', row, col);
    
    if (gameOver) {
        console.log('Игра окончена');
        return;
    }
    if (!isPlayerTurn) {
        console.log('Не ваш ход');
        return;
    }
    if (enemyVisible[row][col] !== 0) {
        document.getElementById('status').textContent = 'Сюда уже стреляли!';
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        return;
    }
    
    moves++;
    currentGameShots++;
    stats.shots++;
    
    // Попадание
    if (enemyBoard[row][col] === 1) {
        enemyBoard[row][col] = 2;
        enemyVisible[row][col] = 2;
        currentGameHits++;
        stats.hits++;
        enemyShips--;
        playSound('hit');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
        document.getElementById('status').textContent = '🔥 ПОПАДАНИЕ! Ещё ход!';
        
        if (enemyShips === 0) {
            gameOver = true;
            stats.wins++;
            playSound('win');
            showResult(true);
            render();
            updateStatsDisplay();
            return;
        }
        render();
        updateStatsDisplay();
        return;
    } 
    // Промах
    else {
        enemyBoard[row][col] = 3;
        enemyVisible[row][col] = 3;
        playSound('miss');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        document.getElementById('status').textContent = '❌ Промах!';
        document.getElementById('turnIndicator').textContent = gameMode === 'pvp' ? '👤2' : '🤖';
        render();
        updateStatsDisplay();
        isPlayerTurn = false;
        
        if (gameMode === 'pvp') {
            setTimeout(() => pvpTurn2(), 400);
        } else {
            setTimeout(() => computerTurn(), 500);
        }
    }
}

function pvpTurn2() {
    if (gameOver) return;
    document.getElementById('status').textContent = 'Игрок 2, твой ход!';
    document.getElementById('turnIndicator').textContent = '👤2';
    
    const tempClick = (r, c) => {
        if (gameOver) return;
        if (playerBoard[r][c] === 2 || playerBoard[r][c] === 3) {
            document.getElementById('status').textContent = 'Сюда уже стреляли!';
            return;
        }
        moves++;
        if (playerBoard[r][c] === 1) {
            playerBoard[r][c] = 2;
            playerShips--;
            playSound('hit');
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
            if (playerShips === 0) {
                gameOver = true;
                stats.losses++;
                playSound('win');
                showResult(true, 'Игрок 2 победил!');
                render();
                updateStatsDisplay();
                return;
            }
            document.getElementById('status').textContent = '🔥 Попадание! Ещё ход!';
            render();
            updateStatsDisplay();
        } else {
            playerBoard[r][c] = 3;
            playSound('miss');
            document.getElementById('status').textContent = '❌ Промах! Ход игрока 1';
            document.getElementById('turnIndicator').textContent = '🎯';
            isPlayerTurn = true;
            render();
            updateStatsDisplay();
        }
    };
    
    const cells = document.querySelectorAll('#playerBoard .cell');
    cells.forEach((cell, index) => {
        const r = Math.floor(index / SIZE);
        const c = index % SIZE;
        cell.onclick = function() {
            tempClick(r, c);
        };
        cell.style.cursor = 'pointer';
    });
}

function computerTurn() {
    if (gameOver) return;
    document.getElementById('turnIndicator').textContent = '🤖';
    
    let row, col;
    
    if (difficulty === 'easy') {
        let attempts = 0;
        do {
            row = Math.floor(Math.random() * SIZE);
            col = Math.floor(Math.random() * SIZE);
            attempts++;
        } while ((playerBoard[row][col] !== 0) && attempts < 300);
    } else if (difficulty === 'hard' || difficulty === 'nightmare') {
        // Алгоритм охоты
        let found = false;
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if ((i + j) % 2 === 0 && playerBoard[i][j] === 0) {
                    row = i; col = j;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        if (!found) {
            row = Math.floor(Math.random() * SIZE);
            col = Math.floor(Math.random() * SIZE);
        }
    } else {
        // Средний - добивает подбитые
        let found = false;
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (playerBoard[i][j] === 2) {
                    for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                        let nr = i+dx, nc = j+dy;
                        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && playerBoard[nr][nc] === 0) {
                            row = nr; col = nc;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }
            if (found) break;
        }
        if (!found) {
            let attempts = 0;
            do {
                row = Math.floor(Math.random() * SIZE);
                col = Math.floor(Math.random() * SIZE);
                attempts++;
            } while (playerBoard[row][col] !== 0 && attempts < 300);
        }
    }
    
    // Выстрел компьютера
    if (playerBoard[row][col] === 1) {
        playerBoard[row][col] = 2;
        playerShips--;
        playSound('hit');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
        document.getElementById('status').textContent = `💥 Враг попал в ${String.fromCharCode(65+col)}${row+1}!`;
        if (playerShips === 0) {
            gameOver = true;
            stats.losses++;
            playSound('lose');
            showResult(false);
            render();
            updateStatsDisplay();
            return;
        }
        render();
        setTimeout(() => computerTurn(), 400);
    } else {
        playerBoard[row][col] = 3;
        playSound('miss');
        document.getElementById('status').textContent = `Враг промахнулся по ${String.fromCharCode(65+col)}${row+1}`;
        document.getElementById('turnIndicator').textContent = '🎯';
        isPlayerTurn = true;
        render();
    }
    updateStatsDisplay();
}

function showResult(won, message) {
    showScreen('result');
    document.getElementById('resultIcon').textContent = won ? '🏆' : '💀';
    document.getElementById('resultTitle').textContent = won ? 'Победа!' : 'Поражение...';
    document.getElementById('resultDetail').textContent = message || (won ? 'Вы уничтожили все корабли!' : 'Вы проиграли...');
    document.getElementById('resultShots').textContent = currentGameShots;
    const acc = currentGameShots > 0 ? Math.round(currentGameHits/currentGameShots*100) : 0;
    document.getElementById('resultAccuracy').textContent = acc + '%';
    const rating = acc >= 80 ? '⭐⭐⭐' : acc >= 50 ? '⭐⭐' : '⭐';
    document.getElementById('resultRating').textContent = rating;
}

function closeResult() {
    showScreen('game');
    resetGame();
}

function shareResult() {
    const text = `⚓ Морской бой\nВыстрелов: ${currentGameShots}\nТочность: ${Math.round(currentGameHits/currentGameShots*100)}%\nПобед: ${stats.wins}\nПоражений: ${stats.losses}`;
    if (tg) {
        tg.sendData(JSON.stringify({ type: 'share', text: text }));
    } else if (navigator.share) {
        navigator.share({ title: 'Морской бой', text: text });
    } else {
        alert(text);
    }
}

function shareScore() {
    const text = `⚓ Морской бой\n🏆 Побед: ${stats.wins}\n💀 Поражений: ${stats.losses}\n🎯 Точность: ${stats.shots > 0 ? Math.round(stats.hits/stats.shots*100) : 0}%`;
    if (tg) {
        tg.sendData(JSON.stringify({ type: 'share', text: text }));
    } else if (navigator.share) {
        navigator.share({ title: 'Морской бой', text: text });
    } else {
        alert(text);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggle').checked = soundEnabled;
    if (soundEnabled) playSound('hit');
}

function updateStatsDisplay() {
    document.getElementById('winsDisplay').textContent = stats.wins;
    document.getElementById('lossesDisplay').textContent = stats.losses;
    const acc = stats.shots > 0 ? Math.round(stats.hits/stats.shots*100) : 0;
    document.getElementById('accuracyDisplay').textContent = acc + '%';
    localStorage.setItem('seaBattleStats', JSON.stringify(stats));
}

// === Инициализация ===
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    updateStatsDisplay();
    
    document.getElementById('btnVsAI').addEventListener('click', () => startGame('ai'));
    document.getElementById('btnVsPlayer').addEventListener('click', () => startGame('pvp'));
    document.getElementById('btnSettings').addEventListener('click', () => showScreen('settings'));
    document.getElementById('btnTutorial').addEventListener('click', () => showScreen('tutorial'));
    document.getElementById('btnShare').addEventListener('click', shareScore);
    
    document.getElementById('backToMenu').addEventListener('click', backToMenu);
    document.getElementById('btnReset').addEventListener('click', resetGame);
    document.getElementById('btnSound').addEventListener('click', toggleSound);
    
    document.getElementById('closeSettings').addEventListener('click', function() {
        saveSettings();
        showScreen('menu');
    });
    document.getElementById('sizeSelect').addEventListener('change', saveSettings);
    document.getElementById('difficultySelect').addEventListener('change', saveSettings);
    document.getElementById('soundToggle').addEventListener('change', saveSettings);
    
    document.getElementById('closeTutorial').addEventListener('click', () => showScreen('menu'));
    
    document.getElementById('closeResult').addEventListener('click', closeResult);
    document.getElementById('shareResult').addEventListener('click', shareResult);
    document.getElementById('backToMenuFromResult').addEventListener('click', backToMenu);
    
    if (tg) {
        tg.onEvent('backButtonClicked', function() {
            if (document.getElementById('game').classList.contains('active')) {
                backToMenu();
            } else if (document.getElementById('settings').classList.contains('active')) {
                saveSettings();
                showScreen('menu');
            } else if (document.getElementById('tutorial').classList.contains('active')) {
                showScreen('menu');
            } else if (document.getElementById('result').classList.contains('active')) {
                showScreen('menu');
            } else {
                tg.close();
            }
        });
        tg.BackButton.show();
    }
    
    window.addEventListener('resize', () => {
        if (document.getElementById('game').classList.contains('active')) {
            render();
        }
    });
});

// === Тема Telegram ===
if (tg) {
    const theme = tg.themeParams;
    if (theme) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#0a0e27');
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#88ddff');
        document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2a6aaa');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#1a1a4a');
        document.body.style.background = theme.bg_color || '#0a0e27';
    }
}
