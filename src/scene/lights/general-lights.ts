import * as THREE from "three";
import { LightsConfig } from "./lights-config";
import { LightsTypes } from "./lights-types";

type Lights = THREE.Light | THREE.DirectionalLight | THREE.AmbientLight;

export class GeneralLights {
  scene: any;
  public lightsMap: Map<string, Lights> = new Map();
  constructor(scene) {
    this.scene = scene;
    this.setLights();
    this.setLightsProperties();
  }

  /**
   * Creates light objects and adds it to lightsMap, according to the lights configuration file
   */
  setLights = () => {
    LightsConfig.forEach((light) => {
      if (light.enabled) {
        switch (light.type) {
          case LightsTypes.DIRECTIONAL_LIGHT:
            return this.lightsMap.set(
              light.key,
              new THREE.DirectionalLight(light.args)
            );
          case LightsTypes.AMBIENT_LIGHT:
            return this.lightsMap.set(
              light.key,
              new THREE.AmbientLight(light.args)
            );
          // Insert other light types if needed
        }
      }
    });
    this.addLightsToScene();
  };

  addLightsToScene = () => {
    this.lightsMap.forEach((lightObj) => {
      this.scene.add(lightObj);
    });
  };

  setLightsProperties = () => {
    LightsConfig.forEach((light) => {
      if (light.enabled) {
        const lightObj = this.lightsMap.get(light.key)!;
        Object.entries(light.props).forEach(([key, val]) => {
          switch (key) {
            case "position":
              lightObj.position.set(...val);
              break;
            case "target":
              lightObj.target.position.set(...val);
              lightObj.target.updateMatrixWorld();
              break;
            case "castShadow":
              lightObj.castShadow = val;
              break;
            case "intensity":
              lightObj.intensity = val;
              break;
            case "color":
              lightObj.color.setHex(val);
              break;
          }
        });
      }
    });
  };

  // if(light.enabled) {
  // 	let lightObj = this.lightsMap.get(light.key);
  // 	for (const [key, value] of Object.entries(light.props)) {
  // 		switch(key){
  // 			case "position":
  // 				lightObj.position.set(...value);
  // 				break;
  // 			case "target":
  // 				lightObj.target.position.set(...value);
  // 				lightObj.target.updateMatrixWorld();
  // 				break;
  // 			case "castShadow":
  // 				lightObj.castShadow = value;
  // 				break;
  // 			case "intensity":
  // 				lightObj.intensity = value;
  // 				break;
  // 			case "color":
  // 				lightObj.color.setHex(value);
  // 				break;
  // 		}
  // 	}
  // }

  // 	switch(true){
  // 		case "position" in light.props:
  // 			lightObj.position.set(...light.props.position);
  // 		case "target" in light.props:
  // 			console.log('what')
  // 			console.log(light.props)
  // 			console.log("target" in light.props)
  // 			console.log("laldp" in light.props)
  // 			lightObj.target.position.set(...light.props.target);
  // 			lightObj.target.updateMatrixWorld();
  // 		case "castShadow" in light.props:
  // 			lightObj.castShadow = light.props.castShadow;
  // 		case "intensity" in light.props:
  // 			lightObj.intensity = light.props.intensity;
  // 		case "color" in light.props:
  // 			light.color.setHex(light.props.color);
  // 		case "shadow" in light.props:
  // 			lightObj.shadow = light.props.shadow;
  // 	}
  // }

  // })

  // const dirLight1 = this.lightsMap.get('Dir-1');
  // dirLight1.position.set(10, 10, 10);
  // dirLight1.castShadow = true;
  // //dirLight1.target.position.set(0, 0, 0);
  // dirLight1.target.updateMatrixWorld();

  // // eslint-disable-next-line no-unused-vars
  // const ambLight1 = this.lightsMap.get('Amb-1');
  // }

  // setHelpers = () => {
  // 	this.helpersMap = new Map();
  // 	LightsConfig.forEach((light) => {
  // 		if(light.enabled) {
  // 			if(light.helpers){
  // 				switch(light.type) {
  // 				case LightsTypes.DIRECTIONAL_LIGHT:
  // 					return this.helpersMap.set(light.key, [new THREE.DirectionalLightHelper(this.lightsMap.get(light.key)), new THREE.CameraHelper(this.lightsMap.get(light.key).shadow.camera)]);
  // 				}
  // 			}
  // 		}
  // 	})
  // 	this.addHelpersToScene();
  // }

  // addHelpersToScene = () => {
  // 	this.helpersMap.get('Dir-1').forEach(helper => {
  // 		this.scene.add(helper)
  // 	});
  // }

  // addGUI = () => {
  // 	LightsConfig.forEach((light) => {
  // 		if(light.enabled) {
  // 			light.gui.forEach((guiKey) => {
  // 				if(light.gui[guiKey]){
  // 					switch(guiKey) {
  // 						case 'color':
  // 							gui.make('color', this.lightsMap.get(light.key));
  // 						case 'position':
  // 							gui.make('position', this.lightsMap.get(light.key), this.helpersMap.get(light.key));
  // 						case 'target':
  // 							gui.make('target', this.lightsMap.get(light.key), this.helpersMap.get(light.key));
  // 						case 'frostum':
  // 							gui.make('frostum', this.lightsMap.get(light.key).shadow.camera, this.helpersMap.get(light.key)[1]);
  // 					}
  // 				}
  // 			})
  // 		}
  // 	})
  // }

  update = () => {
    // Do something
  };
}
