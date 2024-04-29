import * as THREE from 'three';
import { Controller } from '../../controllers/controller';
import { IMeshInstruction, IVertices, IOrigamiCoordinates} from './origami-types';
import { OrigamiSolver } from './origami-solver';
// import foldInstructionsText from '../../../instructions/paper-plane.text'
import foldInstructionsText from '../../../instructions/envelope.text'
import {meshInstructionCreator} from '../../../tests/createMeshInstructions'
import { MathHelpers } from './math-helpers';
import { FoldSolver } from './fold-solver';

export class Origami extends THREE.Group {

  private clock = new THREE.Clock();

  private scene: THREE.Scene;

  private meshes: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.MeshStandardMaterial
  >[];

  public meshInstructions: IMeshInstruction[];

  public lineInstructions: string[][][];

  public pointInstructions: string[][];

  private meshesRotation: THREE.Euler[];

  private vertices: IVertices;

  private angularSpeed = Math.PI / 2;

  private angleRotated = 0; // in radians

  private foldInstructionsText: string;

  private controller: Controller = new Controller(this, this.clock);

  private origamiCoordinatesSave: IOrigamiCoordinates[];

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;

    // Get fold instructions
    this.foldInstructionsText = foldInstructionsText;
    const foldInstructions = this.getFoldInstructions();

    // Test
    // meshInstructionCreator.test();

    // Find animation instructions
    // const instructionMaxId = foldInstructions.length - 1;
    const instructionMaxId = 6;
    const foldInstructionsSelection = MathHelpers.indexArray(foldInstructions, [...Array(instructionMaxId+1).keys()]);
    [this.meshes, this.meshInstructions, this.lineInstructions, this.pointInstructions, this.origamiCoordinatesSave] = OrigamiSolver.solveOrigami(foldInstructionsSelection);

    // this.vertices = {a: [0,0,0]}; // Set placeholder. This information should come from OrigamiSolver.solveOrigami(). Grouped with the meshes?

    this.vertices = {};

    // Save meshes original position
    this.meshesRotation = this.meshes.map((mesh) => mesh.rotation.clone());

    /**
     * Adds the meshes to the group
     */
    this.add(...this.meshes);

    /**
     * Adds the meshes to the scene
     */
    this.scene.add(...this.meshes);
;
  }

  private getFoldInstructions(): string[] {
    return this.foldInstructionsText.split('\n');
  }

  /**
   * Plays the animation
   */
  public playAnimationStep(): void {

    // Placeholder until we find a way to put points together with meshes
    const origamiCoordinates = this.origamiCoordinatesSave[this.controller.currentStep];
    const points = origamiCoordinates.points;
    for (const node of Object.keys(points)) {
      this.vertices[node] = points[node];
    }

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
      this.meshes[i].translateX(vecA.x);
      this.meshes[i].translateY(vecA.y);
      this.meshes[i].translateZ(vecA.z);
      this.meshes[i].rotateOnWorldAxis(vec, angle);
      this.meshes[i].translateX(-vecA.x);
      this.meshes[i].translateY(-vecA.y);
      this.meshes[i].translateZ(-vecA.z);
    }
  }

  // public translateMesh(mesh: THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>,THREE.MeshStandardMaterial>, vecTHREE: THREE.Vector3, vectorSense: 1|-1) {
  //   const vec = [vecTHREE.x, vecTHREE.y, vecTHREE.z];
  //   const N = mesh.geometry.attributes.position.array.length / 3;

  //   let c = -1;
  //   for (let i = 0; i < N; i++) {
  //     let point = [];
  //     for (let j = 0; j < 3; j++) {
  //       c++;
  //       point.push(mesh.geometry.attributes.position.array[c])
        
  //     }
  //     point = MathHelpers.addArray(point, MathHelpers.multiplyArray(vec, vectorSense));
  //     for (let j = 0; j < 3; j++) {
  //       mesh.geometry.attributes.position.array[c-2+j] = point[j];
  //     }
  //   }
  //   return mesh;
  // }

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