import * as THREE from "three";
const OrbitControls = require('three-orbit-controls')(THREE)

export const main = () => {
  // these need to be accessed inside more than one function so we'll declare them first
  let container;
  let camera;
  let povCamera;
  let renderer;
  let scene;
  let carBodyMesh;
  let wheels;
  const wheelsPositions = [[1.5, -0.5, 1], [1.5, -0.5, -1], [-1.5, -0.5, 1], [-1.5, -0.5, -1]];

  function init() {
    // Get a reference to the container element that will hold our scene
    container = document.querySelector("body");

    // create a Scene
    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x8fbcd4);

    // Car body
    
    const carBodyGeometry = new THREE.BoxGeometry(3,1,2);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.5 })
    carBodyMesh = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    scene.add(carBodyMesh);

    //Car top
    const carTopGeometry = new THREE.BoxGeometry(1,0.8,1.5);
    const carTopMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFFFF,
      opacity: 0.5,
      transparent: true,
    });

    const carTopMesh = new THREE.Mesh(carTopGeometry, carTopMaterial);
    carTopMesh.position.set(0,0.8,0);
    carBodyMesh.add(carTopMesh);

    //Car lights
    const carLightGeometry = new THREE.SphereGeometry(0.3, 32, 32, 0, Math.PI);
    const carLightMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      opacity: 0.5,
      transparent: true,
    });

    const carLightMesh1 = new THREE.Mesh(carLightGeometry, carLightMaterial);
    carLightMesh1.position.set(-1.5,0.5,-0.7);
    carLightMesh1.rotateY(Math.PI/2);
    carBodyMesh.add(carLightMesh1);
    const carLightMesh2 = new THREE.Mesh(carLightGeometry, carLightMaterial);
    carLightMesh2.position.set(-1.5,0.5,0.7);
    carLightMesh2.rotateY(Math.PI/2);
    carBodyMesh.add(carLightMesh2);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32);
    const wheelWf = new THREE.WireframeGeometry(wheelGeometry);
    const wheelMaterial = new THREE.MeshBasicMaterial( {color: 0x000000});

    wheels = wheelsPositions.map((arr) => {
      const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
      const wheelLines = new THREE.LineSegments(wheelWf);
      wheelMesh.position.set(arr[0], arr[1], arr[2]);
      wheelMesh.rotateX(Math.PI/2);
      wheelMesh.add(wheelLines);
      carBodyMesh.add(wheelMesh);

      return wheelMesh;
    });

    // set up the options for a perspective camera
    const fov = 35; // fov = Field Of View
    const aspect = container.clientWidth / container.clientHeight;
    const near = 0.1;
    const far = 100;

    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // every object is initially created at ( 0, 0, 0 )
    // we'll move the camera back a bit so that we can view the scene
    camera.position.set(0, 0, 10);

    //POV camera
    povCamera = new THREE.PerspectiveCamera();

    //Controls
    const controls = new OrbitControls(camera);

    //Light
    const light = new THREE.HemisphereLight( 0xffff00, 1 );
    scene.add(light);

    // create a WebGLRenderer and set its width and height
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);

    renderer.setPixelRatio(window.devicePixelRatio);

    // add the automatically created <canvas> element to the page
    container.appendChild(renderer.domElement);
  }

  function animate() {
    // call animate recursively
    requestAnimationFrame(animate);

    wheels.forEach((mesh) => {
      mesh.rotation.y += 0.01;
    });

    // increase the mesh's rotation each frame
    //scene.rotation.z += 0.01;
    //scene.rotation.x += 0.01;
    //scene.rotation.y += 0.01;

    // render, or 'create a still image', of the scene
    // this will create one still image / frame each time the animate
    // function calls itself
    renderer.render(scene, camera);
  }

  // call the init function to set everything up
  init();

  // then call the animate function to render the scene
  animate();
};
