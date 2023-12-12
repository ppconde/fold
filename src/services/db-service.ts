import { createClient } from "@supabase/supabase-js";
import { Database } from '../../types/database';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

class SupabaseService {
  /**
   * Returns origami library from the database
   */
  public async getOrigamiLibrary() {
    try {
      const { data, error } = await supabase.from("Origami").select("*");

      return data?.length ? data : error;
    } catch (e) {
      console.error("Error fetching origami library data: ", e);
      return [];
    }
  }

  /**
   * Returns an origami url image from storage
   * @param name
   */
  public async getOrigamiImage(name: string) {
    try {
      const { data, error } = await supabase.storage
        .from("images")
        .download(`${name}.jpg`);
      return error || data;
    } catch (e) {
      console.error("Error fetching origami library data: ", e);
      return;
    }
  }
}

export const supabaseService = new SupabaseService();
