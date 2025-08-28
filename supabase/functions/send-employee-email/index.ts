import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { EmployeeNotificationEmail } from "./_templates/employee-notification.tsx";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  employee_email: string;
  employee_name: string;
  type: 'assignment' | 'appointment_confirmation';
  order_data?: {
    title: string;
    order_number: string;
    provider: string;
  };
  appointment_data?: {
    scheduled_at: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send employee email function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employee_email, employee_name, type, order_data, appointment_data }: EmailRequest = await req.json();

    console.log('Email request data:', { employee_email, employee_name, type });

    // Validate required fields
    if (!employee_email || !employee_name || !type) {
      console.error('Missing required fields:', { employee_email: !!employee_email, employee_name: !!employee_name, type: !!type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let subject = '';
    let emailData = {};

    if (type === 'assignment') {
      if (!order_data) {
        console.error('Missing order_data for assignment email');
        return new Response(
          JSON.stringify({ error: 'Missing order data for assignment email' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      subject = 'Neuer Auftrag zugewiesen';
      emailData = {
        employee_name,
        type: 'assignment',
        order_title: order_data.title,
        order_number: order_data.order_number,
        provider: order_data.provider,
      };
    } else if (type === 'appointment_confirmation') {
      if (!appointment_data) {
        console.error('Missing appointment_data for appointment confirmation email');
        return new Response(
          JSON.stringify({ error: 'Missing appointment data for appointment confirmation email' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      subject = 'Terminbestätigung für Ihren WhatsApp-Auftrag';
      emailData = {
        employee_name,
        type: 'appointment_confirmation',
        scheduled_at: appointment_data.scheduled_at,
      };
    } else {
      console.error('Invalid email type:', type);
      return new Response(
        JSON.stringify({ error: 'Invalid email type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Rendering email with data:', emailData);

    // Render the React email template
    const html = await renderAsync(
      React.createElement(EmployeeNotificationEmail, emailData)
    );

    console.log('Email rendered, sending to:', employee_email);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Innovatech <info@innovaatech.de>',
      to: [employee_email],
      subject: subject,
      html: html,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, email_id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in send-employee-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);