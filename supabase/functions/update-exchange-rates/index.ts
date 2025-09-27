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

    // Fetch precious metals prices from multiple sources
    try {
      const metalAssets = supportedAssets.filter(asset => asset.asset_type === 'precious_metal');
      if (metalAssets.length > 0) {
        // Get USD to IDR rate first
        let usdToIdr = 15800; // fallback
        try {
          const currencyResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const currencyData = await currencyResponse.json();
          usdToIdr = currencyData.rates.IDR || 15800;
        } catch (currencyError) {
          console.log('Using fallback USD to IDR rate');
        }

        // Try to fetch gold from Antam (Indonesian official gold price) first
        let antamGoldSuccess = false;
        try {
          // Fetch Antam gold price - this is more accurate for Indonesian physical gold
          const antamResponse = await fetch('https://logam.pluang.com/api/v1/spot_prices/precious_metals');
          const antamData = await antamResponse.json();
          
          if (antamData?.data?.gold?.buy_price) {
            // Antam price is already in IDR per gram
            const goldPerGramIDR = antamData.data.gold.buy_price;
            rates['XAU_GRAM'] = goldPerGramIDR; // Price per gram (Antam)
            rates['XAU_KG'] = goldPerGramIDR * 1000; // Price per kilogram
            rates['XAU'] = goldPerGramIDR * 31.1035; // Price per ounce
            antamGoldSuccess = true;
            console.log('Successfully fetched Antam gold price:', goldPerGramIDR, 'IDR per gram');
          }
        } catch (antamError) {
          console.error('Error fetching from Antam:', antamError);
        }

        // Fallback to CoinGecko for gold if Antam fails, and for silver
        if (!antamGoldSuccess) {
          try {
            const metalResponse = await fetch(
              'https://api.coingecko.com/api/v3/simple/price?ids=gold,silver&vs_currencies=usd'
            );
            const metalData = await metalResponse.json();
            
            if (metalData.gold?.usd && !antamGoldSuccess) {
              // Gold price per ounce in USD, convert to IDR per ounce
              const goldPerOunceIDR = metalData.gold.usd * usdToIdr;
              rates['XAU'] = goldPerOunceIDR; // Price per ounce
              rates['XAU_GRAM'] = goldPerOunceIDR / 31.1035; // Price per gram (1 oz = 31.1035 grams)
              rates['XAU_KG'] = (goldPerOunceIDR / 31.1035) * 1000; // Price per kilogram
              console.log('Using CoinGecko fallback for gold');
            }
          } catch (coinGeckoError) {
            console.error('Error fetching from CoinGecko metals:', coinGeckoError);
          }
        }

        // Always try to fetch silver from CoinGecko
        try {
          const metalResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=silver&vs_currencies=usd'
          );
          const metalData = await metalResponse.json();
          
          if (metalData.silver?.usd) {
            // Silver price per ounce in USD, convert to IDR per ounce
            const silverPerOunceIDR = metalData.silver.usd * usdToIdr;
            rates['XAG'] = silverPerOunceIDR; // Price per ounce
            rates['XAG_GRAM'] = silverPerOunceIDR / 31.1035; // Price per gram
            rates['XAG_KG'] = (silverPerOunceIDR / 31.1035) * 1000; // Price per kilogram
          }
        } catch (coinGeckoError) {
          console.error('Error fetching from CoinGecko metals:', coinGeckoError);
          
          // Fallback to fixed rates if APIs fail
          const goldPerOunceUSD = 2000; // Approximate fallback
          const silverPerOunceUSD = 25; // Approximate fallback
          
          rates['XAU'] = goldPerOunceUSD * usdToIdr;
          rates['XAU_GRAM'] = (goldPerOunceUSD * usdToIdr) / 31.1035;
          rates['XAU_KG'] = ((goldPerOunceUSD * usdToIdr) / 31.1035) * 1000;
          
          rates['XAG'] = silverPerOunceUSD * usdToIdr;
          rates['XAG_GRAM'] = (silverPerOunceUSD * usdToIdr) / 31.1035;
          rates['XAG_KG'] = ((silverPerOunceUSD * usdToIdr) / 31.1035) * 1000;
          
          console.log('Using fallback precious metal rates');
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

    // Ensure we log Antam usage when applicable
    if (rates['XAU_GRAM'] && rates['XAU']) {
      console.log('Gold rates source likely Antam for gram/kg if gram-based value seems realistic:', rates['XAU_GRAM']);
    }

    // Update assets with new exchange rates
    const { data: assets, error: fetchError } = await supabaseClient
      .from('assets')
      .select('id, symbol, original_value, original_unit')
      .not('symbol', 'is', null);

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      throw fetchError;
    }

    // Update each asset with new rates
    for (const asset of assets || []) {
      if (asset.symbol) {
        let rateKey = asset.symbol;
        
        // Handle precious metals with specific units
        if (asset.symbol === 'XAU' && asset.original_unit) {
          if (asset.original_unit === 'gram') {
            rateKey = 'XAU_GRAM';
            console.log(`Using Antam rate for XAU gram: ${rates['XAU_GRAM']} IDR/gram`);
          } else if (asset.original_unit === 'kg') {
            rateKey = 'XAU_KG';
            console.log(`Using Antam rate for XAU kilogram: ${rates['XAU_KG']} IDR/kg`);
          } else if (asset.original_unit === 'oz') {
            rateKey = 'XAU';
            console.log(`Using USD->IDR converted rate for XAU ounce: ${rates['XAU']} IDR/oz`);
          }
        } else if (asset.symbol === 'XAG' && asset.original_unit) {
          if (asset.original_unit === 'gram') {
            rateKey = 'XAG_GRAM';
            console.log(`Using USD->IDR converted rate for XAG gram: ${rates['XAG_GRAM']} IDR/gram`);
          } else if (asset.original_unit === 'kg') {
            rateKey = 'XAG_KG';
            console.log(`Using USD->IDR converted rate for XAG kilogram: ${rates['XAG_KG']} IDR/kg`);
          } else if (asset.original_unit === 'oz') {
            rateKey = 'XAG';
            console.log(`Using USD->IDR converted rate for XAG ounce: ${rates['XAG']} IDR/oz`);
          }
        }
        
        if (rates[rateKey]) {
          const { error: updateError } = await supabaseClient
            .from('assets')
            .update({
              exchange_rate: rates[rateKey],
              rate_last_updated: new Date().toISOString()
            })
            .eq('id', asset.id);

          if (updateError) {
            console.error(`Error updating asset ${asset.id}:`, updateError);
          }
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});