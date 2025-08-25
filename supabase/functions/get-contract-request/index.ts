
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    
    // Fallback: try to read from request body if not in query params
    if (!token && req.method === 'POST') {
      try {
        const body = await req.json();
        token = body.token;
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up contract request with token:', token);

    // Get contract request with employee data
    const { data: request, error: requestError } = await supabase
      .from('employment_contract_requests')
      .select(`
        *,
        employees (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (requestError) {
      console.error('Error fetching contract request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Ungültiger oder abgelaufener Token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!request) {
      return new Response(
        JSON.stringify({ error: 'Anfrage nicht gefunden oder abgelaufen' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already submitted
    const { data: existingSubmission } = await supabase
      .from('employment_contract_submissions')
      .select('id')
      .eq('request_id', request.id)
      .maybeSingle();

    if (existingSubmission) {
      return new Response(
        JSON.stringify({ 
          submitted: true,
          message: 'Diese Anfrage wurde bereits eingereicht'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        requestId: request.id,
        employee: request.employees,
        expiresAt: request.expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-contract-request:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Server-Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
