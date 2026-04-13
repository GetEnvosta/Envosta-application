/**
 * Supabase Vault helpers.
 * All token storage/retrieval goes through here.
 * Tokens are encrypted at rest using pgsodium (XChaCha20-Poly1305)
 * with the root key managed by Supabase's KMS.
 */

import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Store credentials in Vault. Returns the vault secret UUID. */
export async function storeSecret(credentials: object, name: string): Promise<string> {
  const supabase = getAdmin();
  const { data, error } = await supabase.rpc('store_integration_secret', {
    p_secret: JSON.stringify(credentials),
    p_name: name,
  });
  if (error) throw new Error(`Vault store failed: ${error.message}`);
  return data as string;
}

/** Read and decrypt credentials from Vault. Returns parsed object. */
export async function readSecret<T = Record<string, unknown>>(vaultId: string): Promise<T> {
  const supabase = getAdmin();
  const { data, error } = await supabase.rpc('get_integration_secret', { p_id: vaultId });
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  if (!data) throw new Error('Vault secret not found');
  return JSON.parse(data) as T;
}

/** Update credentials in Vault (e.g. after token refresh). */
export async function updateSecret(vaultId: string, credentials: object, name: string): Promise<void> {
  const supabase = getAdmin();
  const { error } = await supabase.rpc('update_integration_secret', {
    p_id: vaultId,
    p_secret: JSON.stringify(credentials),
    p_name: name,
  });
  if (error) throw new Error(`Vault update failed: ${error.message}`);
}

/** Delete credentials from Vault (on disconnect). */
export async function deleteSecret(vaultId: string): Promise<void> {
  const supabase = getAdmin();
  const { error } = await supabase.rpc('delete_integration_secret', { p_id: vaultId });
  if (error) throw new Error(`Vault delete failed: ${error.message}`);
}
