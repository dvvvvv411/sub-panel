import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { employeeId } = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'employeeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deactivating user for employee:', employeeId);

    // Get employee email
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('email')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError);
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee email:', employee.email);

    // Get user profile to find user_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', employee.email)
      .single();

    if (profile?.user_id) {
      console.log('Found user_id:', profile.user_id);
      
      // Ban the user to prevent future logins
      const { error: banError } = await supabase.auth.admin.updateUserById(
        profile.user_id,
        { ban_duration: '999999h' } // Ban for a very long time
      );

      if (banError) {
        console.error('Error banning user:', banError);
      } else {
        console.log('User banned successfully');
      }

      // Sign out the user from all sessions
      const { error: signOutError } = await supabase.auth.admin.signOut(profile.user_id);
      if (signOutError) {
        console.error('Error signing out user:', signOutError);
      } else {
        console.log('User signed out successfully');
      }
    } else {
      console.log('No user profile found, will only update employee status');
    }

    // Update employee status to blocked
    const { error: updateError } = await supabase
      .from('employees')
      .update({ status: 'blocked' })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error updating employee status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update employee status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Employee status updated to blocked');

    return new Response(
      JSON.stringify({ success: true, message: 'User deactivated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in deactivate-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});