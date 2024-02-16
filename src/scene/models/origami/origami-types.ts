export interface IMeshInstruction {
    meshIds: number[];
    axis: string[];
    angle: number;
}

export interface IFaceRotationInstruction {
    faces: string[][];
    axis: string[];
    angle: number;
}

export type IVertices = {
    [key in string]: number[];
}

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

export type TranslationKeys = keyof Pick<IParseTranslation, 'from' | 'to' | 'sense'>;

export interface TranslationValues {
    startNodes: string[];
    endNodes: string[];
    sense: 'V' | 'M';
}

export type IFaceGraph = Record<number, Record<number, 1|-1>>;

export interface IOrigamiCoordinates {
    points: IVertices,
    faces: string[][],
    pattern: IVertices,
    faceOrder: IFaceGraph
}

export interface IintersectionPoint {
    edge: string[], 
    coord: number[]
}

export type IintersectionLine = IintersectionPoint[];

export type IOrigamiGraph = Record<string, Record<string, number>>;

export type IOrigamiMesh = THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.MeshStandardMaterial>;


export interface IPlane {
    point: number[],
    versor: number[];
}

export interface IParsingInstruction {
    translation: IParseTranslation,
    rotation: IParseRotation,
}

// export type IPolygonPoint = {'x':number,'y':number};

// export type IPolygonPoint = Record<string,number>

export interface IPolygonPoint {x: any, y: any, t?: any};

export type IPolygonEdge = [IPolygonPoint, IPolygonPoint]

export type IPolygon = [IPolygonPoint, IPolygonPoint, IPolygonPoint, ...IPolygonPoint[]];

export interface IPolygonLabel {
    loc: string,
    theta?: number,
    t?: number
};
