import * as THREE from "three";
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {


    function init() {
        // Get a reference to the container element that will hold our scene
        container = document.querySelector("body");

        // Create a Scene
        const scene = new THREE.Scene();

        // Texture loader
        const loader = new THREE.TextureLoader();
        

    }

    init()
    


};

