import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Rellena esto con los datos de la sección Settings -> API de tu Supabase
const supabaseUrl = 'https://vrqofueaxwdgbzgkltmk.supabase.co';
const supabaseAnonKey = 'sb_publishable_JgEk0NZag1kJXLosKhwLmA_Pa5spMn6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
