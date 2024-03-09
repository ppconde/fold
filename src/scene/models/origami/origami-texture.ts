import * as THREE from 'three';

interface ITexture {
    map: THREE.Texture;
    aoMap: THREE.Texture;
    normalMap: THREE.Texture;
    metalnessMap: THREE.Texture;
    roughnessMap: THREE.Texture;
}

export class OrigamiTexture {

    public static loadTexture(): ITexture {
        const textureLoader = new THREE.TextureLoader();
        // Textures obtained from https://freepbr.com/materials/wrinkled-paper1/
        const map = textureLoader.load('textures/paper/wrinkled-paper-albedo.png');
        const normalMap = textureLoader.load('textures/paper/wrinkled-paper-normal-ogl.png');
        const aoMap = textureLoader.load('textures/paper/wrinkled-paper-ao.png');
        const metalnessMap = textureLoader.load('textures/paper/wrinkled-paper-metalness.png');
        const roughnessMap = textureLoader.load('textures/paper/wrinkled-paper-roughness.png');
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(1, 1);
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(1, 1);
        aoMap.wrapS = THREE.RepeatWrapping;
        aoMap.wrapT = THREE.RepeatWrapping;
        aoMap.repeat.set(1, 1);
        metalnessMap.wrapS = THREE.RepeatWrapping;
        metalnessMap.wrapT = THREE.RepeatWrapping;
        metalnessMap.repeat.set(1, 1);
        roughnessMap.wrapS = THREE.RepeatWrapping;
        roughnessMap.wrapT = THREE.RepeatWrapping;
        roughnessMap.repeat.set(1, 1);

        map.colorSpace = THREE.SRGBColorSpace;

        return {
            map,
            aoMap,
            normalMap,
            metalnessMap,
            roughnessMap,
        };
    }

}