import * as THREE from "three";
import { Controller } from "../controllers/controller";

interface IMeshInstruction {
  meshIds: number[];
  axis: string[];
  angle: number;
}

interface IPoints {
  [key: string]: number[];
}
/**
 * @todo: origami should extend Object3D
 */
export class Origami extends Controller {
  public clock = new THREE.Clock();

  private mesh_instructions = [] as IMeshInstruction[];

  private currentAngle = 0;

  private previousTime = 0;

  private points: IPoints;

  private meshes: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.MeshBasicMaterial,
    THREE.Object3DEventMap
  >[];

  private meshesRotation: THREE.Vector3[];

  private w: number;

  private angleRotated: number;

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    const width = 9;
    const generateGeometry = (points: number[][]) => {
      const arr = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i++) {
        const i3 = i * 3;
        arr[i3] = points[i][0];
        arr[i3 + 1] = points[i][1];
        arr[i3 + 2] = points[i][2];
      }
      return arr;
    };

    const geometry1 = new THREE.BufferGeometry();
    const geometry2 = new THREE.BufferGeometry();
    const geometry3 = new THREE.BufferGeometry();

    this.points = {
      a: [0, 0, 0],
      b: [0, width, 0],
      c: [length / 2, width / 2, 0],
      d: [length, width, 0],
      e: [length, 0, 0],
    };

    geometry1.setAttribute(
      "position",
      new THREE.BufferAttribute(
        generateGeometry([this.points.a, this.points.b, this.points.c]),
        3
      )
    );

    geometry2.setAttribute(
      "position",
      new THREE.BufferAttribute(
        generateGeometry([this.points.c, this.points.d, this.points.b]),
        3
      )
    );

    geometry3.setAttribute(
      "position",
      new THREE.BufferAttribute(
        generateGeometry([this.points.a, this.points.e, this.points.d]),
        3
      )
    );

    const material1 = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    const material2 = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    const material3 = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      side: THREE.DoubleSide,
    });

    const mesh1 = new THREE.Mesh(geometry1, material1);
    const mesh2 = new THREE.Mesh(geometry2, material2);
    const mesh3 = new THREE.Mesh(geometry3, material3);
    this.meshes = [mesh1, mesh2, mesh3];
    this.meshesRotation = this.meshes.map((mesh) => mesh.position);

    this.mesh_instructions = [
      {
        meshIds: [0, 1],
        axis: ["a", "d"],
        angle: THREE.MathUtils.degToRad(90),
      },
      { meshIds: [2], axis: ["d", "a"], angle: THREE.MathUtils.degToRad(90) },
    ];

    this.w = Math.PI / 2; // Angular velocity
    this.angleRotated = 0;

    this.scene.add(...this.meshes);
  }

  rotate = (angle: number) => {
    const { currentStep } = this.animationControls;
    const instruction = this.mesh_instructions[currentStep];
    const vecA = new THREE.Vector3(...this.points[instruction.axis[0]]);
    const vecB = new THREE.Vector3(...this.points[instruction.axis[1]]);
    const vec = new THREE.Vector3();
    vec.copy(vecB).sub(vecA).normalize();
    for (const i of instruction.meshIds) {
      this.meshes[i].position.sub(vecA);
      this.meshes[i].rotateOnWorldAxis(vec, angle);
      this.meshes[i].position.add(vecA);
    }
  };

  playAnim = (deltaTime: number) => {
    const { currentStep } = this.animationControls;
    const instruction = this.mesh_instructions[currentStep];
    let angle_to_rotate = this.w * deltaTime * 0.001;

    if (this.angleRotated + angle_to_rotate < instruction.angle) {
      this.rotate(angle_to_rotate);
      this.angleRotated += angle_to_rotate;
    } else {
      angle_to_rotate = instruction.angle - this.angleRotated;
      this.rotate(angle_to_rotate);
      this.increaseStepBy(1);
      this.pauseAnimation();
      this.angleRotated = 0;
    }
  };

  setInitialMeshesRotation = () => {
    this.meshesRotation.forEach((rotation: any, i: string | number) =>
      this.meshes[i].rotation.set(...rotation)
    );
    this.angleRotated = 0;
  };

  update = () => {
    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = elapsedTime - this.previousTime;
    this.previousTime = elapsedTime;

    if (this.shouldDisablePlay(this.mesh_instructions.length)) {
      this.disablePlay();
    } else if (this.isStopped()) {
      this.setInitialMeshesRotation();
    } else if (!this.isPlayingAnimation()) return;
    else this.playAnim(deltaTime);
  };
}
