const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// BGMの設定
const bgm = new Audio('bgm/bgm.mp3');
bgm.loop = true;

const arena = createMatrix(10, 20);

const colors = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF',
];

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null,
    score: 0,
    lines: 0
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameStarted = false;
let gameOver = false;
let dropSpeedIncreaseCounter = 0;

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000'; // 背景を黒で塗りつぶす
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 }); // 既存のブロックを描画
    drawMatrix(player.matrix, player.pos); // 現在のブロックを描画
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        updateIllustration();
        dropSpeedIncreaseCounter++;
        if (dropSpeedIncreaseCounter >= 10) {
            dropInterval *= 0.9;
            dropSpeedIncreaseCounter = 0;
        }
        if (gameOver) {
            saveScore(player.score);
            updateRanking();
            showGameOver();
            bgm.pause();
            bgm.currentTime = 0; // 再生位置をリセット
            return;
        }
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    if (player.next === null) {
        player.next = createPiece('TJLOSZI'[Math.random() * 7 | 0]);
    }
    player.matrix = player.next;
    player.next = createPiece('TJLOSZI'[Math.random() * 7 | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        gameOver = true;
        gameStarted = false;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 100;
        rowCount *= 2;
        player.lines++;
    }
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

function update(time = 0) {
    if (!gameStarted) return;

    const deltaTime = time - lastTime;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    lastTime = time;

    draw();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 81) { // Q key for starting and rotating left
        if (!gameStarted) {
            startGame();
            bgm.play();
        } else {
            playerRotate(-1);
        }
    } else if (event.keyCode === 87) { // W key for rotating right
        playerRotate(1);
    }
});

function updateIllustration() {
    const illustration = document.getElementById('illustration');
    if (player.score >= 16000) {
        illustration.src = 'gall/gall05.jpg';
    } else if (player.score >= 8000) {
        illustration.src = 'gall/gall04.jpg';
    } else if (player.score >= 4000) {
        illustration.src = 'gall/gall03.jpg';
    } else if (player.score >= 2000) {
        illustration.src = 'gall/gall02.jpg';
    } else if (player.score >= 1000) {
        illustration.src = 'gall/gall01.jpg';
    } else {
        illustration.src = 'gall/gall01.jpg';
    }
}

function showGameOver() {
    const gameOverElement = document.getElementById('game-over');
    gameOverElement.style.display = 'block';
    document.getElementById('final-score').innerText = player.score;
}

function startGame() {
    gameStarted = true;
    gameOver = false;
    dropInterval = 1000;
    player.score = 0;
    player.lines = 0;
    document.getElementById('game-over').style.display = 'none';
    arena.forEach(row => row.fill(0));
    playerReset();
    update();
}

function resizeCanvas() {
    const container = document.querySelector('.tetris-container');
    const aspectRatio = 1 / 2; // 1:2
    const containerAspectRatio = container.clientWidth / container.clientHeight;

    let newWidth, newHeight;
    if (aspectRatio > containerAspectRatio) {
        newWidth = container.clientWidth;
        newHeight = newWidth / aspectRatio;
    } else {
        newHeight = container.clientHeight;
        newWidth = newHeight * aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    const scale = newWidth / 10; // 1セルの幅
    context.setTransform(scale, 0, 0, scale, 0, 0); // スケールを設定
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 初回ロード時にはゲームはスタートしない
draw();

function saveScore(score) {
    const fs = require('fs');
    let scores;
    try {
        scores = JSON.parse(fs.readFileSync('tetris.date'));
    } catch (err) {
        scores = [];
    }
    scores.push(score);
    scores.sort((a, b) => b - a);
    scores = scores.slice(0, 10); // 上位10件を保持
    fs.writeFileSync('tetris.date', JSON.stringify(scores));
}

function updateRanking() {
    const ranking = document.getElementById('ranking');
    ranking.innerHTML = '';
    const fs = require('fs');
    let scores;
    try {
        scores = JSON.parse(fs.readFileSync('tetris.date'));
    } catch (err) {
        scores = [];
    }
    scores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${score}`;
        ranking.appendChild(li);
    });
}
