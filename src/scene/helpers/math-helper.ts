import { IVertices } from '../models/origami/origami-types';

export class MathHelper {
  /**
   *@todo to add later with correct typing  
   */
  public static getFromFoldInstruction() {
    return;
  }

  /**
   * Shifts points by given values - used to center a given shape
   * @param points 
   * @param shiftX 
   * @param shiftY 
   */
  public static shiftPoints(points: IVertices, shiftX: number, shiftY: number): IVertices {
    return Object.keys(points).reduce((acc, key) => {
      acc[key] = [points[key][0] + shiftX, points[key][1] + shiftY, 0];
      return acc;
    }, {} as IVertices);
  }
}
