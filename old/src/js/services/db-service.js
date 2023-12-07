import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
)

export const supabaseService = {

	/**
	 * Returns origami library from the database
	 */
	getOrigamiLibrary: async () => {
		try {
			const { data, error } = await supabase
				.from('Origami')
				.select('*');

			return data.length ? data : error;
		} catch (e) {
			console.error('Error fetching origami library data: ', e);
			return [];
		}
	},
	/**
	 * Returns an origami url image from storage
	 * @param name 
	 */
	getOrigamiImage: async (name) => {
		try {
			const { publicURL, error } = supabase.storage.from('images').getPublicUrl(`${name}.jpg`);
			return error || publicURL;
		} catch (e) {
			console.error('Error fetching origami library data: ', e);
			return;
		}
	}
}