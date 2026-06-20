
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ugftmsiljgxzctfhhplt.supabase.co';
const supabaseAnonKey = 'sb_publishable_JbgymsS-nOjS-tUG9gCuTw_LjfnGakB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
