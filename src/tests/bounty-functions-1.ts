// Faltam fazer as seguintes funções:
// Função 1: createFaceMeshes()
// Função 2: createMeshInstructions();


// Função 1
// Esta função deve transformar o array de pontos e faces do origami num array de meshes (THREE.Mesh).
// Exemplo:

// Exemplo de input
const origamiCoordinates = {
    points: {'a':[0,0,0],'b':[12,0,0],'c':[12,6,0],'d':[0,6,0],'e':[6,0,0],'f':[6,6,0],'g':[3,0,0],'h':[3,6,0],'i':[9,0,0],'j':[9,6,0]}, 
    faces: [['a','g','h','d'],['g','e','f','h'],['e','i','j','f'],['i','b','c','j']],
    pattern: {'a':[0,0],'b':[12,0],'c':[12,6],'d':[0,6],'e':[6,0],'f':[6,6],'g':[3,0],'h':[3,6],'i':[9,0],'j':[9,6]},
    faceOrder: {0: {},  1: {}, 2: {}, 3: {}}
    };


// O que falta fazer:
const meshes = this.createFaceMeshes(origamiCoordinates);


// Exemplo de output:
const meshes =  [
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 })),
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 })),
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 })),
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))
];



// Função 2
// Esta função deve transformar o array instruções que rodaram as faces do origami dentro do solver, num array de instruções que vá rodar as meshes no ecrã.
// Exemplo:

// Exemplo de input:
const origamiCoordinates = {
points: {'a':[0,0,0],'b':[12,0,0],'c':[12,6,0],'d':[0,6,0],'e':[6,0,0],'f':[6,6,0],'g':[3,0,0],'h':[3,6,0],'i':[9,0,0],'j':[9,6,0]}, 
faces: [['a','g','h','d'],['g','e','f','h'],['e','i','j','f'],['i','b','c','j']],
pattern: {'a':[0,0],'b':[12,0],'c':[12,6],'d':[0,6],'e':[6,0],'f':[6,6],'g':[3,0],'h':[3,6],'i':[9,0],'j':[9,6]},
faceOrder: {0: {},  1: {}, 2: {}, 3: {}}
};

const faceRotationInstructions = [
{faces: [['a', 'e', 'f', 'd']], axis: ['e', 'f'], angle: 180},
{faces: [['e','f','h','g'], ['i','j','f','e']], axis: ['i','j'], angle: 180}
];

const meshes =  [
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 })),
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 })),
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 })),
    new THREE.Mesh(new THREE.BufferGeometry(...), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))
];


// O que falta fazer:
const meshInstructions = this.createMeshInstructions(origamiCoordinates, faceRotationInstructions, meshes);


// Exemplo de ouput
const meshInstructions = [
    {meshIds: [0,1], axis: ['e', 'f'], angle: 180},
    {meshIds: [1,2], axis: ['i', 'j'], angle: 180},
];
