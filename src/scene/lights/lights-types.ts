export type LightsType = 'AmbientLight' | 'DirectionalLight';

export type LightsHelpers = THREE.DirectionalLightHelper | THREE.PointLightHelper | THREE.SpotLightHelper;

export type Lights = THREE.Light | THREE.DirectionalLight | THREE.AmbientLight | LightsHelpers;

export type LightKey = `Amb-${number}` | `Dir-${number}` | `Point-${number}` | `Spot-${number}`;

export const LightsTypes = {
  AMBIENT_LIGHT: 'AmbientLight',
  DIRECTIONAL_LIGHT: 'DirectionalLight',
  POINT_LIGHT: 'PointLight',
  SPOT_LIGHT: 'SpotLight',
};
