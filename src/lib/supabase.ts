import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oailemrpflfahdhoxbbx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haWxlbXJwZmxmYWhkaG94YmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNjEzMDAsImV4cCI6MjA3NzYzNzMwMH0.7Vg_zfQZ43S41-siDz4kF51TaSAi867OSSnN0OCnl6M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)