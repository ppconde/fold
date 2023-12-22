import { createClient } from '@supabase/supabase-js';
import { IOrigami } from '../types/origami-db.types';
import { Database } from '../types/database';

class SupabaseService {

  /**
   * Returns origami library from the database
   */
  public async getOrigamiLibrary(): Promise<IOrigami[]> {
    const supabase = createClient<Database>(
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
    const supabase = createClient<Database>(
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
