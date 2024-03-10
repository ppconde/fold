import * as THREE from 'three';
import { AnimationDirection } from '../../controllers/controller';
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
  public meshInstructions: IMeshInstruction[] = [
    {
      meshIds: [0, 1],
      axis: ['a', 'd'],
      angle: THREE.MathUtils.degToRad(90)
    },
    {
      meshIds: [2],
      axis: ['d', 'a'],
      angle: THREE.MathUtils.degToRad(90)
    }
  ];

  private meshes: THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.MeshStandardMaterial>[];

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
  private height: number;

  private controller: Controller = new Controller(this, this.clock);

  constructor(scene: THREE.Scene, width: number, height: number) {
    super();
    this.scene = scene;
    this.width = width;
    this.height = height;

    this.vertices = this.generateVertices();

    this.meshes = this.generateMeshes();

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
        e: [this.width, 0, 0]
      },
      -this.width / 2,
      -this.height / 2
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
        side: THREE.DoubleSide
      })
    );
    const geometry2 = new OrigamiPlaneGeometry([this.vertices.c, this.vertices.d, this.vertices.b]);
    const mesh2 = new THREE.Mesh(
      geometry2,
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide
      })
    );
    const geometry3 = new OrigamiPlaneGeometry([this.vertices.a, this.vertices.e, this.vertices.d]);
    const mesh3 = new THREE.Mesh(
      geometry3,
      new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide
      })
    );
    [geometry1, geometry2, geometry3].forEach((geometry) => geometry.computeVertexNormals());

    return [mesh1, mesh2, mesh3];
  }

  /**
   * Plays the animation
   */
  public playAnimationStep(step: number, direction: AnimationDirection): void {
    const instruction = this.meshInstructions[step];
    const deltaTime = this.clock.getDelta();
    let angle_to_rotate = this.angularSpeed * deltaTime * this.controller.animationSpeed;

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
