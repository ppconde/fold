import * as THREE from 'three';

export type Lights = THREE.Light | THREE.DirectionalLight | THREE.AmbientLight | THREE.PointLight | THREE.SpotLight;

export type LightsHelpers = THREE.DirectionalLightHelper | THREE.PointLightHelper | THREE.SpotLightHelper;

export type LightsObjects = Lights | LightsHelpers;

export type LightKey = `Amb-${number}` | `Dir-${number}` | `Point-${number}` | `Spot-${number}`;

export type LightHelperKey =
  | `Amb-${number}-Helper`
  | `Dir-${number}-Helper`
  | `Point-${number}-Helper`
  | `Spot-${number}-Helper`;

export type LightsObjectsKeys = LightKey | LightHelperKey;
