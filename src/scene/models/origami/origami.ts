import * as THREE from 'three';
import { AnimationDirection } from '../../controllers/controller';
import { Controller } from '../../controllers/controller';
import { MathHelper } from '../../helpers/math-helper';
import { PlaneGeometry } from '../plane-geometry';
import { IMeshInstruction, IVertices } from './origami-types';
import { Outline } from '../line';
import { Point } from '../point';

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

  public material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0.1,
    color: 0xfbf6ef
  });

  private meshes: THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.MeshStandardMaterial>[];

  private meshesRotation: THREE.Euler[];

  private vertices: IVertices;

  private angularSpeed = Math.PI / 2;

  private angleRotated = 0; // in radians

  private debug = window.debug;

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

    if (this.debug.active) {
      this.addDebug();
    }
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
  private generateMeshes(): THREE.Mesh<PlaneGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap>[] {
    const planeVertices = [
      [this.vertices.a, this.vertices.b, this.vertices.c],
      [this.vertices.c, this.vertices.d, this.vertices.b],
      [this.vertices.a, this.vertices.e, this.vertices.d]
    ];

    return planeVertices.map((vertices) => {
      const geometry = new PlaneGeometry(vertices, this.width, this.height);
      const outline = new Outline(geometry, this.width, this.height);
      const point = new Point(geometry);
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.add(outline);
      mesh.add(point);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      return mesh;
    });
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
