import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Verify the caller's JWT and return the authenticated user.
 * Returns { user } on success, or { error, response } on failure.
 */
export async function verifyAuth(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<
  | { user: { id: string; email?: string }; error?: never; response?: never }
  | { user?: never; error: string; response: Response }
> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: 'Unauthorized',
      response: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    return {
      error: 'Unauthorized',
      response: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    }
  }

  return { user: { id: user.id, email: user.email } }
}
