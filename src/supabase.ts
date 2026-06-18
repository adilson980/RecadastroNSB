/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

// Falling back to provided values if environment variables are not set yet
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://szlnjpdshagzatrkqakt.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_DZ0KvPxYCT1MT7c5laPQQg_t992yOH1";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
