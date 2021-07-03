import * as THREE from "three";
import { Object3D, ShapeBufferGeometry } from "three";
import img1 from './img/chess2.png';
import img2 from './img/roundshadow.png';
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

    let planemesh;
    let renderer;
    let scene;
    let camera;
    let sphere_mesh;
    let factor;
    let shadowmesh;



    function init() {
        // Get a reference to the container element that will hold our scene
        const container = document.querySelector("body");

        // Create a Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color('white');

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
            //color: 0xffffff,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        planeMat.color.setRGB(1.5, 1.5, 1.5);
        //planeMat.emissive = new THREE.Color( 0x000000 );

        // const planeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(100,0,0)") });
        //planeMat.color.setRGB(1.5, 1.5, 1.5);

        planemesh = new THREE.Mesh(planeGeo, planeMat);

        const shadowtex = loader.load(img2);
        const shadowSize = 1;
        const shadowGeo = new THREE.PlaneGeometry(shadowSize, shadowSize);
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowtex,
            //side: THREE.DoubleSide,
            depthWrite: false,
            //depthTest: true,
            transparent: true
        });

        shadowmesh= new THREE.Mesh(shadowGeo, shadowMat);
        factor  = 4*5;
        shadowmesh.position.y = 0.001;
        shadowmesh.scale.set(factor,factor,factor)

        
        
        const N_tones = 5;

        const colors = [new THREE.Color( 0xffffff ), new THREE.Color( 0xff8000 ), new THREE.Color( 0xff0000)];
        let size = 30;
        // size = Math.ceil(size/colors.length)*colors.length;
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
        let sphere_tex = new THREE.DataTexture( data, size, 1,THREE.RGBFormat);

        console.log(data)

        // let sphere_tex = new THREE.DataTexture( data, N_tones, 1, THREE.RGBFormat);
        // let sphere_tex = new THREE.DataTexture( data, size, 1,THREE.RGBFormat);
        // let sphere_tex = new THREE.DataTexture( data, N_tones, 1,THREE.LuminanceFormat);
        sphere_tex.minFilter = THREE.NearestFilter;
        sphere_tex.magFilter = THREE.NearestFilter;
        sphere_tex.generateMipmaps = false;

        let sphere_geo = new THREE.SphereGeometry(5,20,20);
        let sphere_mat = new THREE.MeshToonMaterial({
            color: 0x2194ce,
            gradientMap: sphere_tex,
            
        });

        
        

        
        sphere_mesh  = new THREE.Mesh(sphere_geo,sphere_mat)
        sphere_mesh.position.set(0,0,10);
        


        const base = new Object3D();
        base.add(sphere_mesh)
        base.add(shadowmesh)

        scene.add(planemesh);
        scene.add(base);

        //mesh.rotation.x = Math.PI * -0.5;
        



        // Camera
        const fov = 65; // fov = Field Of View
        const aspect = container.clientWidth / container.clientHeight;
        const near = 0.1;
        const far = 100;
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, -5, 30);
        camera.lookAt(0,0,0);
        const controls = new OrbitControls(camera);
        scene.add(camera);

        // Create hemisphere light
        const skycolor = 0xB1E1FF; // light blue
        const groundcolor = 0xB97A20; // brownish
        const hemiintensity = 2;
        const hemilight = new THREE.HemisphereLight(skycolor, groundcolor, hemiintensity);

        scene.add(hemilight)

        // Create a directional light
        const color = 0xffffff;
        const dirintensity = 1;

        const dirlight = new THREE.DirectionalLight(color, dirintensity);
        dirlight.position.set(0, 10, 5);
        dirlight.target.position.set(-5, 0, 0);
        scene.add(dirlight);
        scene.add(dirlight.target);


        // // Create point light
        // const light = new THREE.PointLight(0xffffff,10,100);
        
        // // move the light back and up a bit
        // light.position.set(0, 0, 20);
        
        // // remember to add the light to the scene
        // scene.add(light);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        container.appendChild(renderer.domElement);
        console.log(scene)
        console.log(container)

        animate();

    }

    function animate(time) {
        time *= 0.001; 
        let Z = 10+5 + 5*Math.cos(0.5*Math.PI*time) -5;
        sphere_mesh.position.set(0,0,Z);
        

        // factor  = 4*5;
        
        factor = 20*5/(20-Z);
        console.log(factor);
        shadowmesh.position.y = 0.001;
        // shadowmesh.scale.set(factor,factor,factor)
        shadowmesh.scale.setScalar(factor)

        renderer.render(scene, camera);

        // call animate recursively
        requestAnimationFrame(animate);
    
        // increase the mesh's rotation each frame
        // mesh.rotation.z += 0.01;
        // mesh.rotation.x += 0.01;
        // mesh.rotation.y += 0.01;
    
        // render, or 'create a still image', of the scene
        // this will create one still image / frame each time the animate
        // function calls itself
        
      }

    init();
    


};

