// === Telegram ===
let tg = window.Telegram?.WebApp;
let soundEnabled = true;

// === Игровые переменные ===
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

// === КОРАБЛИ (10×10) ===
const shipSizes = [5, 4, 3, 3, 2, 2, 2, 1, 1, 1];

// === ПРОФИЛЬ ===
let profile = {
    name: 'Капитан',
    avatar: 0,
    rating: 1000,
    wins: 0,
    losses: 0,
    shots: 0,
    hits: 0
};

// === ЗВАНИЯ ===
const ranks = [
    { title: '⚓ Мичман', minRating: 0 },
    { title: '⚓ Лейтенант', minRating: 200 },
    { title: '⚓ Капитан-лейтенант', minRating: 500 },
    { title: '⚓ Капитан 3-го ранга', minRating: 1000 },
    { title: '⚓ Капитан 2-го ранга', minRating: 2000 },
    { title: '⚓ Капитан 1-го ранга', minRating: 4000 },
    { title: '⚓ Контр-адмирал', minRating: 7000 },
    { title: '⚓ Вице-адмирал', minRating: 12000 },
    { title: '⚓ Адмирал', minRating: 20000 },
    { title: '⚓ Гранд-адмирал', minRating: 50000 }
];

// === ВЕРФЬ ===
let shipyard = {
    ships: [
        { id: 1, name: '🛳 Фрегат', level: 1, damage: 10, hp: 20, price: 0, owned: true },
        { id: 2, name: '🚢 Эсминец', level: 1, damage: 15, hp: 30, price: 100, owned: false },
        { id: 3, name: '⛴ Крейсер', level: 1, damage: 25, hp: 40, price: 300, owned: false },
        { id: 4, name: '🛳 Авианосец', level: 1, damage: 40, hp: 60, price: 800, owned: false },
        { id: 5, name: '⚓ Линкор', level: 1, damage: 60, hp: 80, price: 1500, owned: false }
    ]
};

// === МИССИИ ===
let missions = [
    { id: 1, icon: '🏆', title: 'Первая победа', desc: 'Одержать 1 победу в бою', target: 1, progress: 0, completed: false, reward: 50 },
    { id: 2, icon: '🔥', title: 'Морской волк', desc: 'Одержать 10 побед', target: 10, progress: 0, completed: false, reward: 300 },
    { id: 3, icon: '🎯', title: 'Снайпер', desc: 'Сделать 50 выстрелов', target: 50, progress: 0, completed: false, reward: 150 },
    { id: 4, icon: '💥', title: 'Разрушитель', desc: 'Потопить 20 кораблей', target: 20, progress: 0, completed: false, reward: 250 },
    { id: 5, icon: '⚓', title: 'Адмирал', desc: 'Достичь рейтинга 5000', target: 5000, progress: 0, completed: false, reward: 1000 }
];

// === КЛАНЫ ===
let clans = [
    { id: 1, icon: '🏴', name: 'Чёрная борода', members: 45, level: 10 },
    { id: 2, icon: '🏴', name: 'Летучий голландец', members: 32, level: 7 },
    { id: 3, icon: '🏴', name: 'Буревестники', members: 18, level: 4 }
];

// === ЗВУКИ ===
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

// === ЗАГРУЗКА/СОХРАНЕНИЕ ===
function loadProfile() {
    const saved = localStorage.getItem('seaBattleProfile');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            profile = { ...profile, ...p };
        } catch(e) {}
    }
    updateProfileUI();
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

// === ПРОФИЛЬ UI ===
function updateProfileUI() {
    document.getElementById('playerName').textContent = profile.name;
    document.getElementById('playerRating').textContent = profile.rating;
    document.getElementById('winsDisplay').textContent = profile.wins;
    document.getElementById('lossesDisplay').textContent = profile.losses;
    
    const acc = profile.shots > 0 ? Math.round(profile.hits/profile.shots*100) : 0;
    document.getElementById('accuracyDisplay').textContent = acc + '%';
    
    const rank = getRank(profile.rating);
    document.getElementById('playerRank').textContent = rank;
}

function getRank(rating) {
    let current = ranks[0];
    for (let r of ranks) {
        if (rating >= r.minRating) current = r;
    }
    return current.title;
}

// === ВЕРФЬ ===
function renderShipyard() {
    const container = document.getElementById('shipyardList');
    if (!container) return;
    container.innerHTML = '';
    
    shipyard.ships.forEach(ship => {
        const item = document.createElement('div');
        item.className = 'shipyard-item';
        
        const upgradeCost = ship.level * 50 + ship.price;
        const canUpgrade = ship.owned && profile.rating >= upgradeCost;
        const canBuy = !ship.owned && profile.rating >= ship.price;
        
        item.innerHTML = `
            <div class="ship-icon">${ship.name.split(' ')[0]}</div>
            <div class="ship-info">
                <div class="ship-name">${ship.name}</div>
                <div class="ship-level">Уровень ${ship.level} ${ship.owned ? '✅' : '🔒'}</div>
                <div class="ship-stats">⚔️ ${ship.damage} | ❤️ ${ship.hp}</div>
            </div>
            <button class="upgrade-btn" ${!canUpgrade && !canBuy ? 'disabled' : ''}>
                ${ship.owned ? `⬆ ${upgradeCost}⭐` : `Купить ${ship.price}⭐`}
            </button>
        `;
        
        const btn = item.querySelector('.upgrade-btn');
        btn.addEventListener('click', () => upgradeShip(ship.id));
        
        container.appendChild(item);
    });
}

function upgradeShip(id) {
    const ship = shipyard.ships.find(s => s.id === id);
    if (!ship) return;
    
    if (!ship.owned) {
        if (profile.rating < ship.price) {
            alert('Недостаточно рейтинга!');
            return;
        }
        profile.rating -= ship.price;
        ship.owned = true;
        ship.level = 1;
        saveProfile();
        renderShipyard();
        updateProfileUI();
        return;
    }
    
    const cost = ship.level * 50 + ship.price;
    if (profile.rating < cost) {
        alert('Недостаточно рейтинга для улучшения!');
        return;
    }
    
    profile.rating -= cost;
    ship.level++;
    ship.damage = Math.floor(ship.damage * 1.2);
    ship.hp = Math.floor(ship.hp * 1.15);
    saveProfile();
    renderShipyard();
    updateProfileUI();
}

// === МИССИИ ===
function renderMissions() {
    const container = document.getElementById('missionsList');
    if (!container) return;
    container.innerHTML = '';
    
    missions.forEach(mission => {
        const item = document.createElement('div');
        item.className = 'mission-item';
        
        const progress = Math.min(mission.progress, mission.target);
        const done = mission.progress >= mission.target;
        
        item.innerHTML = `
            <div class="mission-icon">${mission.icon}</div>
            <div class="mission-info">
                <div class="mission-title">${mission.title} ${done ? '✅' : ''}</div>
                <div class="mission-desc">${mission.desc}</div>
                <div class="mission-progress">${progress}/${mission.target}</div>
            </div>
            <div class="mission-reward">+${mission.reward}⭐</div>
        `;
        
        container.appendChild(item);
    });
}

function updateMissions() {
    missions.forEach(m => {
        m.completed = m.progress >= m.target;
    });
    renderMissions();
}

function checkMissions(type, value) {
    let completed = false;
    missions.forEach(m => {
        if (m.completed) return;
        
        switch(m.id) {
            case 1:
                if (type === 'win' && profile.wins >= m.target) {
                    m.progress = m.target;
                    completed = true;
                }
                break;
            case 2:
                if (type === 'win' && profile.wins >= m.target) {
                    m.progress = m.target;
                    completed = true;
                }
                break;
            case 3:
                if (type === 'shot' && profile.shots >= m.target) {
                    m.progress = m.target;
                    completed = true;
                }
                break;
            case 4:
                if (type === 'kill' && profile.hits >= m.target) {
                    m.progress = m.target;
                    completed = true;
                }
                break;
            case 5:
                if (type === 'rating' && profile.rating >= m.target) {
                    m.progress = m.target;
                    completed = true;
                }
                break;
        }
        
        if (completed && !m.completed) {
            m.completed = true;
            profile.rating += m.reward;
            saveProfile();
            updateProfileUI();
            alert(`🎉 Миссия выполнена! +${m.reward} рейтинга!`);
        }
    });
    updateMissions();
}

// === КЛАНЫ ===
function renderClans() {
    const container = document.getElementById('clansList');
    if (!container) return;
    container.innerHTML = '';
    
    clans.forEach(clan => {
        const item = document.createElement('div');
        item.className = 'clan-item';
        
        item.innerHTML = `
            <div class="clan-icon">${clan.icon}</div>
            <div class="clan-info">
                <div class="clan-name">${clan.name}</div>
                <div class="clan-members">👥 ${clan.members} участников</div>
                <div class="clan-level">⭐ Уровень ${clan.level}</div>
            </div>
            <button class="join-btn">Вступить</button>
        `;
        
        item.querySelector('.join-btn').addEventListener('click', () => {
            alert(`Вы вступили в клан "${clan.name}"!`);
        });
        
        container.appendChild(item);
    });
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
        while (!placed && attempts < 2000) {
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
    if (id === 'clans') renderClans();
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
    updateProfileUI();
}

function render() {
    const p1Board = document.getElementById('playerBoard');
    const p2Board = document.getElementById('enemyBoard');
    
    const maxWidth = Math.min(window.innerWidth * 0.42, 190);
    const maxHeight = Math.min(window.innerHeight * 0.42, 280);
    const containerSize = Math.min(maxWidth, maxHeight);
    const cellSize = Math.max(14, Math.floor((containerSize - (SIZE - 1) * 2) / SIZE));
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
            // Игрок
            let cell1 = document.createElement('div');
            cell1.className = 'cell';
            let val = playerBoard[r][c];
            
            if (val === 1) {
                cell1.classList.add('ship');
                let size = 1;
                let hCount = 1;
                for (let i = c + 1; i < SIZE && playerBoard[r][i] === 1; i++) hCount++;
                for (let i = c - 1; i >= 0 && playerBoard[r][i] === 1; i--) hCount++;
                let vCount = 1;
                for (let i = r + 1; i < SIZE && playerBoard[i][c] === 1; i++) vCount++;
                for (let i = r - 1; i >= 0 && playerBoard[i][c] === 1; i--) vCount++;
                size = Math.max(hCount, vCount);
                if (size > 1) cell1.dataset.size = Math.min(size, 5);
            } else if (val === 2) {
                cell1.classList.add('hit');
                cell1.textContent = '✕';
            } else if (val === 3) {
                cell1.classList.add('miss');
            }
            p1Board.appendChild(cell1);
            
            // Враг
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
    if (gameOver) return;
    if (!isPlayerTurn) return;
    if (enemyVisible[row][col] !== 0) {
        document.getElementById('status').textContent = 'Сюда уже стреляли!';
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        return;
    }
    
    moves++;
    currentGameShots++;
    profile.shots++;
    
    if (enemyBoard[row][col] === 1) {
        enemyBoard[row][col] = 2;
        enemyVisible[row][col] = 2;
        currentGameHits++;
        profile.hits++;
        enemyShips--;
        playSound('hit');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
        document.getElementById('status').textContent = '🔥 ПОПАДАНИЕ! Ещё ход!';
        
        if (enemyShips === 0) {
            gameOver = true;
            profile.wins++;
            profile.rating += 50;
            saveProfile();
            checkMissions('win', 1);
            checkMissions('kill', profile.hits);
            playSound('win');
            showResult(true);
            render();
            updateProfileUI();
            return;
        }
        render();
        updateProfileUI();
        return;
    } else {
        enemyBoard[row][col] = 3;
        enemyVisible[row][col] = 3;
        playSound('miss');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        document.getElementById('status').textContent = '❌ Промах!';
        document.getElementById('turnIndicator').textContent = gameMode === 'pvp' ? '👤2' : '🤖';
        render();
        updateProfileUI();
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
                profile.losses++;
                saveProfile();
                playSound('win');
                showResult(true, 'Игрок 2 победил!');
                render();
                updateProfileUI();
                return;
            }
            document.getElementById('status').textContent = '🔥 Попадание! Ещё ход!';
            render();
            updateProfileUI();
        } else {
            playerBoard[r][c] = 3;
            playSound('miss');
            document.getElementById('status').textContent = '❌ Промах! Ход игрока 1';
            document.getElementById('turnIndicator').textContent = '🎯';
            isPlayerTurn = true;
            render();
            updateProfileUI();
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
    
    if (playerBoard[row][col] === 1) {
        playerBoard[row][col] = 2;
        playerShips--;
        playSound('hit');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
        document.getElementById('status').textContent = `💥 Враг попал в ${String.fromCharCode(65+col)}${row+1}!`;
        if (playerShips === 0) {
            gameOver = true;
            profile.losses++;
            saveProfile();
            playSound('lose');
            showResult(false);
            render();
            updateProfileUI();
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
    updateProfileUI();
}

function showResult(won, message) {
    showScreen('result');
    document.getElementById('resultIcon').textContent = won ? '🏆' : '💀';
    document.getElementById('resultTitle').textContent = won ? 'Победа!' : 'Поражение...';
    document.getElementById('resultDetail').textContent = message || (won ? 'Вы уничтожили все корабли!' : 'Вы проиграли...');
    document.getElementById('resultShots').textContent = currentGameShots;
    const acc = currentGameShots > 0 ? Math.round(currentGameHits/currentGameShots*100) : 0;
    document.getElementById('resultAccuracy').textContent = acc + '%';
    document.getElementById('resultRatingChange').textContent = won ? '+50' : '+0';
}

function closeResult() {
    showScreen('game');
    resetGame();
}

function shareResult() {
    const text = `⚓ Морской бой\nВыстрелов: ${currentGameShots}\nТочность: ${Math.round(currentGameHits/currentGameShots*100)}%\nПобед: ${profile.wins}\nПоражений: ${profile.losses}`;
    if (tg) {
        tg.sendData(JSON.stringify({ type: 'share', text: text }));
    } else if (navigator.share) {
        navigator.share({ title: 'Морской бой', text: text });
    } else {
        alert(text);
    }
}

function shareScore() {
    const text = `⚓ Морской бой\n🏆 Побед: ${profile.wins}\n💀 Поражений: ${profile.losses}\n⭐ Рейтинг: ${profile.rating}`;
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

// === СМЕНА АВАТАРА ===
function changeAvatar() {
    const avatars = [
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%232a6aaa"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%234a8aca"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 65 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%23aa2a2a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ca4a4a"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 55 Q50 40 65 55" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%232aaa6a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%234acaaa"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 65 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%23aa6a2a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ca8a4a"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 60 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E'
    ];
    
    profile.avatar = (profile.avatar + 1) % avatars.length;
    document.getElementById('avatarImg').src = avatars[profile.avatar];
    saveProfile();
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    loadSettings();
    updateProfileUI();
    
    document.getElementById('btnVsAI').addEventListener('click', () => startGame('ai'));
    document.getElementById('btnVsPlayer').addEventListener('click', () => startGame('pvp'));
    document.getElementById('btnShipyard').addEventListener('click', () => showScreen('shipyard'));
    document.getElementById('btnMissions').addEventListener('click', () => showScreen('missions'));
    document.getElementById('btnClans').addEventListener('click', () => showScreen('clans'));
    document.getElementById('btnSettings').addEventListener('click', () => showScreen('settings'));
    document.getElementById('btnTutorial').addEventListener('click', () => showScreen('tutorial'));
    document.getElementById('btnShare').addEventListener('click', shareScore);
    
    document.getElementById('backToMenu').addEventListener('click', backToMenu);
    document.getElementById('btnReset').addEventListener('click', resetGame);
    document.getElementById('btnSound').addEventListener('click', toggleSound);
    document.getElementById('avatarEdit').addEventListener('click', changeAvatar);
    
    document.getElementById('closeSettings').addEventListener('click', function() {
        saveSettings();
        showScreen('menu');
    });
    document.getElementById('closeShipyard').addEventListener('click', () => showScreen('menu'));
    document.getElementById('closeMissions').addEventListener('click', () => showScreen('menu'));
    document.getElementById('closeClans').addEventListener('click', () => showScreen('menu'));
    
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
            } else if (document.getElementById('shipyard').classList.contains('active')) {
                showScreen('menu');
            } else if (document.getElementById('missions').classList.contains('active')) {
                showScreen('menu');
            } else if (document.getElementById('clans').classList.contains('active')) {
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
    
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (document.getElementById('game').classList.contains('active')) {
                render();
            }
        }, 300);
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
