-- Fix function search path security issue
ALTER FUNCTION public.update_asset_idr_value() SET search_path = public;