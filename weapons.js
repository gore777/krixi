// weapons.js
class WeaponSystem {
    constructor(socket, scene, camera, controls, player) {
        this.socket = socket;
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.player = player;
        this.currentWeapon = "pistol";
        this.lastShot = 0;
        this.weapons = {
            pistol: { damage: 20, fireRate: 300 },
            rifle: { damage: 30, fireRate: 100 },
            shotgun: { damage: 50, fireRate: 500 },
        };
        this.init();
    }

    init() {
        document.addEventListener("mousedown", () => this.shoot());
        this.socket.on("shot", (data) => this.handleShot(data));
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.weapons[this.currentWeapon].fireRate) {
            this.lastShot = now;
            document.getElementById("shoot-sound").play();
            this.socket.emit("shoot", {
                position: this.camera.position.clone(),
                direction: this.controls.getDirection(new THREE.Vector3()),
                weapon: this.currentWeapon,
                shooter: this.socket.id,
            });

            // Анимация выстрела (линия)
            const shotGeometry = new THREE.BufferGeometry().setFromPoints([
                this.camera.position,
                this.camera.position.clone().add(this.controls.getDirection(new THREE.Vector3()).multiplyScalar(50)),
            ]);
            const shotMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
            const shotLine = new THREE.Line(shotGeometry, shotMaterial);
            this.scene.add(shotLine);
            setTimeout(() => this.scene.remove(shotLine), 100);
        }
    }

    handleShot(data) {
        if (data.shooter !== this.socket.id) {
            const raycaster = new THREE.Raycaster(data.position, data.direction);
            const intersects = raycaster.intersectObjects(Object.values(this.player.players));
            if (intersects.length > 0) {
                const targetId = Object.keys(this.player.players).find(
                    (id) => this.player.players[id] === intersects[0].object
                );
                this.socket.emit("hit", {
                    target: targetId,
                    damage: this.weapons[data.weapon].damage,
                    shooter: data.shooter,
                });
            }
        }
    }

    setWeapon(weapon) {
        this.currentWeapon = weapon;
        document.getElementById("weapon").textContent = `Weapon: ${this.currentWeapon}`;
    }
}
