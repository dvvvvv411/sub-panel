import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Send Telegram notification function called')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, payload } = await req.json()
    
    console.log('Notification request:', { type, payload })

    // Validate request
    if (!type || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing type or payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!

    if (!telegramBotToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return new Response(
        JSON.stringify({ error: 'Telegram bot token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch active telegram subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from('telegram_subscribers')
      .select('chat_id, label')
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching subscribers:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscribers' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('No active Telegram subscribers found')
      return new Response(
        JSON.stringify({ success: true, message: 'No active subscribers' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format message based on type
    let message = ''
    
    switch (type) {
      case 'appointment_booked':
        message = `🗓️ Neuer Termin gebucht!\n\n` +
                 `👤 Mitarbeiter: ${payload.employee_name}\n` +
                 `📅 Termin: ${payload.appointment_date}\n` +
                 `⏰ Uhrzeit: ${payload.appointment_time}\n` +
                 `📋 Auftrag: ${payload.order_title}\n` +
                 `🔢 Auftrag Nr.: ${payload.order_number}`
        break
        
      case 'contract_submitted':
        message = `📝 Arbeitsvertrag eingereicht!\n\n` +
                 `👤 Mitarbeiter: ${payload.employee_name}\n` +
                 `📧 E-Mail: ${payload.employee_email}\n` +
                 `📅 Gewünschter Starttermin: ${payload.desired_start_date || 'Nicht angegeben'}`
        break
        
      case 'evaluation_submitted':
        message = `⭐ Bewertung abgeschickt!\n\n` +
                 `👤 Mitarbeiter: ${payload.employee_name}\n` +
                 `📋 Auftrag: ${payload.order_title}\n` +
                 `🔢 Auftrag Nr.: ${payload.order_number}\n` +
                 `⭐ Bewertung: ${payload.rating}/5`
        break
        
      default:
        console.error('Unknown notification type:', type)
        return new Response(
          JSON.stringify({ error: 'Unknown notification type' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    console.log(`Sending message to ${subscribers.length} subscribers`)

    // Send message to all subscribers
    const sendPromises = subscribers.map(async (subscriber) => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: subscriber.chat_id,
            text: message,
            parse_mode: 'HTML'
          })
        })

        const result = await response.json()
        
        if (response.ok) {
          console.log(`Message sent successfully to ${subscriber.label || subscriber.chat_id}`)
          
          // Update last_notified_at
          await supabase
            .from('telegram_subscribers')
            .update({ last_notified_at: new Date().toISOString() })
            .eq('chat_id', subscriber.chat_id)
            
          return { success: true, chat_id: subscriber.chat_id }
        } else {
          console.error(`Failed to send to ${subscriber.chat_id}:`, result)
          return { success: false, chat_id: subscriber.chat_id, error: result }
        }
      } catch (error) {
        console.error(`Error sending to ${subscriber.chat_id}:`, error)
        return { success: false, chat_id: subscriber.chat_id, error: error.message }
      }
    })

    const results = await Promise.allSettled(sendPromises)
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failCount = results.length - successCount

    console.log(`Notification results: ${successCount} successful, ${failCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total: subscribers.length 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-telegram-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})