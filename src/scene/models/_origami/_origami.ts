import * as THREE from 'three';
import { AnimationDirection } from '../../controllers/controller';
import { Controller } from '../../controllers/controller';
import { MathHelpers } from './math-helpers';
import { IFaceInstruction as IFaceInstruction, IPoint } from './origami.types';
import { OrigamiSolver } from './origami-solver';
import foldInstructionsText from '../../../instructions/envelope.text';
import { Face } from '../face';

export class Origami extends THREE.Group {
  private clock = new THREE.Clock();

  private scene: THREE.Scene;

  private debugOptions = {
    enablePoints: true,
    animateOutlines: true,
    material: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      roughness: 0.95,
      metalness: 0.1,
      color: 0xfbf6ef
    })
  };

  private faces: Face[];

  public faceInstructions: IFaceInstruction[] = [];

  public lineInstructions: string[][][];

  public pointInstructions: string[][];

  private facesRotation: THREE.Euler[];

  private points: IPoint<THREE.Vector3>;

  private angularSpeed = Math.PI / 2;

  private angleRotated = 0; // in radians

  private foldInstructionsText: string;

  private controller: Controller;

  private debug = window.debug;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;

    // Get fold instructions
    this.foldInstructionsText = foldInstructionsText;
    const foldInstructions = this.getFoldInstructions();

    const instructionMaxId = 6;
    const foldInstructionsSelection = MathHelpers.indexArray(foldInstructions, [...Array(instructionMaxId + 1).keys()]);
    [this.faces, this.faceInstructions, this.lineInstructions, this.pointInstructions] =
      OrigamiSolver.solveOrigami(foldInstructionsSelection);
    this.checkPointsOutlines(0);

    this.controller = new Controller(this, this.clock);

    this.points = this.getAllPoints();

    // Save faces original position
    this.facesRotation = this.faces.map((face) => face.rotation.clone());

    /**
     * Adds the faces to the group
     */
    this.add(...this.faces);

    /**
     * Adds the faces to the scene
     */
    this.scene.add(...this.faces);

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
    origamiFolder.add(this.debugOptions.material, 'roughness').min(0).max(1).step(0.01);
    origamiFolder.add(this.debugOptions.material, 'metalness').min(0).max(1).step(0.01);
    origamiFolder.addColor(this.debugOptions.material, 'color');
    origamiFolder.add(this.debugOptions, 'enablePoints');
    origamiFolder.add(this.debugOptions, 'animateOutlines');
  }

  private getAllPoints(): IPoint<THREE.Vector3> {
    const points: { [key: string]: THREE.Vector3 } = {};

    // const x = this.faces.flatMap((face) => face.traverse((obj) => {
    //   const position = obj.getObjectByName('Point')?.position;
    //   points['Point']
    // }));
    this.faces.forEach((face) => {
      const facePoints = face.getPoints();

      facePoints.children.forEach((point) => {
        if (!Object.keys(points).includes(point.name)) {
          points[point.name.toLowerCase()] = point.position;
        }
      });
    });

    return points;
  }

  public checkPointsOutlines(step: number) {
    this.faces.forEach((face) => face.disableVisibility());

    const visiblePoints = this.pointInstructions[step];
    for (const pointIndex of visiblePoints) {
      for (const face of this.faces) {
        const point = face.getPoint(pointIndex);
        if (point !== undefined) {
          point.visible = true;
          break;
        }
      }
    }

    const visibleLines = this.lineInstructions[step];
    for (const lineIndex of visibleLines) {
      for (const face of this.faces) {
        const point = face.getOutline(lineIndex);
        if (point !== undefined) {
          point.visible = true;
          break;
        }
      }
    }
  }

  /**
   * Plays the animation
   */
  public playAnimationStep(step: number, direction: AnimationDirection): void {
    const instruction = this.faceInstructions[step];
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
   * Rotates the faces
   * @param angle
   */
  public rotate(angle: number, instruction: IFaceInstruction, direction: AnimationDirection): void {
    const vecA = this.points[instruction.axis[0]];
    const vecB = this.points[instruction.axis[1]];
    const vec = new THREE.Vector3();
    vec.copy(vecB).sub(vecA).normalize();

    if (direction === AnimationDirection.Reverse) {
      angle *= -1;
    }

    for (const i of instruction.meshIds) {
      this.faces[i].translateX(vecA.x);
      this.faces[i].translateY(vecA.y);
      this.faces[i].translateZ(vecA.z);
      this.faces[i].rotateOnWorldAxis(vec, angle);
      this.faces[i].translateX(-vecA.x);
      this.faces[i].translateY(-vecA.y);
      this.faces[i].translateZ(-vecA.z);
    }
  }

  /**
   * Resets the origami to its initial state
   */
  public resetOrigami(): void {
    this.facesRotation.forEach(({ x, y, z, order }, i) => this.faces[i].rotation.set(x, y, z, order));
    this.angleRotated = 0;
  }

  /**
   * Updates the origami
   */
  public update(): void {
    this.controller.update();
  }
}
