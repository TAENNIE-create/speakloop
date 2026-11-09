import { supabase } from './supabaseClient';
import { Sentence, ReviewLog, AIDiagnosticReport } from '../types';
import type { UserStreak } from './storage';

const TABLES = {
  SENTENCES: 'user_sentences',
  LOGS: 'user_review_logs',
  REPORTS: 'user_reports',
  STREAK: 'user_streaks',
} as const;

async function upsertRows(table: string, userId: string, rows: { id: string; data: unknown }[]) {
  if (!supabase || rows.length === 0) return;
  const payload = rows.map((r) => ({
    user_id: userId,
    id: r.id,
    data: r.data,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'user_id,id' });
  if (error) console.error(`[cloudSync] upsert ${table} failed`, error);
}

async function fetchAll<T>(table: string, userId: string): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('data').eq('user_id', userId);
  if (error) {
    console.error(`[cloudSync] fetch ${table} failed`, error);
    return [];
  }
  return (data || []).map((row: { data: T }) => row.data);
}

async function pruneDeleted(table: string, userId: string, currentIds: string[]) {
  if (!supabase) return;
  const { data, error } = await supabase.from(table).select('id').eq('user_id', userId);
  if (error) {
    console.error(`[cloudSync] prune-fetch ${table} failed`, error);
    return;
  }
  const cloudIds = (data || []).map((r: { id: string }) => r.id);
  const toDelete = cloudIds.filter((id) => !currentIds.includes(id));
  if (toDelete.length === 0) return;
  const { error: delError } = await supabase.from(table).delete().eq('user_id', userId).in('id', toDelete);
  if (delError) console.error(`[cloudSync] prune ${table} failed`, delError);
}

export async function syncSentences(userId: string, sentences: Sentence[]): Promise<void> {
  await upsertRows(TABLES.SENTENCES, userId, sentences.map((s) => ({ id: s.id, data: s })));
  await pruneDeleted(TABLES.SENTENCES, userId, sentences.map((s) => s.id));
}

export async function fetchCloudSentences(userId: string): Promise<Sentence[]> {
  return fetchAll<Sentence>(TABLES.SENTENCES, userId);
}

export async function syncReviewLogs(userId: string, logs: ReviewLog[]): Promise<void> {
  await upsertRows(TABLES.LOGS, userId, logs.map((l) => ({ id: l.id, data: l })));
}

export async function fetchCloudReviewLogs(userId: string): Promise<ReviewLog[]> {
  return fetchAll<ReviewLog>(TABLES.LOGS, userId);
}

export async function syncReports(userId: string, reports: AIDiagnosticReport[]): Promise<void> {
  await upsertRows(TABLES.REPORTS, userId, reports.map((r) => ({ id: r.id, data: r })));
}

export async function fetchCloudReports(userId: string): Promise<AIDiagnosticReport[]> {
  return fetchAll<AIDiagnosticReport>(TABLES.REPORTS, userId);
}

export async function syncStreak(userId: string, streak: UserStreak): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLES.STREAK)
    .upsert({ user_id: userId, data: streak, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) console.error('[cloudSync] upsert streak failed', error);
}

export async function fetchCloudStreak(userId: string): Promise<UserStreak | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLES.STREAK).select('data').eq('user_id', userId).maybeSingle();
  if (error) {
    console.error('[cloudSync] fetch streak failed', error);
    return null;
  }
  return data ? (data.data as UserStreak) : null;
}

export async function hasAnyCloudData(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { count, error } = await supabase
    .from(TABLES.SENTENCES)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    console.error('[cloudSync] existence check failed', error);
    return false;
  }
  return (count ?? 0) > 0;
}
