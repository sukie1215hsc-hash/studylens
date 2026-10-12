import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://irrgemvaugcexqlylqgh.supabase.co'

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycmdlbXZhdWdjZXhxbHlscWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjI3MjgsImV4cCI6MjEwNzMzODcyOH0.u-ppqiYqBSkSIJ1z7MGliCX3D-gNo_eo9FU3VRTZGgI'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)