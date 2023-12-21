import * as THREE from 'three';
import { Controller } from '../../controllers/controller';
import { MathHelper } from '../../helpers/math-helper';
import { OrigamiPlaneGeometry } from './origami-plane-geometry';
import { IMeshInstruction, IVertices } from './origami-types';

export class Origami extends THREE.Group {

  private clock = new THREE.Clock();

  private scene: THREE.Scene;

  /**
   * @todo - It should be set in the constructor
   */
  private meshInstructions: IMeshInstruction[] = [
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

  private meshesRotation: THREE.Vector3[];

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
  private height: number;

  private controller: Controller = new Controller();

  constructor(scene: THREE.Scene, width: number, height: number) {
    super();
    this.scene = scene;
    this.width = width;
    this.height = height;

    this.vertices = this.generateVertices();

    this.meshes = this.generateMeshes();

    this.meshesRotation = this.meshes.map((mesh) => mesh.position);

    /**
     * Adds the meshes to the group
     */
    this.add(...this.meshes);

    /**
     * Adds the meshes to the scene
     */
    this.scene.add(...this.meshes);
  }

  /**
   * Generates the vertices of the origami
   */
  private generateVertices(): IVertices {
    return MathHelper.shiftPoints(
      {
        a: [0, 0, 0],
        b: [0, this.height, 0],
        c: [this.width / 2, this.height / 2, 0],
        d: [this.width, this.height, 0],
        e: [this.width, 0, 0],
      },
      -this.width / 2,
      -this.height / 2,
    );
  }

  /**
   * Generates meshes for each plane geometry and returns and array of meshes
   */
  private generateMeshes(): THREE.Mesh<OrigamiPlaneGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap>[] {
    const mesh1 = new THREE.Mesh(
      new OrigamiPlaneGeometry([this.vertices.a, this.vertices.b, this.vertices.c]),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
      })
    );
    const mesh2 = new THREE.Mesh(
      new OrigamiPlaneGeometry([this.vertices.c, this.vertices.d, this.vertices.b]),
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
      })
    );
    const mesh3 = new THREE.Mesh(
      new OrigamiPlaneGeometry([this.vertices.a, this.vertices.e, this.vertices.d]),
      new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide,
      })
    );

    return [mesh1, mesh2, mesh3];
  }

  /**
   * Plays the animation
   */
  private playAnimation(): void {
    const { currentStep } = this.controller.animationControls;
    const instruction = this.meshInstructions[currentStep];
    const deltaTime = this.clock.getDelta();
    let angle_to_rotate = this.angularSpeed * deltaTime;

    if (this.angleRotated + angle_to_rotate < instruction.angle) {
      this.rotate(angle_to_rotate);
      this.angleRotated += angle_to_rotate;
    } else {
      angle_to_rotate = instruction.angle - this.angleRotated;
      this.rotate(angle_to_rotate);
      this.controller.increaseStepBy(1);
      this.controller.pauseAnimation();
      this.angleRotated = 0;
    }
  }

  /**
   * Rotates the meshes
   * @param angle
   */
  private rotate(angle: number): void {
    const { currentStep } = this.controller.animationControls;
    const instruction = this.meshInstructions[currentStep];
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
  private resetOrigami(): void {
    this.meshesRotation.forEach((rotation, i) => this.meshes[i].rotation.set(...rotation.toArray()));
    this.angleRotated = 0;
  }

  /**
   * Updates the origami
   */
  public update(): void {
    const { controller } = this;

    if (controller.shouldDisablePlay(this.meshInstructions.length)) {
      this.clock.stop();
      controller.disablePlay();
    } else if (controller.isStopped()) {
      this.clock.stop();
      this.resetOrigami();
    } else if (!controller.isPlayingAnimation()) {
      this.clock.start();
      return;
    } else {
      !this.clock.running && this.clock.start();
      this.playAnimation();
    }
  }
}
