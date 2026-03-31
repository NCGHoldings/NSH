/* eslint-disable */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not set.")
    }

    let url = ''
    let body = {}

    // Route actions to specific Telegram API endpoints
    switch (action) {
      case 'sendMessage':
        url = `https://api.telegram.org/bot${botToken}/sendMessage`
        body = payload
        break
      case 'editMessageText':
        url = `https://api.telegram.org/bot${botToken}/editMessageText`
        body = payload
        break
      case 'editMessageReplyMarkup':
        url = `https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`
        body = payload
        break
      case 'answerCallbackQuery':
        url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`
        body = payload
        break
      default:
        throw new Error("Invalid action provided.")
    }

    // Call the Telegram API securely
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.ok ? 200 : 400,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
