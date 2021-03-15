import * as THREE from "three";
import img1 from './img/chess1.png';
//const img1 = require('./img/chess1.png'); 
console.log(img1);
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

    let mesh;
    let renderer;
    let scene;
    let camera;

    function init() {
        // Get a reference to the container element that will hold our scene
        const container = document.querySelector("body");

        // Create a Scene
        scene = new THREE.Scene();

        const planeSize = 40;

        // Texture loader
        const loader = new THREE.TextureLoader();

        // console.log(img1);
        const texture = loader.load(img1);

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;

        const repeats = planeSize / 2;
        texture.repeat.set(repeats,repeats);

        // const planeGeo = new THREE.BoxBufferGeometry(2, 2, 2);
        const planeGeo = new THREE.PlaneGeometry(planeSize,planeSize)

        const planeMat = new THREE.MeshBasicMaterial({
            map: texture,
            //color: 0xffffff,
            side: THREE.DoubleSide,
        });

        // const planeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(100,0,0)") });
        //planeMat.color.setRGB(1.5, 1.5, 1.5);

        mesh = new THREE.Mesh(planeGeo, planeMat);
        
        //mesh.rotation.x = Math.PI * -0.5;
        scene.add(mesh);

        // Camera
        const fov = 65; // fov = Field Of View
        const aspect = container.clientWidth / container.clientHeight;
        const near = 0.1;
        const far = 100;
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 0, 20);
        camera.lookAt(0,0,0);
        const controls = new OrbitControls(camera);
        scene.add(camera);

        // Create a directional light
        const light = new THREE.PointLight(0xffffff,10,100);
        
        // move the light back and up a bit
        light.position.set(0, 0, 5);
        
        // remember to add the light to the scene
        scene.add(light);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);



        container.appendChild(renderer.domElement);
        console.log(scene)
        console.log(container)

        animate();

    }

    function animate() {
        // call animate recursively
        requestAnimationFrame(animate);
    
        // increase the mesh's rotation each frame
        // mesh.rotation.z += 0.01;
        // mesh.rotation.x += 0.01;
        // mesh.rotation.y += 0.01;
    
        // render, or 'create a still image', of the scene
        // this will create one still image / frame each time the animate
        // function calls itself
        renderer.render(scene, camera);
      }

    init();
    


};

