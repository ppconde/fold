import { LightsTypes, LightsTypesHelper } from '../scene/lights/lights-constants';
import { Lights, LightsHelpers, LightsObjects } from '../scene/lights/lights-types';


/**
 * Type guards used for type narrowing
 * @see https://www.typescriptlang.org/docs/handbook/2/narrowing.html
 */
export class TypeGuards {

    /**
     * Checks if the given object is of type Lights
     * @param light
     */
    public static isLight(light: LightsObjects): light is Lights {
        return light.type === LightsTypes.DIRECTIONAL_LIGHT
            || light.type === LightsTypes.AMBIENT_LIGHT
            || light.type === LightsTypes.POINT_LIGHT
            || light.type === LightsTypes.SPOT_LIGHT;
    }

    /**
     * Checks if the given object is of type LightsHelpers
     * @param light
     */
    public static isLightHelper(light: LightsObjects): light is LightsHelpers {
        return light.type === LightsTypesHelper.DIRECTIONAL_LIGHT
            || light.type === LightsTypesHelper.POINT_LIGHT
            || light.type === LightsTypesHelper.SPOT_LIGHT;
    }
}