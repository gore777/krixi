const THREE = window.THREE;
import { io } from 'https://cdn.socket.io/4.5.4/socket.io.esm.min.js';

const socket = io();

// Создание сцены
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Освещение
const light = new THREE.AmbientLight(0xffffff);
scene.add(light);

// Пол (земля)
const geometry = new THREE.PlaneGeometry(50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = Math.PI / 2;
scene.add(plane);

// Игроки
const players = {};

// Подключение нового игрока
socket.on('newPlayer', (data) => {
    const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.set(data.x, 1, data.z);
    scene.add(playerMesh);
    players[data.id] = playerMesh;
});

// Обновление позиций игроков
socket.on('updatePlayers', (data) => {
    Object.keys(data).forEach(id => {
        if (players[id]) {
            players[id].position.set(data[id].x, 1, data[id].z);
        }
    });
});

// Камера
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Управление
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

function updatePlayerMovement() {
    let speed = 0.1;
    if (keys['w']) camera.position.z -= speed;
    if (keys['s']) camera.position.z += speed;
    if (keys['a']) camera.position.x -= speed;
    if (keys['d']) camera.position.x += speed;
    socket.emit('move', { x: camera.position.x, z: camera.position.z });
}

// Стрельба
window.addEventListener('click', () => {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(camera.position.x, camera.position.y, camera.position.z);
    scene.add(bullet);
    socket.emit('shoot', { x: bullet.position.x, z: bullet.position.z });
});

function animate() {
    requestAnimationFrame(animate);
    updatePlayerMovement();
    renderer.render(scene, camera);
}
animate();
