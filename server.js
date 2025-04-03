// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname)));

let players = {};
let gameMode = "FFA"; // Режим игры: FFA или TDM
let teams = { red: [], blue: [] }; // Для TDM

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Инициализация игрока
  players[socket.id] = {
    x: Math.random() * 20 - 10,
    y: 1,
    z: Math.random() * 20 - 10,
    health: 100,
    kills: 0,
    color: 0xffffff,
    team: null,
    weapon: "pistol",
  };

  // Назначение команды в режиме TDM
  if (gameMode === "TDM") {
    const redCount = teams.red.length;
    const blueCount = teams.blue.length;
    if (redCount <= blueCount) {
      teams.red.push(socket.id);
      players[socket.id].team = "red";
    } else {
      teams.blue.push(socket.id);
      players[socket.id].team = "blue";
    }
  }

  io.emit("update", { players, gameMode, teams });

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      io.emit("update", { players, gameMode, teams });
    }
  });

  socket.on("shoot", (data) => {
    io.emit("shot", { ...data, shooter: socket.id });
  });

  socket.on("hit", (data) => {
    const target = data.target;
    if (players[target]) {
      const shooter = players[data.shooter];
      const targetPlayer = players[target];

      // Проверка на дружественный огонь в TDM
      if (gameMode === "TDM" && shooter.team === targetPlayer.team) {
        return;
      }

      targetPlayer.health -= data.damage;
      if (targetPlayer.health <= 0) {
        shooter.kills += 1;
        targetPlayer.health = 100;
        targetPlayer.x = Math.random() * 20 - 10;
        targetPlayer.z = Math.random() * 20 - 10;
        io.to(target).emit("respawn");
      }
      io.to(target).emit("damage", data.damage);
      io.emit("update", { players, gameMode, teams });
    }
  });

  socket.on("customize", (data) => {
    if (players[socket.id]) {
      players[socket.id].color = data.color;
      players[socket.id].weapon = data.weapon;
      io.emit("update", { players, gameMode, teams });
    }
  });

  socket.on("changeMode", (mode) => {
    gameMode = mode;
    teams = { red: [], blue: [] };
    Object.keys(players).forEach((id) => {
      players[id].team = null;
      players[id].kills = 0;
      players[id].health = 100;
      players[id].x = Math.random() * 20 - 10;
      players[id].z = Math.random() * 20 - 10;
    });
    io.emit("update", { players, gameMode, teams });
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (gameMode === "TDM") {
      teams.red = teams.red.filter((id) => id !== socket.id);
      teams.blue = teams.blue.filter((id) => id !== socket.id);
    }
    delete players[socket.id];
    io.emit("update", { players, gameMode, teams });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
