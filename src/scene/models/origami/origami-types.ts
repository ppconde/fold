export interface IMeshInstruction {
    meshIds: number[];
    axis: string[];
    angle: number;
}

export type IVertices = {
    [key in string]: number[];
};

export type IFace = string[];

export interface IParseTranslation {
    regex: RegExp;
    from: number[];
    to: number[];
    sense: number[];
}

export interface IParseRotation {
    regex: RegExp;
    from: number[];
    axis: number[];
    sense: number[];
    angle: number[];
}

