import * as THREE from 'three';
import { LightsObjectsKeys, LightsObjects, LightsHelpers } from './lights-types';
import { TypeGuards } from '../../guards/type-guards';
import { LightsTypes, LightsTypesHelper } from './lights-constants';
import { debug } from '../../helpers/debug';
import { OBJECT_NAMES } from '../constants/object-names.constants';

export class LightsManager {
  public scene: THREE.Scene;

  public lightsMap: Map<LightsObjectsKeys, LightsObjects> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setLights();
    if (debug.active) {
      this.addHelpers();
      this.addDebugInterface();
    }
    this.addLightsToScene();
  }

  /**
   * Sets the lights for the scene
   */
  private setLights(): void {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.name = OBJECT_NAMES.DIRECTIONAL_LIGHT_1;
    directionalLight.position.set(60, 41, 45);
    directionalLight.lookAt(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0001;
    this.lightsMap.set('Dir-1', directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight2.name = OBJECT_NAMES.DIRECTIONAL_LIGHT_2;
    directionalLight2.position.set(-60, -3, -87);
    directionalLight2.lookAt(0, 0, 0);
    directionalLight2.castShadow = true;
    directionalLight2.shadow.mapSize.width = 2048;
    directionalLight2.shadow.mapSize.height = 2048;
    directionalLight2.shadow.bias = -0.0001;
    this.lightsMap.set('Dir-2', directionalLight2);


    const ambientLight = new THREE.AmbientLight(0xfeffeb, 1.5);
    ambientLight.name = OBJECT_NAMES.AMBIENT_LIGHT_1;
    this.lightsMap.set('Amb-1', ambientLight);
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
    const lightsFolder = debug.ui!.addFolder('Lights');
    for (const key of this.lightsMap.keys()) {
      const lightObj = this.lightsMap.get(key)!;
      /**
       * If the light is a helper, we just want to control its visibility
       */
      if (!lightObj || TypeGuards.isLightHelper(lightObj)) {
        const folder = lightsFolder.addFolder(key);
        lightObj.visible = false;
        folder.add(lightObj, 'visible');
        continue;
      }
      const folder = lightsFolder.addFolder(key);
      folder.add(lightObj, 'intensity').min(0).max(50).step(0.01);
      if (lightObj.type !== LightsTypes.AMBIENT_LIGHT) {
        folder.add(lightObj.position, 'x').min(-120).max(120).step(1);
        folder.add(lightObj.position, 'y').min(-120).max(120).step(1);
        folder.add(lightObj.position, 'z').min(-120).max(120).step(1);
      }
      folder.add(lightObj, 'visible').onFinishChange(() => {
        if (TypeGuards.isLight(lightObj)) {
          if (lightObj.type === LightsTypes.AMBIENT_LIGHT) {
            this.lightsMap.get(key)!.visible = lightObj.visible;
          }
        }
      });
      folder.addColor(lightObj, 'color');
    }
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

    helpers.forEach((helper, key) => {
      switch (helper.type) {
        case LightsTypesHelper.DIRECTIONAL_LIGHT:
          this.lightsMap.set(`Dir-${key + 1}-Helper`, helper);
          break;
        case LightsTypesHelper.POINT_LIGHT:
          this.lightsMap.set(`Point-${key + 1}-Helper`, helper);
          break;
        case LightsTypesHelper.SPOT_LIGHT:
          this.lightsMap.set(`Spot-${key + 1}-Helper`, helper);
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
    this.lightsMap.forEach((lightObj) => {
      if (lightObj.type === LightsTypes.DIRECTIONAL_LIGHT) {
        lightObj.lookAt(0, 0, 0);
      }
    });
  }
}
