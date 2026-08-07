import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bklwkbfrvuhqodudgmdk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHdrYmZydnVocW9kdWRnbWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY4NTcsImV4cCI6MjA4Nzk4Mjg1N30.tKtNdDRySruYKSaHszfCGZQQvgU6OeRS_ZpdoVR6BiA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export { supabaseUrl, supabaseAnonKey };
