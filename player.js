// player.js
class Player {
    constructor(socket, scene, camera, controls) {
        this.socket = socket;
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.velocity = new THREE.Vector3();
        this.speed = 0.1;
        this.jumpHeight = 0.3;
        this.canJump = true;
        this.health = 100;
        this.kills = 0;
        this.players = {};
        this.keys = {};
        this.init();
    }

    init() {
        document.addEventListener("keydown", (event) => {
            this.keys[event.key] = true;
        });
        document.addEventListener("keyup", (event) => {
            this.keys[event.key] = false;
        });

        this.socket.on("damage", (damage) => {
            this.health -= damage;
            document.getElementById("hit-sound").play();
            document.getElementById("health").textContent = `Health: ${this.health}`;
            if (this.health <= 0) this.respawn();
        });

        this.socket.on("respawn", () => {
            this.respawn();
        });

        this.socket.on("update", (data) => {
            this.updatePlayers(data);
        });
    }

    update() {
        this.velocity.x = 0;
        this.velocity.z = 0;

        if (this.keys["w"]) this.velocity.z -= this.speed;
        if (this.keys["s"]) this.velocity.z += this.speed;
        if (this.keys["a"]) this.velocity.x -= this.speed;
        if (this.keys["d"]) this.velocity.x += this.speed;
        if (this.keys[" "] && this.canJump) {
            this.velocity.y = this.jumpHeight;
            this.canJump = false;
        }

        this.velocity.y -= 0.01;
        this.controls.moveRight(this.velocity.x);
        this.controls.moveForward(this.velocity.z);
        this.camera.position.y += this.velocity.y;

        if (this.camera.position.y < 1) {
            this.camera.position.y = 1;
            this.velocity.y = 0;
            this.canJump = true;
        }

        this.socket.emit("move", {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
        });
    }

    updatePlayers(data) {
        const { players, gameMode, teams } = data;
        Object.keys(this.players).forEach((id) => {
            if (!players[id]) {
                this.scene.remove(this.players[id]);
                delete this.players[id];
            }
        });

        Object.keys(players).forEach((id) => {
            if (id !== this.socket.id) {
                if (!this.players[id]) {
                    const geometry = new THREE.BoxGeometry(1, 2, 1);
                    const material = new THREE.MeshPhongMaterial({ color: players[id].color });
                    this.players[id] = new THREE.Mesh(geometry, material);
                    this.scene.add(this.players[id]);
                }
                this.players[id].position.set(players[id].x, players[id].y, players[id].z);
                this.players[id].material.color.setHex(players[id].color);
            }
        });

        document.getElementById("mode").textContent = `Mode: ${gameMode}`;
        this.kills = players[this.socket.id]?.kills || 0;
        document.getElementById("kills").textContent = `Kills: ${this.kills}`;
    }

    respawn() {
        const spawnPoints = [
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(10, 1, 10),
            new THREE.Vector3(-10, 1, -10),
        ];
        const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        this.camera.position.copy(spawn);
        this.health = 100;
        document.getElementById("health").textContent = `Health: ${this.health}`;
    }
}
