import { Lights, LightsHelpers } from '../scene/lights/lights-types';

export class TypeGuards {
    public static isLightHelper(light: Lights): light is LightsHelpers {
        return light.type === 'DirectionalLightHelper' || light.type === 'PointLightHelper' || light.type === 'SpotLightHelper';
    }
}