import * as THREE from "three";
import threeOrbitControls from "three-orbit-controls";
import img1 from '../../../guta/img/chess1.png';
import roundShadow from '../../../conde/demos/img/roundshadow.png';
//const img1 = require('./img/chess1.png'); 
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

    let mesh;
    let renderer;
    let scene;
    let camera;
    let ballMesh;
    let shadowMesh;

    function init() {
        // Get a reference to the container element that will hold our scene
        const container = document.querySelector("body");

        // Create a Scene
        scene = new THREE.Scene();
        /* scene.rotation = Math.PI; */
        const planeSize = 40;

        // Texture loader
        const loader = new THREE.TextureLoader();
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
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        //const ncolor = new THREE.Color("rgb(36,36,36)");
        //planeMat.color.add(ncolor);
        // const planeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(100,0,0)") });
        //planeMat.color.setRGB(1.5, 1.5, 1.5);

        mesh = new THREE.Mesh(planeGeo, planeMat);
        //mesh.rotation.x = Math.PI;
        //mesh.rotation.x = Math.PI * -0.5;
        scene.add(mesh);


        // Balls mesh
        const ballGeometry = new THREE.SphereGeometry(1, 50, 50);
        const ballTexture = getBallTexture(8, 8);
        ballTexture.minFilter = THREE.NearestFilter;
        ballTexture.magFilter = THREE.NearestFilter;
        const ballMaterial = new THREE.MeshToonMaterial({
            gradientMap: ballTexture,
            side: THREE.DoubleSide,
            color: 0x2194ce
        });
        ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        ballMesh.position.set(0, 0, 5);
        scene.add(ballMesh);


        const baseShadow = new THREE.Object3D();
        
        const shadowTexture = loader.load(roundShadow);
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            depthWrite: false,
            depthTest: true,
        })

        const shadowGeo = new THREE.PlaneGeometry(1, 1);
        shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.scale.set(6, 6, 6);
        shadowMesh.position.y = 0.01;
        baseShadow.add(shadowMesh);
        baseShadow.add(ballMesh);
        scene.add(baseShadow);

        // Camera
        const fov = 65; // fov = Field Of View
        const aspect = container.clientWidth / container.clientHeight;
        const near = 0.1;
        const far = 50;
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 0, 10);
        camera.lookAt(0,0,0);
        const controls = new OrbitControls(camera);
        scene.add(camera);

        // Create a directional light
        const light = new THREE.PointLight(0xffffff,10, 10, 2);
        // move the light back and up a bit
        light.position.set(0, 3, 10);
        // remember to add the light to the scene
        scene.add(light);

        // Setup 2 lights
        //light 2
/*         {
            const skyColor = 0xB1E1FF;  // light blue
            const groundColor = 0xB97A20;  // brownish orange
            const intensity = 2;
            const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
            scene.add(light);
        } */

        //light 3
/*         {
            const color = 0xFFFFFF;
            const intensity = 1;
            const light = new THREE.DirectionalLight(color, intensity);
            light.position.set(0, 10, 5);
            light.target.position.set(-5, 0, 0);
            scene.add(light);
            scene.add(light.target);
        } */



        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        container.appendChild(renderer.domElement);

        animate();

    }

    function getBallTexture(width, height) {
        const colors = [
            new THREE.Color( 0x1e80c4 ),
            new THREE.Color( 0x18567c ),
            new THREE.Color( 0xFFFFFF ),
        ];
        let size = width * height;
        const data = new Uint8Array(size*3);
        for (let i = 0; i< colors.length; i++){
            let color_stride = i*data.length/colors.length;
            for (let  j = 0; j < data.length/colors.length; j++){
                let rgb_stride = j * 3;
                data[ color_stride + rgb_stride ] =     Math.floor( colors[i].r * 255 );
                data[ color_stride + rgb_stride + 1 ] = Math.floor( colors[i].g * 255 );
                data[ color_stride + rgb_stride + 2 ] = Math.floor( colors[i].b * 255 );
            }
        }
        let sphere_tex = new THREE.DataTexture( data, size, 1, THREE.RGBFormat);

        return sphere_tex;
    }

    function animate(timestamp) {
        // call animate recursively
        requestAnimationFrame(animate);

        ballMesh.position.z = 5 * Math.sin((timestamp*0.005) + 1) + 5;
        //ballMesh.position.x = Math.acos((1 - 1 * Math.sin((timestamp*0.005)))/ 1) + 5;
        shadowMesh.scale.setScalar( 2 * Math.sin((timestamp*0.005) + 1) + 5);
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

