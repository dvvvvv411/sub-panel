
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const token = formData.get('token') as string;
    const contractData = JSON.parse(formData.get('contractData') as string);
    const idFrontFile = formData.get('idFront') as File | null;
    const idBackFile = formData.get('idBack') as File | null;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing contract submission for token:', token);

    // Verify contract request
    const { data: request, error: requestError } = await supabase
      .from('employment_contract_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger oder abgelaufener Token' }),
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
        JSON.stringify({ error: 'Diese Anfrage wurde bereits eingereicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let idFrontPath = null;
    let idBackPath = null;

    // Upload ID photos if provided
    if (idFrontFile) {
      const frontFileName = `${request.employee_id}/id-front-${Date.now()}.${idFrontFile.name.split('.').pop()}`;
      const { error: frontUploadError } = await supabase.storage
        .from('ids')
        .upload(frontFileName, idFrontFile);
      
      if (frontUploadError) {
        console.error('Error uploading front ID:', frontUploadError);
        return new Response(
          JSON.stringify({ error: 'Fehler beim Hochladen der Ausweisbilder' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      idFrontPath = frontFileName;
    }

    if (idBackFile) {
      const backFileName = `${request.employee_id}/id-back-${Date.now()}.${idBackFile.name.split('.').pop()}`;
      const { error: backUploadError } = await supabase.storage
        .from('ids')
        .upload(backFileName, idBackFile);
      
      if (backUploadError) {
        console.error('Error uploading back ID:', backUploadError);
        return new Response(
          JSON.stringify({ error: 'Fehler beim Hochladen der Ausweisbilder' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      idBackPath = backFileName;
    }

    // Create submission record
    const { error: submissionError } = await supabase
      .from('employment_contract_submissions')
      .insert({
        request_id: request.id,
        employee_id: request.employee_id,
        first_name: contractData.firstName,
        last_name: contractData.lastName,
        email: contractData.email,
        phone: contractData.phone,
        desired_start_date: contractData.desiredStartDate,
        employment_type: contractData.employmentType,
        marital_status: contractData.maritalStatus,
        social_security_number: contractData.socialSecurityNumber,
        tax_number: contractData.taxNumber,
        health_insurance: contractData.healthInsurance,
        iban: contractData.iban,
        bic: contractData.bic,
        bank_name: contractData.bankName,
        id_front_path: idFrontPath,
        id_back_path: idBackPath
      });

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Daten' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update or insert bank details in employee_bank_details table
    const { error: bankUpsertError } = await supabase
      .from('employee_bank_details')
      .upsert({
        employee_id: request.employee_id,
        iban: contractData.iban,
        bic: contractData.bic,
        bank_name: contractData.bankName,
        account_holder: `${contractData.firstName} ${contractData.lastName}`
      });

    if (bankUpsertError) {
      console.error('Error upserting bank details:', bankUpsertError);
      // Don't fail the entire request for this, just log it
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('employment_contract_requests')
      .update({ 
        status: 'submitted'
      })
      .eq('id', request.id);

    if (updateError) {
      console.error('Error updating request status:', updateError);
    }

    // Update employee status to 'contract_received'
    const { error: employeeUpdateError } = await supabase
      .from('employees')
      .update({ status: 'contract_received' })
      .eq('id', request.employee_id);

    if (employeeUpdateError) {
      console.error('Error updating employee status:', employeeUpdateError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-contract:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Server-Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
