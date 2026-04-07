import { CACHE_TTL_MS, MENUS_TABLE, supabase } from "../lib/supabase.js";

function isStale(updatedAt) {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > CACHE_TTL_MS;
}

export async function getCachedMenu(hall) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(MENUS_TABLE)
    .select("hall, payload, updated_at")
    .eq("hall", hall)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    hall: data.hall,
    payload: data.payload,
    updatedAt: data.updated_at,
    isStale: isStale(data.updated_at),
  };
}

export async function listCachedHalls() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(MENUS_TABLE)
    .select("hall")
    .order("hall", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => row.hall);
}

export async function upsertMenu(hall, payload) {
  if (!supabase) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from(MENUS_TABLE).upsert(
    {
      hall,
      payload,
      updated_at: now,
    },
    { onConflict: "hall" }
  );

  if (error) {
    throw error;
  }
}
