import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);
    players[socket.id] = { x: 0, z: 0 };

    io.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    socket.on('move', (data) => {
        players[socket.id] = data;
        io.emit('updatePlayers', players);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

server.listen(3000, () => {
    console.log('Сервер запущен на порту 3000');
});

