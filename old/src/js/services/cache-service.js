
class CacheService {

	/**
	 * Sets an item into localStorage
	 * @param {string} key 
	 * @param {object} item 
	 */
	setItem = (key, item) => {
		localStorage.setItem(key, JSON.stringify(item));
	}

	/**
	 * Gets an item from localStorage for a given name
	 * @param {string} name 
	 * @returns 
	 */
	getItem = (name) => {
		return localStorage.getItem(name);
	}
}

export const cacheService = new CacheService();