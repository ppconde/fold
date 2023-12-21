import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { IOrigami } from '../types/origami-db.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);

class SupabaseService {
  /**
   * Returns origami library from the database
   */
  public async getOrigamiLibrary(): Promise<IOrigami[]> {
    try {
      const { data } = await supabase.from('Origami').select('*');

      return data?.length ? data : [];
    } catch (e) {
      console.error('Error fetching origami library data: ', e);
      return [];
    }
  }

  /**
   * Returns an origami url image from storage
   * @param name
   */
  public async getOrigamiImage(name: string) {
    try {
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(`${name.toLowerCase()}.jpg`);
      return data.publicUrl;
    } catch (e) {
      console.error('Error fetching origami library data: ', e);
      return;
    }
  }
}

export const supabaseService = new SupabaseService();
