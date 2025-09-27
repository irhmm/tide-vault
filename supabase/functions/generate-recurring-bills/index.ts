import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting recurring bills generation...')

    // Get all template bills that are active and have recurring settings
    const { data: templateBills, error: fetchError } = await supabaseClient
      .from('bills')
      .select('*')
      .eq('is_template', true)
      .eq('status', 'active')
      .in('recurrence_type', ['monthly', 'yearly'])

    if (fetchError) {
      console.error('Error fetching template bills:', fetchError)
      throw fetchError
    }

    console.log(`Found ${templateBills?.length || 0} template bills`)

    const today = new Date()
    const generateUntilDate = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000)) // 3 months ahead
    
    let totalGenerated = 0

    for (const template of templateBills || []) {
      console.log(`Processing template: ${template.bill_name}`)
      
      // Check what's the latest generated bill for this template
      const { data: latestBill, error: latestError } = await supabaseClient
        .from('bills')
        .select('*')
        .eq('bill_name', template.bill_name)
        .eq('user_id', template.user_id)
        .eq('is_template', false)
        .order('due_date', { ascending: false })
        .limit(1)

      if (latestError) {
        console.error('Error fetching latest bill:', latestError)
        continue
      }

      let nextDueDate: Date
      
      if (latestBill && latestBill.length > 0) {
        // Start from the next occurrence after the latest bill
        nextDueDate = calculateNextDueDate(new Date(latestBill[0].due_date), template.recurrence_type, template.recurrence_day, template.recurrence_month)
      } else {
        // No bills generated yet, start from template's due date or next occurrence
        const templateDue = new Date(template.due_date)
        if (templateDue > today) {
          nextDueDate = templateDue
        } else {
          nextDueDate = calculateNextDueDate(templateDue, template.recurrence_type, template.recurrence_day, template.recurrence_month)
        }
      }

      // Generate bills until the target date
      const billsToInsert = []
      while (nextDueDate <= generateUntilDate) {
        // Check if bill already exists for this date
        const { data: existingBill } = await supabaseClient
          .from('bills')
          .select('id')
          .eq('bill_name', template.bill_name)
          .eq('user_id', template.user_id)
          .eq('due_date', nextDueDate.toISOString().split('T')[0])
          .eq('is_template', false)

        if (!existingBill || existingBill.length === 0) {
          const newBill = {
            bill_name: template.bill_name,
            payer_name: template.payer_name,
            destination_account: template.destination_account,
            amount: template.amount,
            due_date: nextDueDate.toISOString().split('T')[0],
            category: template.category,
            status: 'active',
            recurrence_type: template.recurrence_type,
            recurrence_day: template.recurrence_day,
            recurrence_month: template.recurrence_month,
            next_due_date: calculateNextDueDate(nextDueDate, template.recurrence_type, template.recurrence_day, template.recurrence_month)?.toISOString().split('T')[0],
            is_template: false,
            user_id: template.user_id,
          }
          billsToInsert.push(newBill)
        }

        nextDueDate = calculateNextDueDate(nextDueDate, template.recurrence_type, template.recurrence_day, template.recurrence_month)
      }

      // Insert all new bills for this template
      if (billsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('bills')
          .insert(billsToInsert)

        if (insertError) {
          console.error(`Error inserting bills for template ${template.bill_name}:`, insertError)
        } else {
          console.log(`Generated ${billsToInsert.length} bills for template: ${template.bill_name}`)
          totalGenerated += billsToInsert.length
        }
      }
    }

    console.log(`Total bills generated: ${totalGenerated}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully generated ${totalGenerated} recurring bills`,
        totalGenerated 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in generate-recurring-bills function:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function calculateNextDueDate(currentDate: Date, recurrenceType: string, recurrenceDay?: number, recurrenceMonth?: number): Date {
  if (recurrenceType === 'monthly' && recurrenceDay) {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, recurrenceDay)
    return nextMonth
  } else if (recurrenceType === 'yearly' && recurrenceDay && recurrenceMonth) {
    const nextYear = new Date(currentDate.getFullYear() + 1, recurrenceMonth - 1, recurrenceDay)
    return nextYear
  }
  
  // Fallback - just add one month
  return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate())
}