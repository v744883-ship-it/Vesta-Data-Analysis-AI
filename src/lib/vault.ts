import { supabase } from "@/integrations/supabase/client";
import {
  checkVerifier,
  decryptText,
  deriveKey,
  encryptText,
  makeVerifier,
  randomSalt,
} from "@/lib/crypto";
import type { Result } from "@/lib/analysis";

export interface ReportPayload {
  title: string;
  prompt: string;
  narrative: string;
  datasetName: string;
  rowCount: number;
  columnCount: number;
  createdAt: string;
  results: Result[];
}

export interface VaultReportMeta {
  id: string;
  title: string;
  dataset_name: string;
  row_count: number;
  column_count: number;
  created_at: string;
}

export async function getVaultSettings() {
  const { data, error } = await supabase
    .from("vault_settings")
    .select("salt, verifier")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVault(password: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const salt = randomSalt();
  const key = await deriveKey(password, salt);
  const verifier = await makeVerifier(key);

  const { error } = await supabase
    .from("vault_settings")
    .insert({ user_id: userId, salt, verifier });
  if (error) throw error;
  return key;
}

export async function unlockVault(password: string): Promise<CryptoKey> {
  const settings = await getVaultSettings();
  if (!settings) throw new Error("No vault has been created yet.");
  const key = await deriveKey(password, settings.salt);
  if (!(await checkVerifier(key, settings.verifier))) throw new Error("Incorrect vault password.");
  return key;
}

export async function saveReport(key: CryptoKey, payload: ReportPayload) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const { iv, ciphertext } = await encryptText(key, JSON.stringify(payload));
  const { error } = await supabase.from("vault_reports").insert({
    user_id: userId,
    title: payload.title,
    dataset_name: payload.datasetName,
    row_count: payload.rowCount,
    column_count: payload.columnCount,
    iv,
    ciphertext,
  });
  if (error) throw error;
}

export async function listReports(): Promise<VaultReportMeta[]> {
  const { data, error } = await supabase
    .from("vault_reports")
    .select("id, title, dataset_name, row_count, column_count, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function openReport(key: CryptoKey, id: string): Promise<ReportPayload> {
  const { data, error } = await supabase
    .from("vault_reports")
    .select("iv, ciphertext")
    .eq("id", id)
    .single();
  if (error) throw error;
  const plain = await decryptText(key, data.iv, data.ciphertext);
  return JSON.parse(plain) as ReportPayload;
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("vault_reports").delete().eq("id", id);
  if (error) throw error;
}
