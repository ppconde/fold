export interface IOrigamiParsed {
  id: number;
  name: string;
  instructions: IInstructions;
}

export interface IInstructions {
  [key: string]: string;
}
