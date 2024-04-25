import * as THREE from 'three';
import { Controller } from '../../controllers/controller';
import { IMeshInstruction, IVertices } from './origami-types';
import { OrigamiSolver } from './origami-solver';
import foldInstructionsText from '../../../instructions/paper-plane.text'

export class Origami extends THREE.Group {

  private clock = new THREE.Clock();

  private scene: THREE.Scene;

  private meshes: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.MeshStandardMaterial
  >[];

  public meshInstructions: IMeshInstruction[];

  private meshesRotation: THREE.Euler[];

  private vertices: IVertices;

  private angularSpeed = Math.PI / 2;

  private angleRotated = 0; // in radians

  private foldInstructionsText: string;

  private controller: Controller = new Controller(this, this.clock);

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;

    // Get fold instructions
    this.foldInstructionsText = foldInstructionsText;
    const foldInstructions = this.getFoldInstructions();

    // Find animation instructions
    [this.meshes, this.meshInstructions] = OrigamiSolver.solveOrigami(foldInstructions);
    this.vertices = {a: [0,0,0]}; // Set placeholder. This information should come from OrigamiSolver.solveOrigami(). Grouped with the meshes?

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
  }

  private getFoldInstructions(): string[] {
    return this.foldInstructionsText.split('\n');
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