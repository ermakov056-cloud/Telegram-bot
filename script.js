// === Telegram ===
var tg = window.Telegram?.WebApp;
var soundEnabled = true;

// === ИГРОВЫЕ ПЕРЕМЕННЫЕ ===
var SIZE = 10;
var difficulty = 'medium';
var gameMode = 'ai';
var playerBoard, enemyBoard, enemyVisible;
var playerShips, enemyShips;
var gameOver = false;
var isPlayerTurn = true;
var moves = 0;
var currentGameShots = 0;
var currentGameHits = 0;

// === КОРАБЛИ ===
var shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

// === ПРОФИЛЬ ===
var profile = {
    name: 'Капитан',
    rating: 1000,
    wins: 0,
    losses: 0,
    shots: 0,
    hits: 0
};

var ranks = [
    { title: '⚓ Мичман', minRating: 0 },
    { title: '⚓ Лейтенант', minRating: 200 },
    { title: '⚓ Капитан-лейтенант', minRating: 500 },
    { title: '⚓ Капитан 3-го ранга', minRating: 1000 },
    { title: '⚓ Капитан 2-го ранга', minRating: 2000 },
    { title: '⚓ Капитан 1-го ранга', minRating: 4000 }
];

// === СКИНЫ ===
var currentSkin = 0;
var skinList = [
    { id: 0, name: 'Стандартный', icon: '🚢', price: 0, owned: true },
    { id: 1, name: 'Золотой', icon: '✨', price: 500, owned: false },
    { id: 2, name: 'Бронзовый', icon: '🏅', price: 300, owned: false },
    { id: 3, name: 'Стальной', icon: '⚓', price: 400, owned: false },
    { id: 4, name: 'Пиратский', icon: '🏴', price: 800, owned: false }
];

// === ВЕРФЬ ===
var shipyard = {
    ships: [
        { id: 1, name: '🛳 Фрегат', level: 1, damage: 10, hp: 20, price: 0, owned: true },
        { id: 2, name: '🚢 Эсминец', level: 1, damage: 15, hp: 30, price: 100, owned: false },
        { id: 3, name: '⛴ Крейсер', level: 1, damage: 25, hp: 40, price: 300, owned: false },
        { id: 4, name: '⚓ Линкор', level: 1, damage: 60, hp: 80, price: 1500, owned: false }
    ]
};

// === МИССИИ ===
var missions = [
    { id: 1, icon: '🏆', title: 'Первая победа', desc: 'Одержать 1 победу', progress: 0, target: 1, reward: 50 },
    { id: 2, icon: '🔥', title: 'Морской волк', desc: 'Одержать 10 побед', progress: 0, target: 10, reward: 300 },
    { id: 3, icon: '🎯', title: 'Снайпер', desc: 'Сделать 50 выстрелов', progress: 0, target: 50, reward: 150 }
];

// === ЗВУКИ ===
var audioCtx = null;

function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
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
        } else if (type === 'win') {
            [523, 659, 784].forEach(function(freq, i) {
                var o = audioCtx.createOscillator();
                var g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
                g.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.15);
                g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.15 + 0.2);
                o.start(audioCtx.currentTime + i * 0.15);
                o.stop(audioCtx.currentTime + i * 0.15 + 0.2);
            });
        }
    } catch(e) {}
}

// === ЗАГРУЗКА/СОХРАНЕНИЕ ===
function loadProfile() {
    var saved = localStorage.getItem('seaBattleProfile');
    if (saved) {
        try {
            var p = JSON.parse(saved);
            profile = { ...profile, ...p };
            if (p.currentSkin !== undefined) currentSkin = p.currentSkin;
        } catch(e) {}
    }
    updateUI();
}

function saveProfile() {
    var data = { ...profile, currentSkin: currentSkin };
    localStorage.setItem('seaBattleProfile', JSON.stringify(data));
}

function loadSettings() {
    var saved = localStorage.getItem('seaBattleSettings');
    if (saved) {
        var s = JSON.parse(saved);
        SIZE = s.size || 10;
        difficulty = s.difficulty || 'medium';
        soundEnabled = s.soundEnabled !== undefined ? s.soundEnabled : true;
        document.getElementById('sizeSelect').value = SIZE;
        document.getElementById('difficultySelect').value = difficulty;
        document.getElementById('soundToggle').checked = soundEnabled;
    }
}

function saveSettings() {
    var settings = {
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
    var acc = profile.shots > 0 ? Math.round(profile.hits/profile.shots*100) : 0;
    document.getElementById('accuracyDisplay').textContent = acc + '%';
    
    var rank = ranks[0];
    for (var i = 0; i < ranks.length; i++) {
        if (profile.rating >= ranks[i].minRating) rank = ranks[i];
    }
    document.getElementById('playerRank').textContent = rank.title;
}

// === ИГРОВАЯ ЛОГИКА ===
function createEmptyBoard() {
    var board = [];
    for (var i = 0; i < SIZE; i++) {
        board.push([]);
        for (var j = 0; j < SIZE; j++) {
            board[i].push(0);
        }
    }
    return board;
}

function canPlace(board, row, col, size, horizontal) {
    for (var i = -1; i < size + 1; i++) {
        for (var j = -1; j < 2; j++) {
            var r = row + (horizontal ? i : j);
            var c = col + (horizontal ? j : i);
            if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
                if (board[r][c] !== 0) return false;
            }
        }
    }
    for (var k = 0; k < size; k++) {
        var r = row + (horizontal ? 0 : k);
        var c = col + (horizontal ? k : 0);
        if (r >= SIZE || c >= SIZE) return false;
        if (board[r][c] !== 0) return false;
    }
    return true;
}

function placeShips(board) {
    var ships = shipSizes.slice();
    for (var s = 0; s < ships.length; s++) {
        var size = ships[s];
        var placed = false;
        var attempts = 0;
        while (!placed && attempts < 1000) {
            attempts++;
            var row = Math.floor(Math.random() * SIZE);
            var col = Math.floor(Math.random() * SIZE);
            var horizontal = Math.random() > 0.5;
            if (canPlace(board, row, col, size, horizontal)) {
                for (var k = 0; k < size; k++) {
                    board[row + (horizontal ? 0 : k)][col + (horizontal ? k : 0)] = 1;
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
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
        screens[i].classList.remove('active');
    }
    document.getElementById(id).classList.add('active');
    if (id === 'shipyard') renderShipyard();
    if (id === 'missions') renderMissions();
    if (id === 'skins') renderSkins();
}

function startGame(mode) {
    gameMode = mode;
    if (tg) tg.expand();
    showScreen('game');
    document.getElementById('enemyBoardTitle').textContent = mode === 'pvp' ? '👥 Игрок 2' : '🌊 Акватория';
    document.getElementById('gameTitle').textContent = mode === 'pvp' ? '👥 2 игрока' : '⚔️ Против ИИ';
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
    
    playerShips = 0;
    for (var i = 0; i < shipSizes.length; i++) {
        playerShips += shipSizes[i];
    }
    enemyShips = playerShips;
    gameOver = false;
    isPlayerTurn = true;
    moves = 0;
    currentGameShots = 0;
    currentGameHits = 0;
    
    document.getElementById('status').textContent = '🌊 Нажми на клетку чтобы выстрелить';
    document.getElementById('turnIndicator').textContent = '🎯';
    document.getElementById('moveCounter').textContent = '0';
    render();
}

function getShipSize(row, col, board) {
    var hCount = 1;
    for (var i = col + 1; i < SIZE && board[row][i] === 1; i++) hCount++;
    for (var i = col - 1; i >= 0 && board[row][i] === 1; i--) hCount++;
    var vCount = 1;
    for (var i = row + 1; i < SIZE && board[i][col] === 1; i++) vCount++;
    for (var i = row - 1; i >= 0 && board[i][col] === 1; i--) vCount++;
    var size = Math.max(hCount, vCount);
    if (size > 4) size = 4;
    return size;
}

function render() {
    var p1Board = document.getElementById('playerBoard');
    var p2Board = document.getElementById('enemyBoard');
    
    // Расчёт размера
    var boardContainer = document.querySelector('.board-container');
    var containerWidth = boardContainer ? boardContainer.clientWidth - 6 : 160;
    if (containerWidth < 100) containerWidth = 140;
    
    var cellSize = Math.floor((containerWidth - (SIZE - 1) * 2) / SIZE);
    if (cellSize < 14) cellSize = 14;
    if (cellSize > 32) cellSize = 32;
    
    if (window.innerWidth < 400) cellSize = Math.min(cellSize, 26);
    if (window.innerWidth < 380) cellSize = Math.min(cellSize, 22);
    if (window.innerWidth < 350) cellSize = Math.min(cellSize, 18);
    if (window.innerWidth < 330) cellSize = Math.min(cellSize, 16);
    
    var gridSize = cellSize * SIZE + (SIZE - 1) * 2;
    var gridTemplate = 'repeat(' + SIZE + ', ' + cellSize + 'px)';
    
    p1Board.style.gridTemplateColumns = gridTemplate;
    p1Board.style.gridTemplateRows = gridTemplate;
    p1Board.style.width = gridSize + 'px';
    p1Board.style.height = gridSize + 'px';
    p1Board.style.maxWidth = '100%';
    p1Board.style.maxHeight = '100%';
    
    p2Board.style.gridTemplateColumns = gridTemplate;
    p2Board.style.gridTemplateRows = gridTemplate;
    p2Board.style.width = gridSize + 'px';
    p2Board.style.height = gridSize + 'px';
    p2Board.style.maxWidth = '100%';
    p2Board.style.maxHeight = '100%';
    
    p1Board.innerHTML = '';
    p2Board.innerHTML = '';
    
    var skinClass = '';
    if (currentSkin === 1) skinClass = 'skin-gold';
    else if (currentSkin === 2) skinClass = 'skin-bronze';
    else if (currentSkin === 3) skinClass = 'skin-steel';
    else if (currentSkin === 4) skinClass = 'skin-pirate';
    
    for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
            // Своё поле
            var cell1 = document.createElement('div');
            cell1.className = 'cell';
            cell1.dataset.row = r;
            cell1.dataset.col = c;
            
            var val = playerBoard[r][c];
            if (val === 1) {
                cell1.classList.add('ship');
                if (skinClass) cell1.classList.add(skinClass);
                var size = getShipSize(r, c, playerBoard);
                cell1.dataset.size = size;
                
                if (size >= 2) {
                    var detail = document.createElement('div');
                    detail.className = 'ship-detail';
                    cell1.appendChild(detail);
                }
                if (size >= 4) {
                    var flag = document.createElement('div');
                    flag.className = 'ship-flag';
                    cell1.appendChild(flag);
                    var bow = document.createElement('div');
                    bow.className = 'ship-bow';
                    cell1.appendChild(bow);
                }
            } else if (val === 2) {
                cell1.classList.add('hit');
            } else if (val === 3) {
                cell1.classList.add('miss');
            }
            p1Board.appendChild(cell1);
            
            // Поле врага
            var cell2 = document.createElement('div');
            cell2.className = 'cell';
            cell2.dataset.row = r;
            cell2.dataset.col = c;
            
            var v = enemyVisible[r][c];
            if (v === 2) {
                cell2.classList.add('hit');
            } else if (v === 3) {
                cell2.classList.add('miss');
            } else {
                cell2.classList.add('fog');
                var crosshair = document.createElement('div');
                crosshair.className = 'crosshair';
                crosshair.innerHTML = 
                    '<div class="circle"></div>' +
                    '<div class="dot"></div>' +
                    '<div class="corner corner-tl"></div>' +
                    '<div class="corner corner-tr"></div>' +
                    '<div class="corner corner-bl"></div>' +
                    '<div class="corner corner-br"></div>';
                cell2.appendChild(crosshair);
            }
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
        document.getElementById('status').textContent = '🏁 Игра окончена! Начни новую';
        return;
    }
    if (!isPlayerTurn) {
        document.getElementById('status').textContent = '⏳ Ход противника...';
        return;
    }
    if (enemyVisible[row][col] !== 0) {
        document.getElementById('status').textContent = '⚠️ Сюда уже стреляли!';
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
        document.getElementById('status').textContent = '💥 ПОПАДАНИЕ! Ещё ход!';
        
        if (enemyShips === 0) {
            gameOver = true;
            profile.wins++;
            profile.rating += 50;
            saveProfile();
            updateUI();
            render();
            playSound('win');
            setTimeout(function() {
                showResult(true);
            }, 400);
            return;
        }
        render();
        updateUI();
        return;
    } else {
        enemyBoard[row][col] = 3;
        enemyVisible[row][col] = 3;
        playSound('miss');
        document.getElementById('status').textContent = '🌊 Промах!';
        document.getElementById('turnIndicator').textContent = '🤖';
        render();
        updateUI();
        isPlayerTurn = false;
        
        setTimeout(function() {
            computerTurn();
        }, 500);
    }
}

// === ХОД КОМПЬЮТЕРА ===
function computerTurn() {
    if (gameOver) return;
    document.getElementById('turnIndicator').textContent = '🤖';
    
    var row, col;
    var attempts = 0;
    do {
        row = Math.floor(Math.random() * SIZE);
        col = Math.floor(Math.random() * SIZE);
        attempts++;
    } while (playerBoard[row][col] !== 0 && attempts < 200);
    
    if (playerBoard[row][col] === 1) {
        playerBoard[row][col] = 2;
        playerShips--;
        playSound('hit');
        var coords = String.fromCharCode(65 + col) + (row + 1);
        document.getElementById('status').textContent = '💥 Враг попал в ' + coords + '!';
        
        if (playerShips === 0) {
            gameOver = true;
            profile.losses++;
            saveProfile();
            render();
            updateUI();
            setTimeout(function() {
                showResult(false);
            }, 400);
            return;
        }
        render();
        setTimeout(function() {
            computerTurn();
        }, 400);
    } else {
        playerBoard[row][col] = 3;
        playSound('miss');
        var coords = String.fromCharCode(65 + col) + (row + 1);
        document.getElementById('status').textContent = '🌊 Враг промахнулся по ' + coords;
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
    var acc = currentGameShots > 0 ? Math.round(currentGameHits / currentGameShots * 100) : 0;
    document.getElementById('resultAccuracy').textContent = acc + '%';
}

function closeResult() {
    showScreen('game');
    resetGame();
}

// === ВЕРФЬ ===
function renderShipyard() {
    var container = document.getElementById('shipyardList');
    if (!container) return;
    container.innerHTML = '';
    
    for (var i = 0; i < shipyard.ships.length; i++) {
        var ship = shipyard.ships[i];
        var item = document.createElement('div');
        item.className = 'shipyard-item';
        var cost = ship.level * 50 + ship.price;
        var canUpgrade = ship.owned && profile.rating >= cost;
        var canBuy = !ship.owned && profile.rating >= ship.price;
        
        var btnText = ship.owned ? '⬆ ' + cost + '⭐' : 'Купить ' + ship.price + '⭐';
        var disabled = (!canUpgrade && !canBuy) ? 'disabled' : '';
        
        item.innerHTML = 
            '<div class="ship-info">' +
                '<div class="ship-name">' + ship.name + '</div>' +
                '<div class="ship-level">Уровень ' + ship.level + ' ' + (ship.owned ? '✅' : '🔒') + ' | ⚔️' + ship.damage + ' ❤️' + ship.hp + '</div>' +
            '</div>' +
            '<button class="upgrade-btn" onclick="upgradeShip(' + ship.id + ')" ' + disabled + '>' + btnText + '</button>';
        container.appendChild(item);
    }
}

window.upgradeShip = function(id) {
    var ship = null;
    for (var i = 0; i < shipyard.ships.length; i++) {
        if (shipyard.ships[i].id === id) {
            ship = shipyard.ships[i];
            break;
        }
    }
    if (!ship) return;
    
    if (!ship.owned) {
        if (profile.rating < ship.price) {
            alert('Недостаточно рейтинга!');
            return;
        }
        profile.rating -= ship.price;
        ship.owned = true;
        ship.level = 1;
    } else {
        var cost = ship.level * 50 + ship.price;
        if (profile.rating < cost) {
            alert('Недостаточно рейтинга!');
            return;
        }
        profile.rating -= cost;
        ship.level++;
        ship.damage = Math.floor(ship.damage * 1.2);
        ship.hp = Math.floor(ship.hp * 1.15);
    }
    saveProfile();
    renderShipyard();
    updateUI();
};

// === СКИНЫ ===
function renderSkins() {
    var container = document.getElementById('skinsList');
    if (!container) return;
    container.innerHTML = '';
    
    for (var i = 0; i < skinList.length; i++) {
        var s = skinList[i];
        var item = document.createElement('div');
        item.className = 'shipyard-item';
        var isOwned = s.owned;
        var isActive = currentSkin === i;
        
        var btnText = isOwned ? (isActive ? '✅ Используется' : 'Использовать') : 'Купить ' + s.price + '⭐';
        var disabled = (isOwned && isActive) ? 'disabled' : '';
        
        item.innerHTML = 
            '<div style="font-size:32px;">' + s.icon + '</div>' +
            '<div class="ship-info">' +
                '<div class="ship-name">' + s.name + (isActive ? ' ✅' : '') + '</div>' +
                '<div class="ship-level">' + (isOwned ? 'Владелец' : 'Цена: ' + s.price + '⭐') + '</div>' +
            '</div>' +
            '<button class="upgrade-btn" onclick="buySkin(' + i + ')" ' + disabled + '>' + btnText + '</button>';
        container.appendChild(item);
    }
}

window.buySkin = function(id) {
    var skin = skinList[id];
    if (!skin) return;
    
    if (skin.owned) {
        currentSkin = id;
        saveProfile();
        renderSkins();
        render();
        return;
    }
    
    if (profile.rating < skin.price) {
        alert('Недостаточно рейтинга! Нужно ' + skin.price + '⭐');
        return;
    }
    
    profile.rating -= skin.price;
    skin.owned = true;
    currentSkin = id;
    saveProfile();
    renderSkins();
    updateUI();
    render();
};

// === МИССИИ ===
function renderMissions() {
    var container = document.getElementById('missionsList');
    if (!container) return;
    container.innerHTML = '';
    
    for (var i = 0; i < missions.length; i++) {
        var m = missions[i];
        var item = document.createElement('div');
        item.className = 'mission-item';
        var progress = Math.min(m.progress, m.target);
        var done = progress >= m.target;
        
        item.innerHTML = 
            '<div class="mission-info">' +
                '<div class="mission-title">' + m.icon + ' ' + m.title + ' ' + (done ? '✅' : '') + '</div>' +
                '<div class="mission-desc">' + m.desc + ' (' + progress + '/' + m.target + ')</div>' +
            '</div>' +
            '<div style="color:#4af;font-size:12px;">+' + m.reward + '⭐</div>';
        container.appendChild(item);
    }
}

// === АВАТАР ===
function changeAvatar() {
    var avatars = [
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%232a6aaa"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%234a8aca"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 65 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%23aa2a2a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%23ca4a4a"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 55 Q50 40 65 55" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E',
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="48" fill="%232aaa6a"/%3E%3Ccircle cx="50" cy="35" r="20" fill="%234acaaa"/%3E%3Ccircle cx="35" cy="30" r="4" fill="%23ffffff"/%3E%3Ccircle cx="65" cy="30" r="4" fill="%23ffffff"/%3E%3Cpath d="M35 50 Q50 65 65 50" stroke="%23ffffff" stroke-width="3" fill="none"/%3E%3C/svg%3E'
    ];
    profile.avatar = (profile.avatar || 0) + 1;
    if (profile.avatar >= avatars.length) profile.avatar = 0;
    document.getElementById('avatarImg').src = avatars[profile.avatar];
    saveProfile();
}

// === ОБРАБОТЧИКИ ===
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('enemyBoard').addEventListener('click', function(e) {
        var cell = e.target.closest('.cell');
        if (!cell) return;
        var row = parseInt(cell.dataset.row);
        var col = parseInt(cell.dataset.col);
        if (isNaN(row) || isNaN(col)) return;
        if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
        makeShot(row, col);
    });
    
    document.getElementById('playerBoard').addEventListener('click', function(e) {
        if (gameMode !== 'pvp') return;
        if (gameOver) return;
        if (isPlayerTurn) return;
        
        var cell = e.target.closest('.cell');
        if (!cell) return;
        var row = parseInt(cell.dataset.row);
        var col = parseInt(cell.dataset.col);
        if (isNaN(row) || isNaN(col)) return;
        if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
        
        if (playerBoard[row][col] === 2 || playerBoard[row][col] === 3) {
            document.getElementById('status').textContent = '⚠️ Сюда уже стреляли!';
            return;
        }
        
        moves++;
        if (playerBoard[row][col] === 1) {
            playerBoard[row][col] = 2;
            playerShips--;
            playSound('hit');
            if (playerShips === 0) {
                gameOver = true;
                profile.losses++;
                saveProfile();
                render();
                updateUI();
                setTimeout(function() {
                    showResult(false);
                }, 300);
                return;
            }
            document.getElementById('status').textContent = '💥 Попадание! Ещё ход!';
            render();
            updateUI();
        } else {
            playerBoard[row][col] = 3;
            playSound('miss');
            document.getElementById('status').textContent = '🌊 Промах! Ход игрока 1';
            document.getElementById('turnIndicator').textContent = '🎯';
            isPlayerTurn = true;
            render();
            updateUI();
        }
    });
});

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    loadSettings();
    updateUI();
    
    document.getElementById('btnVsAI').onclick = function() { startGame('ai'); };
    document.getElementById('btnVsPlayer').onclick = function() { startGame('pvp'); };
    document.getElementById('btnShipyard').onclick = function() { showScreen('shipyard'); };
    document.getElementById('btnSkins').onclick = function() { showScreen('skins'); };
    document.getElementById('btnMissions').onclick = function() { showScreen('missions'); };
    document.getElementById('btnSettings').onclick = function() { showScreen('settings'); };
    document.getElementById('backToMenu').onclick = backToMenu;
    document.getElementById('btnReset').onclick = resetGame;
    document.getElementById('btnSound').onclick = function() {
        soundEnabled = !soundEnabled;
        document.getElementById('soundToggle').checked = soundEnabled;
        if (soundEnabled) playSound('hit');
    };
    document.getElementById('avatarEdit').onclick = changeAvatar;
    document.getElementById('closeSettings').onclick = function() {
        saveSettings();
        showScreen('menu');
    };
    document.getElementById('closeShipyard').onclick = function() { showScreen('menu'); };
    document.getElementById('closeSkins').onclick = function() { showScreen('menu'); };
    document.getElementById('closeMissions').onclick = function() { showScreen('menu'); };
    document.getElementById('closeResult').onclick = closeResult;
    document.getElementById('backToMenuFromResult').onclick = backToMenu;
    
    document.getElementById('sizeSelect').onchange = saveSettings;
    document.getElementById('difficultySelect').onchange = saveSettings;
    document.getElementById('soundToggle').onchange = saveSettings;
    
    if (tg) {
        tg.onEvent('backButtonClicked', function() {
            var active = document.querySelector('.screen.active');
            if (active) {
                if (active.id === 'game') {
                    backToMenu();
                } else if (active.id === 'settings') {
                    saveSettings();
                    showScreen('menu');
                } else if (active.id === 'shipyard' || active.id === 'skins' || active.id === 'missions') {
                    showScreen('menu');
                } else if (active.id === 'result') {
                    showScreen('menu');
                } else {
                    tg.close();
                }
            }
        });
        tg.BackButton.show();
    }
    
    window.addEventListener('resize', function() {
        if (document.getElementById('game').classList.contains('active')) {
            render();
        }
    });
});

// === Тема Telegram ===
if (tg) {
    var theme = tg.themeParams;
    if (theme) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#0a1628');
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#88ddff');
        document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2a6aaa');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#1a1a4a');
    }
}
