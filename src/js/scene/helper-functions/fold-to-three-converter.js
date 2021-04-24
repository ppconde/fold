import * as THREE from "three";
import * as earcut from 'earcut'

export const foldToThreeConverter = (fold) => {


    const trianglesIds = earcut(fold.vertices_coords.flat(), null, 2);


/*     const trianglesCoords = trianglesIds.reduce((acc, val) => {
        acc.push(fold.vertices_coords[val])
        return acc;
    }, []); */

    const numVertices = trianglesIds.length;

    const positionNumComponents = 2;
    const positions = new Float32Array(numVertices * positionNumComponents);


    let posNdx = 0;
    for (const id of trianglesIds) {
      console.log(fold.vertices_coords[id])
      positions.set(fold.vertices_coords[id], posNdx);
      posNdx += positionNumComponents;
    }


    const geometry = new THREE.BufferGeometry();
    const pos_attrib = new THREE.BufferAttribute(positions, positionNumComponents);

    console.log(positions)

}