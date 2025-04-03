// game.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.min.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/PointerLockControls.js";

let scene, camera, renderer, controls, player, weaponSystem;

function initGame() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("game").appendChild(renderer.domElement);
    console.log("Renderer initialized");

    controls = new PointerLockControls(camera, renderer.domElement);
    document.addEventListener("click", () => controls.lock());

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);
    console.log("Lights added");

    createMap(scene);
    console.log("Map created");

    player = new Player(socket, scene, camera, controls);
    weaponSystem = new WeaponSystem(socket, scene, camera, controls, player);

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    console.log("Camera positioned at:", camera.position);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    player.update();
    renderer.render(scene, camera);
    console.log("Rendering frame");
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initMenu();
