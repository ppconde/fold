import { ColorRepresentation } from "three";
import { LightsType, LightsTypes } from "./lights-types";

interface IColorArgs {
  color?: ColorRepresentation;
  intensity?: number;
}

interface ILightProps {
  position?: [number, number, number];
  target?: [number, number, number];
  castShadow?: boolean;
  intensity?: number;
  color?: number;
}

interface ILightConfig {
  enabled: boolean;
  key: string;
  type: LightsType;
  args: IColorArgs | undefined;
  props: ILightProps;
}

/**
 * Lights configuration file, insert more light objects in order to create more lights for the scene
 * The props are configurable properties that are represented in each light object
 */

export const LightsConfig: ILightConfig[] = [
  {
    enabled: true,
    key: "Dir-1",
    type: LightsTypes.DIRECTIONAL_LIGHT,
    args: {
      color: 0xfc033d,
      intensity: 5,
    },
    props: {
      position: [5, 5, 5],
      castShadow: true,
    },
  },
  {
    enabled: true,
    key: "Amb-1",
    type: LightsTypes.AMBIENT_LIGHT,
    args: {
      color: 0xffffff,
      intensity: 5,
    },
    props: {},
  },
];
