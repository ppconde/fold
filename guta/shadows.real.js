import * as THREE from "three";
import { GUI } from 'dat.gui';
import { CustomGUI } from '../src/helpers/custom.gui.js'
import { CameraHelper } from "three";

const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

    let renderer;
    let plane_mesh;
    let sphere_mesh;
    let camera;
    let scene;
    let light;
    let light_ambi;
    let light_help;
    let light_shadow_camera;
    let canvas;
    let axes_help;
    let cam_help;

    function init() {

        {// Renderer
            canvas = document.querySelector(".main-canvas");
            renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
            renderer.shadowMap.enabled = true;
        }

        {// Light
            const color = 0xffffff;
            const intensity = 2;
            light = new THREE.DirectionalLight(color, intensity)
            light.castShadow = true;
            light.position.set(-10,0,20);

            light.target.position.set(10,0,0);
            light.target.updateMatrixWorld();

            light_ambi = new THREE.AmbientLight(0xffffff,0.6);

            light_shadow_camera = light.shadow.camera
        }

        {// Plane
            const plane_size = 50;
            const color = 0xffff00;
            const plane_geo = new THREE.PlaneGeometry(plane_size,plane_size)
            const plane_mat = new THREE.MeshStandardMaterial({color: color})
            plane_mesh = new THREE.Mesh(plane_geo, plane_mat);
            plane_mesh.receiveShadow = true;
            plane_mesh.castShadow = true;
        }

        {// Sphere
            const sphere_geo = new THREE.SphereGeometry(5,200,200);
            const sphere_mat = new THREE.MeshStandardMaterial({ color: 0x2194ce });
            sphere_mesh  = new THREE.Mesh(sphere_geo,sphere_mat)
            sphere_mesh.position.set(0,0,8);
            sphere_mesh.castShadow = true;
            sphere_mesh.receiveShadow = true;
        }

        {// Camera
            const fov = 65;
            const aspect = canvas.clientWidth / canvas.clientHeight;
            const near = 0.1;
            const far = 100;
            camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
            camera.position.set(0, 0, 35);
            const lookAt_vec = new THREE.Vector3(0,20,0);
            const controls = new OrbitControls(camera, canvas);
            camera.lookAt(lookAt_vec);
            controls.target = lookAt_vec;
        }

        {// Helpers
            light_help = new THREE.DirectionalLightHelper(light);
            cam_help = new THREE.CameraHelper(light_shadow_camera);
            axes_help = new THREE.AxesHelper( 20 )
        }

        {// Scene
            scene = new THREE.Scene();
            scene.add(plane_mesh, sphere_mesh, light, light_ambi, camera, axes_help, light_help, cam_help);
        }

        const gui = new CustomGUI();
        gui.make('color',  light, [light_help]);
        gui.make('position',  light, [light_help, cam_help]);
        gui.make('target',  light, [light_help, cam_help]);
        gui.make('frostum', light_shadow_camera, [cam_help])

        animate();

    }

    // function onChangehandler (x, y) {
    //     console.log(x, y);
    //     x.target.updateMatrixWorld();
    //     y.update();
    // };

    // function makeXYZGUI(gui, vector3, name, onChangeFn) {
    //     const folder = gui.addFolder(name);
    //     folder.add(vector3, 'x', -10, 10).onChange(onChangeFn);
    //     folder.add(vector3, 'y', 0, 10).onChange(onChangeFn);
    //     folder.add(vector3, 'z', -10, 10).onChange(onChangeFn);
    //     folder.open();
    // }

    // function makeXYZGUI(gui, vector3, name, onChangeFn) {
    //     const folder = gui.addFolder(name);
    //     folder.add(vector3, 'x', -10, 10).onChange(function(){return onChange(light, helper); }.bind(folder));
    //     folder.add(vector3, 'y', -10, 10).onChange(function(){return onChange(light, helper); }.bind(folder));
    //     folder.add(vector3, 'z', -10, 10).onChange(function(){return onChange(light, helper); }.bind(folder));
    //     folder.open();
    // }



    

    function animate(){

        // Update display size
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientWidth) {
            renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
            renderer.setPixelRatio(window.devicePixelRatio);
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    init();
}
