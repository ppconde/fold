import { Json } from './database';

export interface IOrigami {
    id: number;
    name: string;
    instructions: Json;
}