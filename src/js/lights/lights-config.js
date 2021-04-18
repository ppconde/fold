import { LightsTypes } from './lights-types';

/**
 * Lights configuration file, insert more light objects in order to create more lights for the scene
 * The props are configurable properties that are represented in each light object
 */
export const LightsConfig = [
    {
        enabled: true,
        key: 'Dir-1',
        type: LightsTypes.DIRECTIONAL_LIGHT,
        props: {
            color: 0xFFFFFF,
            intensity: 5,
            castShadow: true,
            shadow: {
                bias: -0.001,
            },
        },
    },
    {
        enabled: true,
        key: 'Amb-1',
        type: LightsTypes.AMBIENT_LIGHT,
        props: {
            color: 0xFFFFFF,
            intensity: 5,
        },
    },
]