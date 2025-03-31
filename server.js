const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let players = {};

app.use(express.static(path.join(__dirname)));

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  players[socket.id] = { x: 0, y: 1, z: 0, health: 100 };
  io.emit("update", players);

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      io.emit("update", players);
    }
  });

  socket.on("shoot", (data) => {
    io.emit("shot", { ...data, shooter: socket.id });
  });

  socket.on("hit", (data) => {
    Object.keys(players).forEach((id) => {
      if (players[id].id === data.target) {
        players[id].health -= data.damage;
        io.to(id).emit("damage", data.damage);
        if (players[id].health <= 0) {
          delete players[id];
        }
      }
    });
    io.emit("update", players);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit("update", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
