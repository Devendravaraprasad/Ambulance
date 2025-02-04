// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://djyilkpnrxjqxrcasdjz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeWlsa3BucnhqcXhyY2FzZGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNjI2NzIsImV4cCI6MjA1MzYzODY3Mn0.rbBtnzHDsJBb8qWAJ0gNeMZqFVTBrHp0k9KSmxXNjCc'; // or service_role key for higher access

export const supabase = createClient(supabaseUrl, supabaseKey);
