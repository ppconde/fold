import * as THREE from "three";
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {
  // these need to be accessed inside more than one function so we'll declare them first
  let container;
  let camera;
  let renderer;
  let scene;
  let mesh;
  
  function init() {
    // Get a reference to the container element that will hold our scene
    container = document.querySelector("body");
    
    // create a Scene
    scene = new THREE.Scene();
    
    scene.background = new THREE.Color(0x8fbcd4);
    
    // set up the options for a perspective camera
    const fov = 35; // fov = Field Of View
    const aspect = container.clientWidth / container.clientHeight;
    const near = 0.1;
    const far = 100;
    
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    // every object is initially created at ( 0, 0, 0 )
    // we'll move the camera back a bit so that we can view the scene
    camera.position.set(0, 0, 30);
    const controls = new OrbitControls(camera)
    
    // Body
    const geometry = new THREE.BoxBufferGeometry(8, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(50,50,50)"),metalness:0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    const wire = new THREE.WireframeGeometry(geometry)
    const material_wire = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(100,100,100)")});
    const wire_mesh = new THREE.LineSegments(wire, material_wire)
    
    mesh.add(wire_mesh)
    
    // const stick_geo = new THREE.BoxBufferGeometry(1, 1, 4);
    const stick_geo = new THREE.CylinderGeometry(0.25, 0.25, 4);
    
    // Wheels
    const circle_geo = new THREE.CircleGeometry( 2, 32 );
    const circle_material = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(100,100,100)"),metalness:1});
    // const circle_mesh = new THREE.Mesh(circle_geo, circle_material);
    // const circle_mesh2 = new THREE.Mesh(circle_geo, circle_material);
    // const circle_mesh3 = new THREE.Mesh(circle_geo, circle_material);
    // const circle_mesh4 = new THREE.Mesh(circle_geo, circle_material);
    
    //scene.children[1].position.set(0, 0, 10);
    
    const circle_wire = new THREE.WireframeGeometry(circle_geo)
    
    const circle_pos = [[0,2,0],[0,-2,0]]
    
    
    const rot_objs = []
    
    const circle_mesh_arr = []
    const stick_mesh_arr = []
    
    const stick_pos = [[-2,0,0],[2,0,0]]
    stick_pos.forEach((element,i)=> {
      const stick_mesh = new THREE.Mesh(stick_geo, material);
      stick_mesh_arr.push(stick_mesh)
      stick_mesh.rotateX(Math.PI/2)
      stick_mesh.position.set(element[0],element[1],element[2])
      
      
      circle_pos.forEach((element,i)=> {
        //console.log(i,circle_mesh)
        const circle_mesh = new THREE.Mesh(circle_geo, circle_material);
        circle_mesh_arr.push(circle_mesh)
        const circle_wire_mesh = new THREE.LineSegments(circle_wire,material_wire)
        circle_mesh.position.set(element[0],element[1],element[2])
        circle_mesh.add(circle_wire_mesh)
        circle_mesh.rotateX(Math.PI/2)
        stick_mesh.add(circle_mesh)
        
      });
      
      rot_objs.push(stick_mesh)
      mesh.add(stick_mesh)
      
    });

    // First person camera
    const cam_geo = new THREE.SphereGeometry( 1, 32, 32 ,0,Math.PI*2,0,Math.PI/2)
    const can_geo = new THREE.BoxBufferGeometry( 2, 0.25, 0.25 )
    // const cam_geo = new THREE.BoxBufferGeometry(1, 2, 1);
    const cam_mesh = new THREE.Mesh(cam_geo, material);
    const can_mesh = new THREE.Mesh(can_geo, material);
    cam_mesh.position.set(0, 1, 0);
    can_mesh.position.set(-1, 1.5, 0);


    const can_camera = new THREE.PerspectiveCamera(120, aspect, 0.1, 200);

    // can_camera.rotation.z += Math.PI/2
    can_camera.lookAt(-30, 0, 0);
    can_camera.position.set(-1,0.2,0)
    // can_camera.rotation.y += Math.PI/2


    can_mesh.add(can_camera)
    
    mesh.add(cam_mesh)
    mesh.add(can_mesh)



    // circle_pos.forEach((element,i)=> {
    
    //   //console.log(i,circle_mesh)
    //   const circle_mesh = new THREE.Mesh(circle_geo, circle_material);
    //   circle_mesh_arr.push(circle_mesh)
    //   const circle_wire_mesh = new THREE.LineSegments(circle_wire,material_wire)
    //   circle_mesh.position.set(element[0],element[1],element[2])
    //   circle_mesh.add(circle_wire_mesh)
    //   mesh.add(circle_mesh)
    
    // });
    
    // add the mesh to the scene object
    scene.add(mesh);
    
    // Create a directional light
    const light = new THREE.DirectionalLight(0xffffff, 5.0);
    
    // move the light back and up a bit
    light.position.set(10, 10, 10);
    
    // remember to add the light to the scene
    scene.add(light);
    
    // create a WebGLRenderer and set its width and height
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // add the automatically created <canvas> element to the page
    container.appendChild(renderer.domElement);
    
    animate();
    
    
    
    function animate() {
      // call animate recursively
      requestAnimationFrame(animate);
      
      // increase the mesh's rotation each frame
      rot_objs.forEach(element => {
        // element.rotation.z += 0.01;
        // element.rotation.x += 0.01;
        element.rotation.y += 0.01;
      })

      mesh.position.x -= 0.01;
      // can_camera.rotation.z += Math.PI/200
      // render, or 'create a still image', of the scene
      // this will create one still image / frame each time the animate
      // function calls itself
      // renderer.render(scene, camera);

      const width = container.clientWidth;
      const height = container.clientHeight;
  
      let left = 0;
      const bottom = 0;
      renderer.setViewport(left, bottom, Math.floor(width / 2), height);
      renderer.setScissor(left, bottom, Math.floor(width / 2), height);
      renderer.setScissorTest(true);

      // camera.aspect = Math.floor(width / 2) / height;
      renderer.render(scene, camera);

      left = Math.floor(width / 2);
      renderer.setViewport(left, bottom, Math.floor(width / 2), height);
      renderer.setScissor(left, bottom, Math.floor(width / 2), height);
      renderer.setScissorTest(true);

      // can_camera.aspect = Math.floor(width / 2) / height;
      renderer.render(scene, can_camera);
      
    }
  }
  
  
  
  // call the init function to set everything up
  init();
  
  
};

/*   function animate() {
  // call animate recursively
  requestAnimationFrame(animate);
  
  // increase the mesh's rotation each frame
  mesh.rotation.z += 0.01;
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;
  
  // render, or 'create a still image', of the scene
  // this will create one still image / frame each time the animate
  // function calls itself
  
} */
/*   // then call the animate function to render the scene
animate(); */