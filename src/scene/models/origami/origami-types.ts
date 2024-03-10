export interface IMeshInstruction {
  meshIds: number[];
  axis: string[];
  angle: number;
}

export type IVertices = {
  [key in string]: number[];
};
