// game.js
// Библиотеки уже загружены через <script> в index.html, используем глобальные объекты

// Подключение к серверу
const socket = io("https://krixi-unj3.onrender.com");

// Проверка подключения WebSocket
socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});
socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new THREE.PointerLockControls(camera, renderer.domElement);
const loader = new THREE.GLTFLoader();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Освещение
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// Звуки
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const shootSound = new THREE.Audio(audioListener);
const hitSound = new THREE.Audio(audioListener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load(
  "https://threejs.org/examples/sounds/gunshot.mp3",
  (buffer) => {
    shootSound.setBuffer(buffer);
    console.log("Gunshot sound loaded");
  },
  undefined,
  (error) => {
    console.error("Error loading gunshot sound:", error);
  }
);
audioLoader.load(
  "https://threejs.org/examples/sounds/hit.mp3",
  (buffer) => {
    hitSound.setBuffer(buffer);
    console.log("Hit sound loaded");
  },
  undefined,
  (error) => {
    console.error("Error loading hit sound:", error);
  }
);

// Игроки и оружие
const players = {};
const weapons = {
  pistol: { damage: 20, fireRate: 300, model: null },
  rifle: { damage: 30, fireRate: 100, model: null },
};
let currentWeapon = "pistol";
let lastShot = 0;

let velocity = new THREE.Vector3();
let health = 100;
const speed = 0.1;
const jumpHeight = 0.3;
let canJump = true;

function createMap() {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    "https://threejs.org/examples/textures/floor.jpg",
    (floorTexture) => {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshPhongMaterial({ map: floorTexture })
      );
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);
      console.log("Floor texture loaded and added to scene");
    },
    undefined,
    (error) => {
      console.error("Error loading floor texture:", error);
      // Добавим запасной пол без текстуры
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshPhongMaterial({ color: 0x808080 })
      );
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);
    }
  );

  const wallGeometry = new THREE.BoxGeometry(10, 5, 1);
  const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const walls = [
    new THREE.Mesh(wallGeometry, wallMaterial),
    new THREE.Mesh(wallGeometry, wallMaterial),
  ];
  walls[0].position.set(0, 2.5, -10);
  walls[1].position.set(5, 2.5, 0);
  walls[1].rotation.y = Math.PI / 2;
  walls.forEach((wall) => scene.add(wall));
}

createMap();

loader.load(
  "https://threejs.org/examples/models/gltf/pistol.glb",
  (gltf) => {
    weapons.pistol.model = gltf.scene;
    weapons.pistol.model.scale.set(0.5, 0.5, 0.5);
    weapons.pistol.model.position.set(0.3, -0.3, -0.5);
    camera.add(weapons.pistol.model);
    console.log("Pistol model loaded");
  },
  undefined,
  (error) => {
    console.error("Error loading pistol model:", error);
    // Добавим запасной пистолет как куб
    const weaponGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.5);
    const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    weapons.pistol.model = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapons.pistol.model.position.set(0.3, -0.3, -0.5);
    camera.add(weapons.pistol.model);
  }
);

document.addEventListener("click", () => controls.lock());

socket.on("update", (serverPlayers) => {
  Object.keys(serverPlayers).forEach((id) => {
    if (id !== socket.id) {
      if (!players[id]) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshPhongMaterial({
          color: Math.random() * 0xffffff,
        });
        players[id] = new THREE.Mesh(geometry, material);
        scene.add(players[id]);
      }
      players[id].position.set(
        serverPlayers[id].x,
        serverPlayers[id].y,
        serverPlayers[id].z
      );
    }
  });
});

const keys = {};
document.addEventListener("keydown", (event) => {
  keys[event.key] = true;
  if (event.key === "1") currentWeapon = "pistol";
  if (event.key === "2" && weapons.rifle.model) currentWeapon = "rifle";
});
document.addEventListener("keyup", (event) => (keys[event.key] = false));

document.addEventListener("mousedown", () => {
  const now = Date.now();
  if (now - lastShot > weapons[currentWeapon].fireRate) {
    lastShot = now;
    if (shootSound.isPlaying) shootSound.stop();
    shootSound.play();

    socket.emit("shoot", {
      position: camera.position.clone(),
      direction: controls.getDirection(new THREE.Vector3()),
      weapon: currentWeapon,
    });
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
  health -= damage;
  if (hitSound.isPlaying) hitSound.stop();
  hitSound.play();
  document.getElementById("health").textContent = `Health: ${health}`;
  if (health <= 0) respawn();
});

function respawn() {
  const spawnPoints = [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(10, 1, 10),
    new THREE.Vector3(-10, 1, -10),
  ];
  const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  camera.position.copy(spawn);
  health = 100;
  document.getElementById("health").textContent = `Health: ${health}`;
}

function animate() {
  requestAnimationFrame(animate);

  velocity.x = 0;
  velocity.z = 0;

  if (keys["w"]) velocity.z -= speed;
  if (keys["s"]) velocity.z += speed;
  if (keys["a"]) velocity.x -= speed;
  if (keys["d"]) velocity.x += speed;
  if (keys[" "] && canJump) {
    velocity.y = jumpHeight;
    canJump = false;
  }

  velocity.y -= 0.01;
  controls.moveRight(velocity.x);
  controls.moveForward(velocity.z);
  camera.position.y += velocity.y;

  if (camera.position.y < 1) {
    camera.position.y = 1;
    velocity.y = 0;
    canJump = true;
  }

  socket.emit("move", {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  });

  document.getElementById("weapon").textContent = `Weapon: ${currentWeapon}`;
  renderer.render(scene, camera);
  console.log("Rendering frame");
}

respawn();
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
