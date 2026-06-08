import dns from 'dns';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const dnsResolve4 = promisify(dns.resolve4);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lfatskduuzwdqoomtphh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DB_HOST = process.env.DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
const DB_PORT = process.env.DB_PORT || '6543';
const DB_PASSWORD = process.env.DB_PASSWORD || 'nyjBIhshyxETVCWJ';
const DB_USER = process.env.DB_USER || 'postgres.lfatskduuzwdqoomtphh';
const DB_NAME = process.env.DB_NAME || 'postgres';

/**
 * Resolve the pooler hostname to an IPv4 address.
 * Render's networking does NOT support IPv6, so we must force IPv4.
 */
let resolvedIPv4 = null;

async function resolvePoolerIPv4() {
  if (resolvedIPv4) return resolvedIPv4;

  try {
    const addresses = await dnsResolve4(DB_HOST);
    if (addresses && addresses.length > 0) {
      resolvedIPv4 = addresses[0];
      console.log(`[DB] Resolved ${DB_HOST} → IPv4 ${resolvedIPv4}`);
      return resolvedIPv4;
    }
  } catch (err) {
    console.warn(`[DB] DNS resolve failed for ${DB_HOST}: ${err.message}. Falling back to hostname.`);
  }

  return null;
}

// Initial resolution (non-blocking)
resolvePoolerIPv4();

/**
 * Custom fetch that rewrites the Supabase API URL to use the resolved IPv4.
 * Keeps the original Host header for TLS/SNI.
 */
const customFetch = async (url, options = {}) => {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === DB_HOST && resolvedIPv4) {
      urlObj.hostname = resolvedIPv4;
      options.headers = {
        ...options.headers,
        'Host': DB_HOST,
      };
      url = urlObj.toString();
    }
  } catch {
    // If URL parsing fails, just use the original
  }

  return fetch(url, options);
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
  db: {
    schema: 'public',
  },
});

export { supabase, resolvePoolerIPv4 };
export default supabase;
