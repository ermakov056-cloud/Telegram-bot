// === Telegram интеграция ===
let tg = window.Telegram.WebApp;

// Адаптация под тему Телеграма
function applyTelegramTheme() {
    if (!tg) return;
    const theme = tg.themeParams;
    document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#0a0a2a');
    document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#88ddff');
    document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2a6aaa');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#1a1a4a');
    
    // Цвет фона
    document.body.style.background = theme.bg_color || '#0a0a2a';
}

// === Игровая логика ===
let SIZE = 8;
let difficulty = 'medium';
let showShips = true;
let gameMode = 'ai';
let playerBoard, enemyBoard, enemyVisible, p2Board, p2Visible;
let playerShips, enemyShips, p2Ships;
let gameOver = false;
let isPlayerTurn = true;
let stats = { wins: 0, losses: 0, shots: 0, hits: 0 };
let currentGameShots = 0;
let currentGameHits = 0;
const shipSizes = [3, 2, 2, 1, 1, 1];

// Загрузка настроек
function loadSettings() {
    const saved = localStorage.getItem('seaBattleSettings');
    if (saved) {
        const s = JSON.parse(saved);
        SIZE = s.size || 8;
        difficulty = s.difficulty || 'medium';
        showShips = s.showShips !== undefined ? s.showShips : true;
        document.getElementById('sizeSelect').value = SIZE;
        document.getElementById('difficultySelect').value = difficulty;
        document.getElementById('showShips').checked = showShips;
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
        showShips: document.getElementById('showShips').checked
    };
    localStorage.setItem('seaBattleSettings', JSON.stringify(settings));
    SIZE = settings.size;
    difficulty = settings.difficulty;
    showShips = settings.showShips;
}

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
        while (!placed && attempts < 1000) {
            attempts++;
            let row = Math.floor(Math.random() * SIZE);
            let col = Math.floor(Math.random() * SIZE);
            let horizontal = Math.random() > 0.5;
            if (canPlace(board, row, col, size, horizontal)) {
                for (let i = 0; i < size; i++) {
                    board[row + (horizontal ? 0 : i)][col + (horizontal ? i : 0)] = 1;
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

function startGame(mode) {
    gameMode = mode;
    tg?.expand(); // Разворачиваем приложение на весь экран
    
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('settings').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    
    if (mode === 'pvp') {
        document.getElementById('enemyBoardTitle').textContent = 'Поле игрока 2';
        document.getElementById('gameTitle').textContent = '👥 2 игрока';
    } else {
        document.getElementById('enemyBoardTitle').textContent = 'Поле противника';
        document.getElementById('gameTitle').textContent = '🤖 Против ИИ';
    }
    resetGame();
}

function backToMenu() {
    document.getElementById('game').style.display = 'none';
    document.getElementById('settings').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    tg?.close(); // Сворачиваем приложение
}

function openSettings() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('settings').style.display = 'block';
    loadSettings();
}

function closeSettings() {
    saveSettings();
    document.getElementById('settings').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}

function resetGame() {
    playerBoard = createEmptyBoard();
    enemyBoard = createEmptyBoard();
    enemyVisible = createEmptyBoard();
    placeShips(playerBoard);
    placeShips(enemyBoard);
    
    if (gameMode === 'pvp') {
        p2Board = createEmptyBoard();
        p2Visible = createEmptyBoard();
        placeShips(p2Board);
        p2Ships = shipSizes.reduce((a,b) => a+b, 0);
    }
    
    playerShips = shipSizes.reduce((a,b) => a+b, 0);
    enemyShips = playerShips;
    gameOver = false;
    isPlayerTurn = true;
    currentGameShots = 0;
    currentGameHits = 0;
    document.getElementById('status').textContent = 'Нажми на клетку чтобы выстрелить';
    document.getElementById('turnIndicator').textContent = '🎯';
    render();
    updateStatsDisplay();
}

function render() {
    const p1Board = document.getElementById('playerBoard');
    const p2Board = document.getElementById('enemyBoard');
    const cellSize = Math.min(32, Math.floor(280 / SIZE));
    p1Board.style.gridTemplateColumns = `repeat(${SIZE}, ${cellSize}px)`;
    p2Board.style.gridTemplateColumns = `repeat(${SIZE}, ${cellSize}px)`;
    
    p1Board.innerHTML = '';
    p2Board.innerHTML = '';
    
    const show = showShips || gameOver;
    
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            // Игрок 1
            let cell1 = document.createElement('div');
            cell1.className = 'cell';
            let val = playerBoard[r][c];
            if (val === 1) cell1.classList.add('ship');
            else if (val === 2) { cell1.classList.add('hit'); cell1.textContent = '✕'; }
            else if (val === 3) cell1.classList.add('miss');
            p1Board.appendChild(cell1);
            
            // Враг / Игрок 2
            let cell2 = document.createElement('div');
            cell2.className = 'cell';
            let board = gameMode === 'pvp' ? p2Board : enemyBoard;
            let visible = gameMode === 'pvp' ? p2Visible : enemyVisible;
            let v = visible[r][c];
            if (v === 2) { cell2.classList.add('hit'); cell2.textContent = '✕'; }
            else if (v === 3) cell2.classList.add('miss');
            else if (!gameOver && show && board[r][c] === 1) {
                cell2.classList.add('ship');
            }
            cell2.dataset.row = r;
            cell2.dataset.col = c;
            cell2.onclick = () => makeShot(r, c);
            p2Board.appendChild(cell2);
        }
    }
    
    document.getElementById('p1Ships').textContent = playerShips;
    if (gameMode === 'pvp') {
        document.getElementById('p2Ships').textContent = p2Ships;
    } else {
        document.getElementById('p2Ships').textContent = enemyShips;
    }
}

function makeShot(row, col) {
    if (gameOver || !isPlayerTurn) return;
    
    let board = gameMode === 'pvp' ? p2Board : enemyBoard;
    let visible = gameMode === 'pvp' ? p2Visible : enemyVisible;
    
    if (visible[row][col] !== 0) {
        document.getElementById('status').textContent = 'Сюда уже стреляли!';
        tg?.HapticFeedback.impactOccurred('light'); // Вибрация
        return;
    }
    
    currentGameShots++;
    stats.shots++;
    
    if (board[row][col] === 1) {
        board[row][col] = 2;
        visible[row][col] = 2;
        currentGameHits++;
        stats.hits++;
        tg?.HapticFeedback.impactOccurred('heavy'); // Вибрация при попадании
        
        if (gameMode === 'pvp') {
            p2Ships--;
            if (p2Ships === 0) {
                gameOver = true;
                stats.wins++;
                showResult(true, 'Игрок 1 победил!');
                render();
                updateStatsDisplay();
                return;
            }
        } else {
            enemyShips--;
            if (enemyShips === 0) {
                gameOver = true;
                stats.wins++;
                showResult(true, 'Вы уничтожили все корабли!');
                render();
                updateStatsDisplay();
                return;
            }
        }
        document.getElementById('status').textContent = '🔥 ПОПАДАНИЕ! Ещё ход!';
        render();
        updateStatsDisplay();
        return;
    } else {
        visible[row][col] = 3;
        tg?.HapticFeedback.impactOccurred('light');
        document.getElementById('status').textContent = '❌ Промах!';
        render();
        updateStatsDisplay();
        if (gameMode === 'pvp') {
            isPlayerTurn = false;
            document.getElementById('turnIndicator').textContent = '👤2';
            document.getElementById('status').textContent = 'Ход игрока 2';
            setTimeout(() => pvpTurn2(), 300);
        } else {
            isPlayerTurn = false;
            document.getElementById('turnIndicator').textContent = '🤖';
            setTimeout(() => computerTurn(), 400);
        }
    }
}

function pvpTurn2() {
    if (gameOver) return;
    document.getElementById('status').textContent = 'Игрок 2, твой ход!';
    document.getElementById('turnIndicator').textContent = '👤2';
    
    const tempClick = (r, c) => {
        if (gameOver) return;
        if (playerBoard[r][c] !== 0) {
            document.getElementById('status').textContent = 'Сюда уже стреляли!';
            return;
        }
        if (playerBoard[r][c] === 1) {
            playerBoard[r][c] = 2;
            playerShips--;
            tg?.HapticFeedback.impactOccurred('heavy');
            if (playerShips === 0) {
                gameOver = true;
                stats.losses++;
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
        cell.onclick = () => tempClick(r, c);
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
        } while ((playerBoard[row][col] !== 0 && playerBoard[row][col] !== 1) && attempts < 200);
    } else if (difficulty === 'hard') {
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if ((i + j) % 2 === 0 && playerBoard[i][j] === 0) {
                    row = i; col = j;
                    break;
                }
            }
            if (row !== undefined) break;
        }
        if (row === undefined) {
            row = Math.floor(Math.random() * SIZE);
            col = Math.floor(Math.random() * SIZE);
        }
    } else {
        let found = false;
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                if (playerBoard[i][j] === 2) {
                    for (let [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                        let nr = i+dx, nc = j+dy;
                        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && playerBoard[nr][nc] === 0) {
                            row = nr; col = nc; found = true;
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
            } while (playerBoard[row][col] !== 0 && attempts < 200);
        }
    }
    
    if (playerBoard[row][col] === 1) {
        playerBoard[row][col] = 2;
        playerShips--;
        tg?.HapticFeedback.impactOccurred('heavy');
        document.getElementById('status').textContent = `💥 Враг попал в ${String.fromCharCode(65+col)}${row+1}!`;
        if (playerShips === 0) {
            gameOver = true;
            stats.losses++;
            showResult(false, 'Вы проиграли...');
            render();
            updateStatsDisplay();
            return;
        }
        render();
        setTimeout(() => computerTurn(), 400);
    } else {
        playerBoard[row][col] = 3;
        document.getElementById('status').textContent = `Враг промахнулся по ${String.fromCharCode(65+col)}${row+1}`;
        document.getElementById('turnIndicator').textContent = '🎯';
        isPlayerTurn = true;
        render();
    }
    updateStatsDisplay();
}

function showResult(won, message) {
    document.getElementById('game').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    document.getElementById('resultIcon').textContent = won ? '🏆' : '💀';
    document.getElementById('resultTitle').textContent = won ? 'Победа!' : 'Поражение...';
    document.getElementById('resultDetail').textContent = message;
    document.getElementById('resultShots').textContent = currentGameShots;
    const acc = currentGameShots > 0 ? Math.round(currentGameHits/currentGameShots*100) : 0;
    document.getElementById('resultAccuracy').textContent = acc + '%';
}

function closeResult() {
    document.getElementById('result').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    resetGame();
}

function shareResult() {
    const text = `⚓ Морской бой\nВыстрелов: ${currentGameShots}\nТочность: ${Math.round(currentGameHits/currentGameShots*100)}%\nПобед: ${stats.wins}\nПоражений: ${stats.losses}`;
    if (tg) {
        tg.sendData(JSON.stringify({ type: 'share', text: text }));
    } else {
        navigator.share?.({ title: 'Морской бой', text: text });
    }
}

function shareScore() {
    const text = `⚓ Морской бой\n🏆 Побед: ${stats.wins}\n💀 Поражений: ${stats.losses}\n🎯 Точность: ${stats.shots > 0 ? Math.round(stats.hits/stats.shots*100) : 0}%`;
    if (tg) {
        tg.sendData(JSON.stringify({ type: 'share', text: text }));
    } else {
        navigator.share?.({ title: 'Морской бой', text: text });
    }
}

function toggleColors() {
    showShips = !showShips;
    render();
}

function updateStatsDisplay() {
    document.getElementById('winsDisplay').textContent = stats.wins;
    document.getElementById('lossesDisplay').textContent = stats.losses;
    const acc = stats.shots > 0 ? Math.round(stats.hits/stats.shots*100) : 0;
    document.getElementById('accuracyDisplay').textContent = acc + '%';
    localStorage.setItem('seaBattleStats', JSON.stringify(stats));
}

// Инициализация
applyTelegramTheme();
loadSettings();
updateStatsDisplay();

// Обработка кнопки "Назад" в Телеграме
tg?.onEvent('backButtonClicked', () => {
    if (document.getElementById('game').style.display === 'block') {
        backToMenu();
    } else if (document.getElementById('settings').style.display === 'block') {
        closeSettings();
    } else {
        tg?.close();
    }
});

// Показываем кнопку назад в Телеграме
tg?.BackButton.show();
