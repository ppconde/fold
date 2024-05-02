import * as THREE from 'three';
import { AnimationDirection } from '../../controllers/controller';
import { Controller } from '../../controllers/controller';
import { IMeshInstruction, IVertices } from './origami-types';
import { OrigamiSolver } from './origami-solver';
import foldInstructionsText from '../../../instructions/envelope.text';
import { MathHelpers } from './math-helpers';

export class Origami extends THREE.Group {
  private clock = new THREE.Clock();

  private scene: THREE.Scene;

  private meshes: THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.MeshStandardMaterial>[];

  public material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0.1,
    color: 0xfbf6ef
  });

  public meshInstructions: IMeshInstruction[] = [];

  public lineInstructions: string[][][];

  public pointInstructions: string[][];

  private meshesRotation: THREE.Euler[];

  private vertices: IVertices;

  private angularSpeed = Math.PI / 2;

  private angleRotated = 0; // in radians

  private foldInstructionsText: string;

  private controller: Controller = new Controller(this, this.clock);

  private debug = window.debug;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;

    // Get fold instructions
    this.foldInstructionsText = foldInstructionsText;
    const foldInstructions = this.getFoldInstructions();

    this.meshInstructions = [];

    // Find animation instructions
    // const instructionMaxId = foldInstructions.length - 1;
    const instructionMaxId = 6;
    const foldInstructionsSelection = MathHelpers.indexArray(foldInstructions, [...Array(instructionMaxId + 1).keys()]);
    [this.meshes, this.meshInstructions, this.lineInstructions, this.pointInstructions] =
      OrigamiSolver.solveOrigami(foldInstructionsSelection);

    // this.vertices = {a: [0,0,0]}; // Set placeholder. This information should come from OrigamiSolver.solveOrigami(). Grouped with the meshes?

    // const instructionMaxId = 6;
    // [this.meshes, this.meshInstructions, this.lineInstructions, this.pointInstructions, this.origamiCoordinatesSave] = OrigamiSolver.solveOrigami(MathHelpers.indexArray(foldInstructions, [...Array(instructionMaxId+1).keys()]));

    // this.vertices = {a: [0,0,0]}; // Set placeholder. This information should come from OrigamiSolver.solveOrigami(). Grouped with the meshes?

    this.meshInstructions = [];
    // Exemplo de input 3
    const origamiCoordinates = {
      points: { 'a': [0, 0, 0], 'b': [2, 0, 0], 'c': [2, 2, 0], 'd': [1, 2, 0], 'e': [1, 1, 0], 'f': [0, 1, 0], 'g': [2, 0, 2], 'h': [2, 2, 2] },
      faces: [['a', 'b', 'c', 'd', 'e', 'f'], ['b', 'g', 'h', 'c']],
      pattern: { 'a': [0, 0], 'b': [2, 0], 'c': [2, 2], 'd': [1, 2], 'e': [1, 1], 'f': [0, 1], 'g': [4, 0], 'h': [4, 2] },
      faceOrder: { 0: {}, 1: {} }
    };

    this.meshes = OrigamiSolver.createFaceMeshes(origamiCoordinates);

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

    if (this.debug.active) {
      this.addDebug();
    }
  }

  private getFoldInstructions(): string[] {
    return this.foldInstructionsText.split('\n');
  }

  /**
   * Adds the debug interface for the origami
   */
  private addDebug(): void {
    const origamiFolder = this.debug.ui!.addFolder('Origami ');
    origamiFolder.add(this.material, 'roughness').min(0).max(1).step(0.01);
    origamiFolder.add(this.material, 'metalness').min(0).max(1).step(0.01);
    origamiFolder.addColor(this.material, 'color');
  }

  /**
   * Plays the animation
   */
  public playAnimationStep(step: number, direction: AnimationDirection): void {
    const instruction = this.meshInstructions[step];
    const deltaTime = this.clock.getDelta();
    let angle_to_rotate = this.angularSpeed * deltaTime * this.controller.speedMultiplier;

    if (this.angleRotated + angle_to_rotate < instruction.angle) {
      this.rotate(angle_to_rotate, instruction, direction);
      this.angleRotated += angle_to_rotate;
    } else {
      angle_to_rotate = instruction.angle - this.angleRotated;
      this.rotate(angle_to_rotate, instruction, direction);
      this.angleRotated = 0;
      this.controller.finishAnimation(direction);
    }
  }

  /**
   * Rotates the meshes
   * @param angle
   */
  public rotate(angle: number, instruction: IMeshInstruction, direction: AnimationDirection): void {
    const vecA = new THREE.Vector3(...this.vertices[instruction.axis[0]]);
    const vecB = new THREE.Vector3(...this.vertices[instruction.axis[1]]);
    const vec = new THREE.Vector3();
    vec.copy(vecB).sub(vecA).normalize();

    if (direction === AnimationDirection.Reverse) {
      angle *= -1;
    }

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

  /**
   * Disposes both geometry and material of each mesh
   * These need to be disposed to avoid memory leaks
   */
  public dispose(): void {
    this.meshes.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }
}
