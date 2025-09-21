import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting exchange rate update...');

    // Fetch supported assets
    const { data: supportedAssets, error: assetsError } = await supabaseClient
      .from('supported_assets')
      .select('*');

    if (assetsError) {
      console.error('Error fetching supported assets:', assetsError);
      throw assetsError;
    }

    const rates: Record<string, number> = {};

    // Fetch crypto prices from CoinGecko (free API)
    try {
      const cryptoAssets = supportedAssets.filter(asset => asset.asset_type === 'crypto');
      if (cryptoAssets.length > 0) {
        const cryptoIds = cryptoAssets.map(asset => asset.api_endpoint).join(',');
        const cryptoResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=idr`
        );
        const cryptoData = await cryptoResponse.json();
        
        for (const asset of cryptoAssets) {
          if (cryptoData[asset.api_endpoint]?.idr) {
            rates[asset.symbol] = cryptoData[asset.api_endpoint].idr;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching crypto rates:', error);
    }

    // Fetch precious metals prices from metals-api.com (free tier)
    try {
      const metalAssets = supportedAssets.filter(asset => asset.asset_type === 'precious_metal');
      if (metalAssets.length > 0) {
        // Note: This is a free API, in production you'd want to use a paid service
        const metalResponse = await fetch(
          'https://api.metals.live/v1/spot'
        );
        const metalData = await metalResponse.json();
        
        // Convert to IDR (approximate rates)
        const usdToIdr = 15800; // This should come from a currency API
        
        if (metalData && metalData.gold) {
          rates['XAU'] = metalData.gold * usdToIdr; // Gold per ounce in IDR
        }
        if (metalData && metalData.silver) {
          rates['XAG'] = metalData.silver * usdToIdr; // Silver per ounce in IDR
        }
      }
    } catch (error) {
      console.error('Error fetching metal rates:', error);
    }

    // Fetch currency exchange rates
    try {
      const currencyAssets = supportedAssets.filter(asset => asset.asset_type === 'currency');
      if (currencyAssets.length > 0) {
        const currencyResponse = await fetch(
          'https://api.exchangerate-api.com/v4/latest/USD'
        );
        const currencyData = await currencyResponse.json();
        
        const usdToIdr = currencyData.rates.IDR || 15800;
        
        rates['USD'] = usdToIdr;
        rates['EUR'] = (currencyData.rates.IDR / currencyData.rates.EUR) || (usdToIdr * 1.1);
        rates['JPY'] = (currencyData.rates.IDR / currencyData.rates.JPY) || (usdToIdr / 150);
      }
    } catch (error) {
      console.error('Error fetching currency rates:', error);
    }

    // For stocks, we'll use placeholder rates (in production, use Yahoo Finance or Alpha Vantage)
    rates['BBCA'] = 9200; // IDR per share
    rates['BBRI'] = 4500; // IDR per share
    rates['TLKM'] = 3200; // IDR per share

    console.log('Fetched rates:', rates);

    // Update assets with new exchange rates
    const { data: assets, error: fetchError } = await supabaseClient
      .from('assets')
      .select('id, symbol, original_value')
      .not('symbol', 'is', null);

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      throw fetchError;
    }

    // Update each asset with new rates
    for (const asset of assets || []) {
      if (asset.symbol && rates[asset.symbol]) {
        const { error: updateError } = await supabaseClient
          .from('assets')
          .update({
            exchange_rate: rates[asset.symbol],
            rate_last_updated: new Date().toISOString()
          })
          .eq('id', asset.id);

        if (updateError) {
          console.error(`Error updating asset ${asset.id}:`, updateError);
        }
      }
    }

    console.log('Exchange rates updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedRates: Object.keys(rates).length,
        message: 'Exchange rates updated successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-exchange-rates function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});