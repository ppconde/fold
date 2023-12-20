import * as THREE from 'three';
import { gui } from '../../helpers/gui';
import { LightKey, Lights, LightsHelpers, LightsTypes } from './lights-types';

export class LightsManager {
  scene: THREE.Scene;
  public lightsMap: Map<LightKey, Lights> = new Map();
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setLights();
    this.addDebugInterface();
    this.addHelpers();
    this.addLightsToScene();
  }

  /**
   * Sets the lights for the scene
   */
  private setLights(): void {
    this.lightsMap.set('Amb-1', new THREE.AmbientLight(0xfffce0, 1));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(0, 10, 2);
    this.lightsMap.set('Dir-1', directionalLight);
  }

  /**
   * Adds lights to the scene (also light helpers)
   */
  private addLightsToScene(): void {
    this.lightsMap.forEach((lightObj) => this.scene.add(lightObj));
  }

  /**
   * Adds the debug interface for the lights
   */
  private addDebugInterface(): void {
    const lightsFolder = gui.addFolder('Lights');
    this.lightsMap.forEach((lightObj, key) => {
      const folder = lightsFolder.addFolder(key);
      folder.add(lightObj, 'intensity').min(0).max(10).step(0.01);
      if (lightObj.type !== LightsTypes.AMBIENT_LIGHT) {
        folder.add(lightObj.position, 'x').min(-30).max(30).step(1);
        folder.add(lightObj.position, 'y').min(-30).max(30).step(1);
        folder.add(lightObj.position, 'z').min(-30).max(30).step(1);
      }
      folder.add(lightObj, 'visible');
      folder.addColor(lightObj, 'color');
    });
  }

  /**
   * Adds helpers for the lights
   */
  private addHelpers(): void {
    const helpers: LightsHelpers[] = [];
    this.lightsMap.forEach((lightObj, key) => {
      const color = new THREE.Color().setHSL(Number(key), 1, 0.5).getHex();

      switch (lightObj.type) {
        case LightsTypes.DIRECTIONAL_LIGHT:
          helpers.push(new THREE.DirectionalLightHelper(lightObj as THREE.DirectionalLight, 5, color));
          break;
        case LightsTypes.POINT_LIGHT:
          helpers.push(new THREE.PointLightHelper(lightObj as THREE.PointLight, 5, color));
          break;
        case LightsTypes.SPOT_LIGHT:
          helpers.push(new THREE.SpotLightHelper(lightObj as THREE.SpotLight, color));
          break;
        default:
          break;
      }
    });

    helpers.forEach((helper, i) => {
      switch (helper.type) {
        case LightsTypes.DIRECTIONAL_LIGHT:
          this.lightsMap.set(`Dir-${i}`, helper);
          break;
        case LightsTypes.POINT_LIGHT:
          this.lightsMap.set(`Point-${i}`, helper);
          break;
        case LightsTypes.SPOT_LIGHT:
          this.lightsMap.set(`Spot-${i}`, helper);
          break;
        default:
          break;
      }
    });
  }

  /**
   * To update the lights during runtime
   */
  public update(): void {
    // Do something
  }

}
