// map.js
function createMap(scene) {
    const textureLoader = new THREE.TextureLoader();

    // Пол
    const floorTex = textureLoader.load(floorTexture);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(10, 10);
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshPhongMaterial({ map: floorTex })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Стены
    const wallTex = textureLoader.load(wallTexture);
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(5, 2);
    const wallMaterial = new THREE.MeshPhongMaterial({ map: wallTex });
    const wallGeometry = new THREE.BoxGeometry(50, 5, 1);
    const walls = [
        new THREE.Mesh(wallGeometry, wallMaterial),
        new THREE.Mesh(wallGeometry, wallMaterial),
        new THREE.Mesh(new THREE.BoxGeometry(1, 5, 50), wallMaterial),
        new THREE.Mesh(new THREE.BoxGeometry(1, 5, 50), wallMaterial),
    ];
    walls[0].position.set(0, 2.5, -25);
    walls[1].position.set(0, 2.5, 25);
    walls[2].position.set(-25, 2.5, 0);
    walls[3].position.set(25, 2.5, 0);
    walls.forEach((wall) => scene.add(wall));

    // Ящики
    const crateTex = textureLoader.load(crateTexture);
    crateTex.wrapS = crateTex.wrapT = THREE.RepeatWrapping;
    crateTex.repeat.set(2, 2);
    const crateMaterial = new THREE.MeshPhongMaterial({ map: crateTex });
    const crateGeometry = new THREE.BoxGeometry(3, 3, 3);
    const crates = [
        new THREE.Mesh(crateGeometry, crateMaterial),
        new THREE.Mesh(crateGeometry, crateMaterial),
        new THREE.Mesh(crateGeometry, crateMaterial),
    ];
    crates[0].position.set(-10, 1.5, -10);
    crates[1].position.set(10, 1.5, 10);
    crates[2].position.set(0, 1.5, 0);
    crates.forEach((crate) => scene.add(crate));
}
