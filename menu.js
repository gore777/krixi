// menu.js
let socket;

function initMenu() {
    socket = io("https://krixi-unj3.onrender.com");
}

function selectMode(mode) {
    socket.emit("changeMode", mode);
}

function applyCustomization() {
    const color = document.getElementById("player-color").value.replace("#", "0x");
    const weapon = document.getElementById("player-weapon").value;
    socket.emit("customize", { color: parseInt(color, 16), weapon });
}

function startGame() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("game").style.display = "block";
    initGame();
}

function showScoreboard() {
    document.getElementById("scoreboard").style.display = "block";
    const content = document.getElementById("scoreboard-content");
    content.innerHTML = "";
    Object.keys(player.players).forEach((id) => {
        const p = player.players[id];
        content.innerHTML += `<p>Player ${id}: ${p.kills} kills</p>`;
    });
}

function backToMenu() {
    document.getElementById("scoreboard").style.display = "none";
    document.getElementById("game").style.display = "none";
    document.getElementById("menu").style.display = "block";
}
