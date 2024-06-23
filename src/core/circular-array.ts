/**
 * Represents a circular array.
 * @template T The type of elements in the array.
 */
export class CircularArray<T> {
  private items: T[];

  /**
   * Creates a new instance of CircularArray.
   * @param items The initial items to populate the array.
   */
  constructor(...items: T[]) {
    this.items = items;
  }

  /**
   * Applies a mapping function to each element in the array.
   * @template U The type of elements in the resulting array.
   * @param callback The mapping function to apply to each element.
   * @returns An array containing the results of the mapping function.
   */
  public map<U>(callback: (current: T, next: T, index: number, array: T[]) => U): Array<U> {
    const result: U[] = [];
    for (let i = 0; i < this.items.length; i++) {
      const current = this.items[i];
      const next = this.items[(i + 1) % this.items.length];
      result.push(callback(current, next, i, this.items));
    }
    return result;
  }

  /**
   * Gets the length of the array.
   */
  public get length(): number {
    return this.items.length;
  }
}
