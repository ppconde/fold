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
export type RotationKeys = keyof Pick<IParseRotation, 'from' | 'axis' | 'sense' | 'angle'>;

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

export interface IFaceLabels {
    rotate: boolean[];
    dontRotate: boolean[];
    divide: boolean[];
}

// Polygons:

export type Point = [number, number];

export type Vector = [number, number];

export type LineSegment = [Point, Point];

export type Corner = [Point, Point, Point];

export type Polygon = Point[];

export type PolygonRecord = Record<number, Polygon>;

export interface IEdge {
    polygonId: number;
    edgeId: number;
    lineSegment: LineSegment;
}

export interface ICorner {
    polygonId: number;
    cornerId: number;
    coords: Corner;
}

export interface IIntersectionEdgePoint {
    polygonId: number,
    edgeId: number,
    coord: Point
}

export interface IIntersectionCornerPoint {
    polygonId: number,
    cornerId: number,
    coord: Point
}

export type IntersectionPoint = IIntersectionEdgePoint | IIntersectionCornerPoint;
