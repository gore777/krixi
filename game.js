// game.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.min.js";
import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// Подключение к серверу
const socket = io("https://krixi-unj3.onrender.com");

// Проверка подключения WebSocket
socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});
socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
});

// Основные объекты Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new PointerLockControls(camera, renderer.domElement);
const loader = new GLTFLoader();

// Физический мир
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Настройка рендерера
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Освещение
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// Звуки (с заглушками)
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const shootSound = new THREE.Audio(audioListener);
const shootSound2 = new THREE.Audio(audioListener); // Для винтовки
const hitSound = new THREE.Audio(audioListener);
const stepSound = new THREE.Audio(audioListener);
const jumpSound = new THREE.Audio(audioListener);
const reloadSound = new THREE.Audio(audioListener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load("/gunshot.mp3", (buffer) => {
  shootSound.setBuffer(buffer);
  console.log("Gunshot sound loaded");
}, undefined, (error) => {
  console.warn("Gunshot sound not loaded, proceeding without sound:", error);
});
audioLoader.load("/gunshot2.mp3", (buffer) => {
  shootSound2.setBuffer(buffer);
  console.log("Gunshot2 sound loaded");
}, undefined, (error) => {
  console.warn("Gunshot2 sound not loaded, proceeding without sound:", error);
});
audioLoader.load("/hit.mp3", (buffer) => {
  hitSound.setBuffer(buffer);
  console.log("Hit sound loaded");
}, undefined, (error) => {
  console.warn("Hit sound not loaded, proceeding without sound:", error);
});
audioLoader.load("/step.mp3", (buffer) => {
  stepSound.setBuffer(buffer);
  console.log("Step sound loaded");
}, undefined, (error) => {
  console.warn("Step sound not loaded, proceeding without sound:", error);
});
audioLoader.load("/jump.mp3", (buffer) => {
  jumpSound.setBuffer(buffer);
  console.log("Jump sound loaded");
}, undefined, (error) => {
  console.warn("Jump sound not loaded, proceeding without sound:", error);
});
audioLoader.load("/reload.mp3", (buffer) => {
  reloadSound.setBuffer(buffer);
  console.log("Reload sound loaded");
}, undefined, (error) => {
  console.warn("Reload sound not loaded, proceeding without sound:", error);
});

// Игроки и физические тела
const players = {};
const playerBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)),
});
playerBody.position.set(0, 1, 0);
world.addBody(playerBody);

// Оружие
const weapons = {
  pistol: { damage: 20, fireRate: 300, ammo: 15, maxAmmo: 30, reloadTime: 2000, model: null, sound: shootSound },
  rifle: { damage: 30, fireRate: 100, ammo: 30, maxAmmo: 90, reloadTime: 3000, model: null, sound: shootSound2 },
  shotgun: { damage: 50, fireRate: 800, ammo: 8, maxAmmo: 24, reloadTime: 4000, model: null, sound: shootSound },
};
let currentWeapon = "pistol";
let lastShot = 0;
let isReloading = false;

// Параметры игрока
let velocity = new THREE.Vector3();
let health = 100;
const speed = 0.1;
const jumpHeight = 5;
let canJump = true;
let kills = 0;
let team = "red"; // По умолчанию красная команда
let isInvulnerable = false;

// Командный счет
let teamScores = { red: 0, blue: 0 };

// Skybox
function createSkybox() {
  const skyGeometry = new THREE.BoxGeometry(500, 500, 500);
  const skyMaterials = [];
  for (let i = 0; i < 6; i++) {
    skyMaterials.push(new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    }));
  }
  const skybox = new THREE.Mesh(skyGeometry, skyMaterials);
  scene.add(skybox);
}

// Карта
function createMap() {
  // Пол
  const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
  });
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(floorBody);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load("/floor.jpg", (floorTexture) => {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshPhongMaterial({ map: floorTexture })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    console.log("Floor texture loaded and added to scene");
  }, undefined, (error) => {
    console.warn("Floor texture not loaded, using fallback color:", error);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshPhongMaterial({ color: 0x808080 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
  });

  // Стены и платформы
  const wallGeometry = new THREE.BoxGeometry(10, 5, 1);
  const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const walls = [
    { position: new THREE.Vector3(0, 2.5, -10), rotation: 0 },
    { position: new THREE.Vector3(5, 2.5, 0), rotation: Math.PI / 2 },
    { position: new THREE.Vector3(-10, 2.5, 5), rotation: Math.PI / 4 },
  ];

  walls.forEach((wallData) => {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.copy(wallData.position);
    wall.rotation.y = wallData.rotation;
    scene.add(wall);

    const wallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(5, 2.5, 0.5)),
    });
    wallBody.position.copy(wallData.position);
    wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), wallData.rotation);
    world.addBody(wallBody);
  });

  // Платформы
  const platformGeometry = new THREE.BoxGeometry(5, 1, 5);
  const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x606060 });
  const platforms = [
    { position: new THREE.Vector3(0, 3, 0) },
    { position: new THREE.Vector3(-8, 4, -8) },
  ];

  platforms.forEach((platformData) => {
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.copy(platformData.position);
    scene.add(platform);

    const platformBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5)),
    });
    platformBody.position.copy(platformData.position);
    world.addBody(platformBody);
  });
}

createSkybox();
createMap();

// Загрузка моделей оружия (с заглушкой)
loader.load("/pistol.glb", (gltf) => {
  weapons.pistol.model = gltf.scene;
  weapons.pistol.model.scale.set(0.5, 0.5, 0.5);
  weapons.pistol.model.position.set(0.3, -0.3, -0.5);
  camera.add(weapons.pistol.model);
  console.log("Pistol model loaded");
}, undefined, (error) => {
  console.warn("Pistol model not loaded, using fallback cube:", error);
  const weaponGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.5);
  const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  weapons.pistol.model = new THREE.Mesh(weaponGeometry, weaponMaterial);
  weapons.pistol.model.position.set(0.3, -0.3, -0.5);
  camera.add(weapons.pistol.model);
});

// Меню
const menu = document.getElementById("menu");
const playButton = document.getElementById("play-button");
const deathScreen = document.getElementById("death-screen");
const respawnButton = document.getElementById("respawn-button");

playButton.addEventListener("click", () => {
  menu.style.display = "none";
  controls.lock();
  socket.emit("join", { team: team });
});

// Обработка игроков
socket.on("update", (serverPlayers) => {
  Object.keys(serverPlayers).forEach((id) => {
    if (id !== socket.id) {
      if (!players[id]) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshPhongMaterial({
          color: serverPlayers[id].team === "red" ? 0xff0000 : 0x0000ff,
        });
        players[id] = new THREE.Mesh(geometry, material);
        scene.add(players[id]);
      }
      // Интерполяция движения
      const currentPos = players[id].position;
      const targetPos = new THREE.Vector3(
        serverPlayers[id].x,
        serverPlayers[id].y,
        serverPlayers[id].z
      );
      players[id].position.lerp(targetPos, 0.1);
    }
  });

  // Удаляем отключившихся игроков
  Object.keys(players).forEach((id) => {
    if (!serverPlayers[id]) {
      scene.remove(players[id]);
      delete players[id];
    }
  });
});

socket.on("teamScores", (scores) => {
  teamScores = scores;
  document.getElementById("team-score").textContent = `Red: ${scores.red} | Blue: ${scores.blue}`;
});

// Управление
const keys = {};
document.addEventListener("keydown", (event) => {
  keys[event.key] = true;
  if (event.key === "1") switchWeapon("pistol");
  if (event.key === "2") switchWeapon("rifle");
  if (event.key === "3") switchWeapon("shotgun");
  if (event.key === "r") reloadWeapon();
});
document.addEventListener("keyup", (event) => (keys[event.key] = false));

// Стрельба
document.addEventListener("mousedown", () => {
  if (!isReloading && weapons[currentWeapon].ammo > 0) {
    const now = Date.now();
    if (now - lastShot > weapons[currentWeapon].fireRate) {
      lastShot = now;
      weapons[currentWeapon].ammo--;
      updateHUD();

      if (weapons[currentWeapon].sound.buffer) {
        if (weapons[currentWeapon].sound.isPlaying) weapons[currentWeapon].sound.stop();
        weapons[currentWeapon].sound.play();
      }

      // Анимация отдачи
      if (weapons[currentWeapon].model) {
        weapons[currentWeapon].model.position.z += 0.1;
        setTimeout(() => {
          weapons[currentWeapon].model.position.z -= 0.1;
        }, 100);
      }

      // Визуальный эффект выстрела
      const shotGeometry = new THREE.BufferGeometry().setFromPoints([
        camera.position,
        camera.position.clone().add(controls.getDirection(new THREE.Vector3()).multiplyScalar(50)),
      ]);
      const shotMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
      const shotLine = new THREE.Line(shotGeometry, shotMaterial);
      scene.add(shotLine);
      setTimeout(() => scene.remove(shotLine), 100);

      socket.emit("shoot", {
        position: camera.position.clone(),
        direction: controls.getDirection(new THREE.Vector3()),
        weapon: currentWeapon,
      });
    }
  }
});

socket.on("shot", (data) => {
  const raycaster = new THREE.Raycaster(data.position, data.direction);
  const intersects = raycaster.intersectObjects(Object.values(players));
  if (intersects.length > 0) {
    socket.emit("hit", {
      target: intersects[0].object.id,
      damage: weapons[data.weapon].damage,
    });
  }
});

socket.on("damage", (damage) => {
  if (!isInvulnerable) {
    health -= damage;
    if (hitSound.buffer) {
      if (hitSound.isPlaying) hitSound.stop();
      hitSound.play();
    }
    updateHUD();
    if (health <= 0) die();
  }
});

socket.on("kill", (killerId) => {
  kills++;
  updateHUD();
  teamScores[team]++;
  document.getElementById("team-score").textContent = `Red: ${teamScores.red} | Blue: ${teamScores.blue}`;
});

function switchWeapon(weapon) {
  if (weapons[weapon].model) {
    currentWeapon = weapon;
    updateHUD();
    // Скрываем все модели оружия
    Object.values(weapons).forEach((w) => {
      if (w.model) w.model.visible = false;
    });
    // Показываем текущее оружие
    weapons[currentWeapon].model.visible = true;
  }
}

function reloadWeapon() {
  if (!isReloading && weapons[currentWeapon].ammo < weapons[currentWeapon].maxAmmo) {
    isReloading = true;
    if (reloadSound.buffer) {
      if (reloadSound.isPlaying) reloadSound.stop();
      reloadSound.play();
    }

    // Анимация перезарядки
    if (weapons[currentWeapon].model) {
      weapons[currentWeapon].model.position.y -= 0.2;
      setTimeout(() => {
        weapons[currentWeapon].model.position.y += 0.2;
      }, weapons[currentWeapon].reloadTime / 2);
    }

    setTimeout(() => {
      weapons[currentWeapon].ammo = Math.min(
        weapons[currentWeapon].maxAmmo,
        weapons[currentWeapon].ammo + weapons[currentWeapon].maxAmmo / 2
      );
      isReloading = false;
      updateHUD();
    }, weapons[currentWeapon].reloadTime);
  }
}

function updateHUD() {
  document.getElementById("health").textContent = `Health: ${health}`;
  document.getElementById("weapon").textContent = `Weapon: ${currentWeapon}`;
  document.getElementById("ammo").textContent = `Ammo: ${weapons[currentWeapon].ammo}/${weapons[currentWeapon].maxAmmo}`;
  document.getElementById("kills").textContent = `Kills: ${kills}`;
}

function die() {
  deathScreen.style.display = "flex";
  controls.unlock();
}

respawnButton.addEventListener("click", () => {
  deathScreen.style.display = "none";
  respawn();
  controls.lock();
});

function respawn() {
  const spawnPoints = team === "red" ? [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(5, 1, 5),
  ] : [
    new THREE.Vector3(-5, 1, -5),
    new THREE.Vector3(-10, 1, -10),
  ];
  const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  camera.position.copy(spawn);
  playerBody.position.copy(spawn);
  health = 100;
  isInvulnerable = true;
  setTimeout(() => {
    isInvulnerable = false;
  }, 3000);
  updateHUD();
}

function animate() {
  requestAnimationFrame(animate);

  // Обновление физики
  world.step(1 / 60);

  // Движение
  velocity.x = 0;
  velocity.z = 0;

  if (keys["w"]) velocity.z -= speed;
  if (keys["s"]) velocity.z += speed;
  if (keys["a"]) velocity.x -= speed;
  if (keys["d"]) velocity.x += speed;
  if (keys[" "] && canJump) {
    playerBody.velocity.y = jumpHeight;
    canJump = false;
    if (jumpSound.buffer) {
      if (jumpSound.isPlaying) jumpSound.stop();
      jumpSound.play();
    }
  }

  // Звуки шагов
  if ((keys["w"] || keys["s"] || keys["a"] || keys["d"]) && stepSound.buffer && !stepSound.isPlaying) {
    stepSound.play();
  }

  // Применение движения
  const direction = new THREE.Vector3(velocity.x, 0, velocity.z);
  direction.applyQuaternion(camera.quaternion);
  playerBody.velocity.x = direction.x * 10;
  playerBody.velocity.z = direction.z * 10;

  // Синхронизация камеры с физическим телом
  camera.position.copy(playerBody.position);
  camera.position.y += 1; // Камера на уровне глаз

  // Проверка земли
  if (playerBody.position.y <= 1) {
    canJump = true;
  }

  socket.emit("move", {
    x: playerBody.position.x,
    y: playerBody.position.y,
    z: playerBody.position.z,
  });

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
