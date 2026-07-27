// === Telegram ===
let tg = window.Telegram?.WebApp;
let soundEnabled = true;

// === ИГРОВЫЕ ПЕРЕМЕННЫЕ ===
let SIZE = 10;
let difficulty = 'medium';
let gameMode = 'ai';
let playerBoard, enemyBoard, enemyVisible;
let playerShips, enemyShips;
let gameOver = false;
let isPlayerTurn = true;
let moves = 0;
let currentGameShots = 0;
let currentGameHits = 0;

const shipSizes = [5, 4, 3, 3, 2, 2, 2, 1, 1, 1];

// === ПРОФИЛЬ ===
let profile = {
    name: 'Капитан',
    rating: 1000,
    wins: 0,
    losses: 0,
    shots: 0,
    hits: 0
};

const ranks = [
    { title: '⚓ Мичман', minRating: 0 },
    { title: '⚓ Лейтенант', minRating: 200 },
    { title: '⚓ Капитан-лейтенант', minRating: 500 },
    { title: '⚓ Капитан 3-го ранга', minRating: 1000 },
    { title: '⚓ Капитан 2-го ранга', minRating: 2000 },
    { title: '⚓ Капитан 1-го ранга', minRating: 4000 }
];

// === ВЕРФЬ ===
let shipyard = {
    ships: [
        { id: 1, name: '🛳 Фрегат', level: 1, damage: 10, hp: 20, price: 0, owned: true },
        { id: 2, name: '🚢 Эсминец', level: 1, damage: 15, hp: 30, price: 100, owned: false },
        { id: 3, name: '⛴ Крейсер', level: 1, damage: 25, hp: 40, price: 300, owned: false },
        { id: 4, name: '⚓ Линкор', level: 1, damage: 60, hp: 80, price: 1500, owned: false }
    ]
};

// === МИССИИ ===
let missions = [
    { id: 1, icon: '🏆', title: 'Первая победа', desc: 'Одержать 1 победу', progress: 0, target: 1, reward: 50 },
    { id: 2, icon: '🔥', title: 'Морской волк', desc: 'Одержать 10 побед', progress: 0, target: 10, reward: 300 },
    { id: 3, icon: '🎯', title: 'Снайпер', desc: 'Сделать 50 выстрелов', progress: 0, target: 50, reward: 150 }
];

// === ЗВУКИ ===
let audioCtx = null;

function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        if (type === 'hit') {
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'miss') {
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.12);
        }
    } catch(e) {}
}

// === ЗАГРУЗКА/СОХРАНЕНИЕ ===
function loadProfile() {
    const saved = localStorage.getItem('seaBattleProfile');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            profile = { ...profile, ...p };
        } catch(e) {}
    }
    updateUI();
}

function saveProfile() {
    localStorage.setItem('seaBattleProfile', JSON.stringify(profile));
}

function loadSettings() {
    const saved = localStorage.getItem('seaBattleSettings');
    if (saved) {
        const s = JSON.parse(saved);
        SIZE = s.size || 10;
        difficulty = s.difficulty || 'medium';
        soundEnabled = s.soundEnabled !== undefined ? s.soundEnabled : true;
        document.getElementById('sizeSelect').value = SIZE;
        document.getElementById('difficultySelect').value = difficulty;
        document.getElementById('soundToggle').checked = soundEnabled;
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

function updateUI() {
    document.getElementById('playerName').textContent = profile.name;
    document.getElementById('playerRating').textContent = profile.rating;
    document.getElementById('winsDisplay').textContent = profile.wins;
    document.getElementById('lossesDisplay').textContent = profile.losses;
    const acc = profile.shots > 0 ? Math.round(profile.hits/profile.shots*100) : 0;
    document.getElementById('accuracyDisplay').textContent = acc + '%';
    
    let rank = ranks[0];
    for (let r of ranks) {
        if (profile.rating >= r.minRating) rank = r;
    }
    document.getElementById('playerRank').textContent = rank.title;
}

// === ИГРОВАЯ ЛОГИКА ===
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

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'shipyard') renderShipyard();
    if (id === 'missions') renderMissions();
}

function startGame(mode) {
    gameMode = mode;
    if (tg) tg.expand();
    showScreen('game');
    document.getElementById('enemyBoardTitle').textContent = mode === 'pvp' ? '👥 Игрок 2' : '🌊 Поле врага';
    document.getElementById('gameTitle').textContent = mode === 'pvp' ? '👥 2 игрока' : '🤖 Против ИИ';
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
}

function render() {
    const p1Board = document.getElementById('playerBoard');
    const p2Board = document.getElementById('enemyBoard');
    
    const containerWidth = Math.min(window.innerWidth * 0.42, 180);
    const containerHeight = Math.min(window.innerHeight * 0.35, 280);
    const containerSize = Math.min(containerWidth, containerHeight);
    const cellSize = Math.max(16, Math.floor((containerSize - (SIZE - 1) * 2) / SIZE));
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
            // Своё поле (корабли видны)
            let cell1 = document.createElement('div');
            cell1.className = 'cell';
            let val = playerBoard[r][c];
            if (val === 1) {
                cell1.classList.add('ship');
                cell1.textContent = '■';
            } else if (val === 2) {
                cell1.classList.add('hit');
                cell1.textContent = '✕';
            } else if (val === 3) {
                cell1.classList.add('miss');
                cell1.textContent = '·';
            } else {
                cell1.textContent = ' ';
            }
            p1Board.appendChild(cell1);
            
            // Поле врага (корабли скрыты)
            let cell2 = document.createElement('div');
            cell2.className = 'cell';
            let v = enemyVisible[r][c];
            if (v === 2) {
                cell2.classList.add('hit');
                cell2.textContent = '✕';
            } else if (v === 3) {
                cell2.classList.add('miss');
                cell2.textContent = '·';
            } else {
                cell2.classList.add('fog');
                cell2.textContent = ' ';
            }
            
            // ВАЖНО: используем onclick вместо addEventListener для iPhone
            cell2.onclick = (function(row, col) {
                return function() {
                    makeShot(row, col);
                };
            })(r, c);
            
            cell2.style.cursor = 'pointer';
            p2Board.appendChild(cell2);
        }
    }
    
    document.getElementById('p1Ships').textContent = playerShips;
    document.getElementById('p2Ships').textContent = enemyShips;
    document.getElementById('moveCounter').textContent = moves;
}

// === ВЫСТРЕЛ ===
function makeShot(row, col) {
    if (gameOver) {
        document.getElementById('status').textContent = 'Игра окончена! Начни новую';
        return;
    }
    if (!isPlayerTurn) {
        document.getElementById('status').textContent = 'Сейчас ход противника...';
        return;
    }
    if (enemyVisible[row][col] !== 0) {
        document.getElementById('status').textContent = 'Сюда уже стреляли!';
        return;
    }
    
    moves++;
    currentGameShots++;
    profile.shots++;
    saveProfile();
    
    if (enemyBoard[row][col] === 1) {
        enemyBoard[row][col] = 2;
        enemyVisible[row][col] = 2;
        currentGameHits++;
        profile.hits++;
        enemyShips--;
        playSound('hit');
        document.getElementById('status').textContent = '🔥 ПОПАДАНИЕ! Ещё ход!';
        
        if (enemyShips === 0) {
            gameOver = true;
            profile.wins++;
            profile.rating += 50;
            saveProfile();
            updateUI();
            render();
            setTimeout(() => showResult(true), 300);
            return;
        }
        render();
        updateUI();
        return;
    } else {
        enemyBoard[row][col] = 3;
        enemyVisible[row][col] = 3;
        playSound('miss');
        document.getElementById('status').textContent = '❌ Промах!';
        document.getElementById('turnIndicator').textContent = '🤖';
        render();
        updateUI();
        isPlayerTurn = false;
        
        setTimeout(() => computerTurn(), 500);
    }
}

// === ХОД КОМПЬЮТЕРА ===
function computerTurn() {
    if (gameOver) return;
    document.getElementById('turnIndicator').textContent = '🤖';
    
    let row, col;
    let attempts = 0;
    do {
        row = Math.floor(Math.random() * SIZE);
        col = Math.floor(Math.random() * SIZE);
        attempts++;
    } while (playerBoard[row][col] !== 0 && attempts < 200);
    
    if (playerBoard[row][col] === 1) {
        playerBoard[row][col] = 2;
        playerShips--;
        playSound('hit');
        document.getElementById('status').textContent = `💥 Враг попал в ${String.fromCharCode(65+col)}${row+1}!`;
        if (playerShips === 0) {
            gameOver = true;
            profile.losses++;
            saveProfile();
            render();
            updateUI();
            setTimeout(() => showResult(false), 300);
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
    updateUI();
}

// === РЕЗУЛЬТАТ ===
function showResult(won) {
    showScreen('result');
    document.getElementById('resultIcon').textContent = won ? '🏆' : '💀';
    document.getElementById('resultTitle').textContent = won ? 'Победа!' : 'Поражение...';
    document.getElementById('resultDetail').textContent = won ? 'Вы уничтожили все корабли!' : 'Вы проиграли...';
    document.getElementById('resultShots').textContent = currentGameShots;
    const acc = currentGameShots > 0 ? Math.round(currentGameHits/currentGameShots*100) : 0;
    document.getElementById('resultAccuracy').textContent = acc + '%';
}

function closeResult() {
    showScreen('game');
    resetGame();
}

// === ВЕРФЬ ===
function renderShipyard() {
    const container = document.getElementById('shipyardList');
    if (!container) return;
    container.innerHTML = '';
    
    shipyard.ships.forEach(ship => {
        const item = document.createElement('div');
        item.className = 'shipyard-item';
        const cost = ship.level * 50 + ship.price;
        const canUpgrade = ship.owned && profile.rating >= cost;
        const canBuy = !ship.owned && profile.rating >= ship.price;
        
        item.innerHTML = `
            <div class="ship-info">
                <div class="ship-name">${ship.name}</div>
                <div class="ship-level">Уровень ${ship.level} ${ship.owned ? '✅' : '🔒'} | ⚔️${ship.damage} ❤️${ship.hp}</div>
            </div>
            <button class="upgrade-btn" ${!canUpgrade && !canBuy ? 'disabled' : ''}>
                ${ship.owned ? `⬆ ${cost}⭐` : `Купить ${ship.price}⭐`}
            </button>
        `;
        
        item.querySelector('.upgrade-btn').onclick = function() {
            if (!ship.owned) {
                if (profile.rating < ship.price) return alert('Недостаточно рейтинга!');
                profile.rating -= ship.price;
                ship.owned = true;
                ship.level = 1;
            } else {
                const c = ship.level * 50 + ship.price;
                if (profile.rating < c) return alert('Недостаточно рейтинга!');
                profile.rating -= c;
                ship.level++;
                ship.damage = Math.floor(ship.damage * 1.2);
                ship.hp = Math.floor(ship.hp * 1.15);
            }
            saveProfile();
            renderShipyard();
            updateUI();
        };
        
        container.appendChild(item);
    });
}

// === МИССИИ ===
function renderMissions() {
    const container = document.getElementById('missionsList');
    if (!container) return;
    container.innerHTML = '';
    
    missions.forEach(m => {
        const item = document.createElement('div');
        item.className = 'mission-item';
        const progress = Math.min(m.progress, m.target);
        const done = progress >= m.target;
        
        item.innerHTML = `
            <div class="mission-info">
                <div class="mission-title">${m.icon} ${m.title} ${done ? '✅' : ''}</div>
                <div class="mission-desc">${m.desc} (${progress}/${m.target})</div>
            </div>
            <div style="color:#4af;font-size:12px;">+${m.reward}⭐</div>
        `;
        container.appendChild(item);
    });
}

// === АВАТАР ===
function changeAvatar() {
    const avatars = [
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%232a6aaa"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%234a8aca"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 65 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%23aa2a2a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ca4a4a"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 55 Q50 40 65 55" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%232aaa6a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%234acaaa"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 65 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E'
    ];
    profile.avatar = (profile.avatar || 0) + 1;
    if (profile.avatar >= avatars.length) profile.avatar = 0;
    document.getElementById('avatarImg').src = avatars[profile.avatar];
    saveProfile();
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    loadSettings();
    updateUI();
    
    // Меню
    document.getElementById('btnVsAI').onclick = () => startGame('ai');
    document.getElementById('btnVsPlayer').onclick = () => startGame('pvp');
    document.getElementById('btnShipyard').onclick = () => showScreen('shipyard');
    document.getElementById('btnMissions').onclick = () => showScreen('missions');
    document.getElementById('btnSettings').onclick = () => showScreen('settings');
    
    // Игра
    document.getElementById('backToMenu').onclick = backToMenu;
    document.getElementById('btnReset').onclick = resetGame;
    document.getElementById('btnSound').onclick = function() {
        soundEnabled = !soundEnabled;
        document.getElementById('soundToggle').checked = soundEnabled;
        if (soundEnabled) playSound('hit');
    };
    document.getElementById('avatarEdit').onclick = changeAvatar;
    
    // Настройки
    document.getElementById('closeSettings').onclick = function() {
        saveSettings();
        showScreen('menu');
    };
    document.getElementById('closeShipyard').onclick = () => showScreen('menu');
    document.getElementById('closeMissions').onclick = () => showScreen('menu');
    document.getElementById('sizeSelect').onchange = saveSettings;
    document.getElementById('difficultySelect').onchange = saveSettings;
    document.getElementById('soundToggle').onchange = saveSettings;
    
    // Результат
    document.getElementById('closeResult').onclick = closeResult;
    document.getElementById('backToMenuFromResult').onclick = backToMenu;
    
    // Telegram
    if (tg) {
        tg.onEvent('backButtonClicked', function() {
            const active = document.querySelector('.screen.active');
            if (active) {
                if (active.id === 'game') backToMenu();
                else if (active.id === 'settings') { saveSettings(); showScreen('menu'); }
                else if (active.id === 'shipyard' || active.id === 'missions') showScreen('menu');
                else if (active.id === 'result') showScreen('menu');
                else tg.close();
            }
        });
        tg.BackButton.show();
    }
    
    // Ресайз
    window.addEventListener('resize', function() {
        if (document.getElementById('game').classList.contains('active')) render();
    });
});

// Тема Telegram
if (tg) {
    const theme = tg.themeParams;
    if (theme) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#0a0e27');
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#88ddff');
        document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2a6aaa');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#1a1a4a');
    }
}
