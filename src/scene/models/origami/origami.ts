import * as THREE from 'three';
import { Controller } from '../../controllers/controller';
import { OrigamiPlaneGeometry } from './origami-plane-geometry';
import { IMeshInstruction, IVertices } from './origami-types';
import { MathHelpers } from './math-helpers';
import { OrigamiSolver } from './origami-solver';
import foldInstructionsText from '../../../instructions/test-1<<.text'
import { PolygonIntersectionHelper } from './polygon-intersection-helper'  // Just for test


export class Origami extends THREE.Group {

  private clock = new THREE.Clock();

  private scene: THREE.Scene;

  /**
   * @todo - It should be set in the constructor
   */
  public meshInstructions: IMeshInstruction[] = [
    {
      meshIds: [0, 1],
      axis: ['a', 'd'],
      angle: THREE.MathUtils.degToRad(90),
    },
    {
      meshIds: [2],
      axis: ['d', 'a'],
      angle: THREE.MathUtils.degToRad(90),
    },
  ];

  private meshes: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.MeshStandardMaterial
  >[];

  private meshesRotation: THREE.Euler[];

  private vertices: IVertices;

  private angularSpeed = Math.PI / 2;

  private angleRotated = 0; // in radians

  /**
   * Paper width
   */
  private width: number;

  /**
   * Paper height
   */
  private length: number;

  private foldInstructionsText: string;

  private controller: Controller = new Controller(this, this.clock);

  constructor(scene: THREE.Scene, width: number, length: number) {
    super();
    this.scene = scene;
    this.width = width;
    this.length = length;
    this.foldInstructionsText = foldInstructionsText;
    // this.foldInstructionsText = 'a to e V\nc around [e,b] M';

    this.vertices = this.generateVertices();

    // this.meshes = this.generateMeshes();

    const foldInstructions = this.getFoldInstructions();


    // let fig1 = [
    //   { x: 100, y: 200  },
    //   { x: 300, y: 150  },
    //   { x: 300, y: 250  }
    // ];
    
    // let fig2 = [
    //   { x: 200, y: 100  },
    //   { x: 200, y: 300  },
    //   { x: 350, y: 300  },
    //   { x: 350, y: 100  }
    // ];


    // let fig1 = [[100,200],[300,150],[300,250]];
    // let fig2 = [[200,100],[200,300],[350,300],[350,100]];

    // for (let i = 0; i<fig2.length; i++) {
    //   fig2[i][0] += 100;

    // }


    // const intersection =  MathHelpers.checkIfCoplanarFacesIntersect(fig1, fig2);


    // const intersection = PolygonIntersectionHelper.intersect(fig1, fig2);

    [this.meshes, this.meshInstructions] = OrigamiSolver.solveOrigami(width, length, foldInstructions);

    this.meshesRotation = this.meshes.map((mesh) => mesh.rotation.clone());

    /**
     * Adds the meshes to the group
     */
    this.add(...this.meshes);

    /**
     * Adds the meshes to the scene
     */
    this.scene.add(...this.meshes);
  }

  private getFoldInstructions(): string[] {
    return this.foldInstructionsText.split('\n');
  }

  /**
   * Generates the vertices of the origami
   */
  private generateVertices(): IVertices {
    return MathHelpers.shiftPoints(
      {
        a: [0, 0, 0],
        b: [0, this.length, 0],
        c: [this.width / 2, this.length / 2, 0],
        d: [this.width, this.length, 0],
        e: [this.width, 0, 0],
      },
      -this.width / 2,
      -this.length / 2,
    );
  }

  /**
   * Generates meshes for each plane geometry and returns and array of meshes
   */
  private generateMeshes(): THREE.Mesh<OrigamiPlaneGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap>[] {
    const geometry1 = new OrigamiPlaneGeometry([this.vertices.a, this.vertices.b, this.vertices.c]);
    const mesh1 = new THREE.Mesh(
      geometry1,
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
      })
    );
    const geometry2 = new OrigamiPlaneGeometry([this.vertices.c, this.vertices.d, this.vertices.b]);
    const mesh2 = new THREE.Mesh(
      geometry2,
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
      })
    );
    const geometry3 = new OrigamiPlaneGeometry([this.vertices.a, this.vertices.e, this.vertices.d]);
    const mesh3 = new THREE.Mesh(
      geometry3,
      new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide,
      })
    );
    [geometry1, geometry2, geometry3].forEach((geometry) => geometry.computeVertexNormals());

    return [mesh1, mesh2, mesh3];
  }

  /**
   * Plays the animation
   */
  public playAnimationStep(): void {
    const instruction = this.meshInstructions[this.controller.currentStep];
    const deltaTime = this.clock.getDelta();
    let angle_to_rotate = this.angularSpeed * deltaTime;

    if (this.angleRotated + angle_to_rotate < instruction.angle) {
      this.rotate(angle_to_rotate);
      this.angleRotated += angle_to_rotate;
    } else {
      angle_to_rotate = instruction.angle - this.angleRotated;
      this.rotate(angle_to_rotate);
      this.angleRotated = 0;
      this.controller.increaseStepBy(1);
      this.controller.pauseAnimation();
    }
  }

  /**
   * Rotates the meshes
   * @param angle
   */
  public rotate(angle: number): void {
    const instruction = this.meshInstructions[this.controller.currentStep];
    const vecA = new THREE.Vector3(...this.vertices[instruction.axis[0]]);
    const vecB = new THREE.Vector3(...this.vertices[instruction.axis[1]]);
    const vec = new THREE.Vector3();
    vec.copy(vecB).sub(vecA).normalize();

    for (const i of instruction.meshIds) {
      this.meshes[i].position.sub(vecA);
      this.meshes[i].rotateOnWorldAxis(vec, angle);
      this.meshes[i].position.add(vecA);
    }
  }

  /**
   * Resets the origami to its initial state
   */
  public resetOrigami(): void {
    this.meshesRotation.forEach(({ x, y, z, order }, i) => this.meshes[i].rotation.set(x, y, z, order));
    this.angleRotated = 0;
  }

  /**
   * Updates the origami
   */
  public update(): void {
    this.controller.update();
  }

}