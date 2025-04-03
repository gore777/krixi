// game.js
let scene, camera, renderer, controls, player, weaponSystem;

function initGame() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("game").appendChild(renderer.domElement);

    controls = new THREE.PointerLockControls(camera, renderer.domElement);
    document.addEventListener("click", () => controls.lock());

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    createMap(scene);

    player = new Player(socket, scene, camera, controls);
    weaponSystem = new WeaponSystem(socket, scene, camera, controls, player);

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    player.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initMenu();
