import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://enrkhookzoeccflrsqoq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVucmtob29rem9lY2NmbHJzcW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5Nzc2MDksImV4cCI6MjA2OTU1MzYwOX0.GHkdl5x-zMdvCcJbjXBDG_rbieCBw0Nc8zVuZU1HW0A";

export const supabase = createClient(supabaseUrl, supabaseKey);
