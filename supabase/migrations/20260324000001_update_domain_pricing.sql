-- Update domain TLD pricing: 15% margin over OpenSRS cost + WHOIS privacy ($3 USD), in CAD cents
-- Exchange rate: 1 USD = 1.36 CAD
-- Formula: (OpenSRS_USD + $3_WHOIS) * 1.36 * 1.15, rounded to nearest .99

UPDATE public.domain_pricing SET registration_price_cad = 2299, renewal_price_cad = 2299, transfer_price_cad = 2299 WHERE tld = 'com';
UPDATE public.domain_pricing SET registration_price_cad = 2599, renewal_price_cad = 2599, transfer_price_cad = 2599 WHERE tld = 'ca';
UPDATE public.domain_pricing SET registration_price_cad = 2699, renewal_price_cad = 2699, transfer_price_cad = 2699 WHERE tld = 'net';
UPDATE public.domain_pricing SET registration_price_cad = 2399, renewal_price_cad = 2399, transfer_price_cad = 2399 WHERE tld = 'org';
UPDATE public.domain_pricing SET registration_price_cad = 9499, renewal_price_cad = 9499, transfer_price_cad = 9499 WHERE tld = 'io';
UPDATE public.domain_pricing SET registration_price_cad = 5199, renewal_price_cad = 5199, transfer_price_cad = 5199 WHERE tld = 'co';
UPDATE public.domain_pricing SET registration_price_cad = 2899, renewal_price_cad = 2899, transfer_price_cad = 2899 WHERE tld = 'app';
UPDATE public.domain_pricing SET registration_price_cad = 2599, renewal_price_cad = 2599, transfer_price_cad = 2599 WHERE tld = 'dev';
UPDATE public.domain_pricing SET registration_price_cad = 2399, renewal_price_cad = 2399, transfer_price_cad = 2399 WHERE tld = 'me';
UPDATE public.domain_pricing SET registration_price_cad = 1899, renewal_price_cad = 1899, transfer_price_cad = 1899 WHERE tld = 'us';
UPDATE public.domain_pricing SET registration_price_cad = 4099, renewal_price_cad = 4099, transfer_price_cad = 4099 WHERE tld = 'info';
UPDATE public.domain_pricing SET registration_price_cad = 3499, renewal_price_cad = 3499, transfer_price_cad = 3499 WHERE tld = 'biz';
UPDATE public.domain_pricing SET registration_price_cad = 7599, renewal_price_cad = 7599, transfer_price_cad = 7599 WHERE tld = 'tech';
UPDATE public.domain_pricing SET registration_price_cad = 7199, renewal_price_cad = 7199, transfer_price_cad = 7199 WHERE tld = 'design';
UPDATE public.domain_pricing SET registration_price_cad = 7399, renewal_price_cad = 7399, transfer_price_cad = 7399 WHERE tld = 'store';
UPDATE public.domain_pricing SET registration_price_cad = 4599, renewal_price_cad = 4599, transfer_price_cad = 4599 WHERE tld = 'shop';
UPDATE public.domain_pricing SET registration_price_cad = 5199, renewal_price_cad = 5199, transfer_price_cad = 5199 WHERE tld = 'site';
UPDATE public.domain_pricing SET registration_price_cad = 5199, renewal_price_cad = 5199, transfer_price_cad = 5199 WHERE tld = 'online';
UPDATE public.domain_pricing SET registration_price_cad = 4699, renewal_price_cad = 4699, transfer_price_cad = 4699 WHERE tld = 'agency';
UPDATE public.domain_pricing SET registration_price_cad = 4099, renewal_price_cad = 4099, transfer_price_cad = 4099 WHERE tld = 'cloud';
