import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the user making the request
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is an admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting cleanup of test data by admin:', user.email);

    // Get all non-admin user profiles
    const { data: nonAdminProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, email')
      .neq('role', 'admin');

    if (profilesError) {
      console.error('Error fetching non-admin profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!nonAdminProfiles || nonAdminProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No test data to clean up' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = nonAdminProfiles.map(p => p.user_id);
    console.log('Found non-admin users to delete:', nonAdminProfiles.map(p => p.email));

    // Get all employees linked to these users
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .in('email', nonAdminProfiles.map(p => p.email));

    const employeeIds = employees?.map(e => e.id) || [];

    // Delete in correct order to respect foreign key constraints
    console.log('Deleting related data...');

    // 1. Delete order evaluations
    if (employeeIds.length > 0) {
      const { error: evalError } = await supabaseAdmin
        .from('order_evaluations')
        .delete()
        .in('employee_id', employeeIds);
      if (evalError) console.error('Error deleting evaluations:', evalError);
    }

    // 2. Delete order appointments
    if (employeeIds.length > 0) {
      const { error: appointError } = await supabaseAdmin
        .from('order_appointments')
        .delete()
        .in('employee_id', employeeIds);
      if (appointError) console.error('Error deleting appointments:', appointError);
    }

    // 3. Delete order assignments
    if (employeeIds.length > 0) {
      const { error: assignError } = await supabaseAdmin
        .from('order_assignments')
        .delete()
        .in('employee_id', employeeIds);
      if (assignError) console.error('Error deleting assignments:', assignError);
    }

    // 4. Delete premium adjustments
    if (employeeIds.length > 0) {
      const { error: premiumError } = await supabaseAdmin
        .from('premium_adjustments')
        .delete()
        .in('employee_id', employeeIds);
      if (premiumError) console.error('Error deleting premium adjustments:', premiumError);
    }

    // 5. Delete employee bank details
    if (employeeIds.length > 0) {
      const { error: bankError } = await supabaseAdmin
        .from('employee_bank_details')
        .delete()
        .in('employee_id', employeeIds);
      if (bankError) console.error('Error deleting bank details:', bankError);
    }

    // 6. Delete employment contract submissions
    if (employeeIds.length > 0) {
      const { error: submissionError } = await supabaseAdmin
        .from('employment_contract_submissions')
        .delete()
        .in('employee_id', employeeIds);
      if (submissionError) console.error('Error deleting contract submissions:', submissionError);
    }

    // 7. Delete employment contract requests
    if (employeeIds.length > 0) {
      const { error: requestError } = await supabaseAdmin
        .from('employment_contract_requests')
        .delete()
        .in('employee_id', employeeIds);
      if (requestError) console.error('Error deleting contract requests:', requestError);
    }

    // 8. Delete employees
    if (employeeIds.length > 0) {
      const { error: empError } = await supabaseAdmin
        .from('employees')
        .delete()
        .in('id', employeeIds);
      if (empError) console.error('Error deleting employees:', empError);
    }

    // 9. Delete user profiles
    const { error: profileDelError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .in('user_id', userIds);
    if (profileDelError) console.error('Error deleting user profiles:', profileDelError);

    // 10. Delete auth users
    for (const userId of userIds) {
      const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDelError) {
        console.error('Error deleting auth user:', userId, authDelError);
      }
    }

    console.log('Cleanup completed successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Test data cleanup completed successfully',
        deletedUsers: nonAdminProfiles.length,
        deletedEmployees: employeeIds.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});