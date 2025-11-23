import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kojngcoxywrhpxokkuuv.supabase.co'
const supabaseKey = 'sb_publishable_EXi_3UU-nVDdw4Tw8G3jkA_I2uD6FFh'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n')

  try {
    // Try to query the trips table
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Connection test failed:', error.message)
      console.log('\n💡 The tables might not exist yet. You\'ll need to run the migration manually.')
      console.log('\nTo do this:')
      console.log('1. Go to https://supabase.com/dashboard/project/kojngcoxywrhpxokkuuv/sql')
      console.log('2. Click "New query"')
      console.log('3. Copy and paste the contents of supabase/migrations/001_initial_schema.sql')
      console.log('4. Click "Run"')
      process.exit(1)
    }

    console.log('✅ Database connection successful!')
    console.log('✅ Tables are set up correctly!')
    console.log('\nYou\'re ready to start development! 🚀')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

testConnection()
