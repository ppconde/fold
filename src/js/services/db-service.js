import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
)

export const supabaseService = {

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
	}

}