class CacheService {
  /**
   * Sets an item into localStorage
   * @param {string} key
   * @param {object} item
   */
  public setItem<T>(key: string, item: T): void {
    localStorage.setItem(key, JSON.stringify(item));
  }

  /**
   * Gets an item from localStorage for a given key
   * @param {string} key
   * @returns
   */
  public getItem(key: string): string | null {
    return localStorage.getItem(key);
  }
}

export const cacheService = new CacheService();
