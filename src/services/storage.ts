import { Sentence, ReviewLog, AIDiagnosticReport, KanjiItem, LanguageType } from '../types';
import { STARTER_SENTENCES, STARTER_REVIEW_LOGS } from '../data/starterSentences';
import { getCurrentUserId } from './authState';
import * as cloudSync from './cloudSync';

const STORAGE_KEYS = {
  SENTENCES: 'speakloop_sentences_v2',
  LOGS: 'speakloop_logs_v2',
  REPORTS: 'speakloop_reports_v2',
  STREAK: 'speakloop_streak_v2',
};

export interface UserStreak {
  count: number;
  lastActiveDate: string;
  morningEnCompleted: boolean;
  morningJaCompleted: boolean;
  eveningEnCompleted: boolean;
  eveningJaCompleted: boolean;
}

export function loadSentences(): Sentence[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SENTENCES);
    if (!data) {
      saveSentences(STARTER_SENTENCES);
      return STARTER_SENTENCES;
    }
    const parsed: Sentence[] = JSON.parse(data);
    // Normalize targetText for any legacy items
    return parsed.map((s) => ({
      ...s,
      language: s.language || 'en',
      targetText: s.targetText || s.english || s.japanese || '',
      english: s.language === 'en' ? (s.english || s.targetText) : undefined,
      japanese: s.language === 'ja' ? (s.japanese || s.targetText) : undefined,
    }));
  } catch (e) {
    console.error('Failed to load sentences from storage', e);
    return STARTER_SENTENCES;
  }
}

export function saveSentences(sentences: Sentence[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
  } catch (e) {
    console.error('Failed to save sentences', e);
  }
  const userId = getCurrentUserId();
  if (userId) {
    cloudSync.syncSentences(userId, sentences).catch((e) => console.error('[cloudSync] sentences sync failed', e));
  }
}

export function loadReviewLogs(): ReviewLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!data) {
      saveReviewLogs(STARTER_REVIEW_LOGS);
      return STARTER_REVIEW_LOGS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load review logs', e);
    return STARTER_REVIEW_LOGS;
  }
}

export function saveReviewLogs(logs: ReviewLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save review logs', e);
  }
  const userId = getCurrentUserId();
  if (userId) {
    cloudSync.syncReviewLogs(userId, logs).catch((e) => console.error('[cloudSync] logs sync failed', e));
  }
}

export function loadReports(): AIDiagnosticReport[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load reports', e);
    return [];
  }
}

export function saveReports(reports: AIDiagnosticReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save reports', e);
  }
  const userId = getCurrentUserId();
  if (userId) {
    cloudSync.syncReports(userId, reports).catch((e) => console.error('[cloudSync] reports sync failed', e));
  }
}

export function loadStreak(): UserStreak {
  const today = new Date().toISOString().split('T')[0];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (data) {
      const parsed: any = JSON.parse(data);
      if (parsed.lastActiveDate === today) {
        return {
          count: parsed.count || 3,
          lastActiveDate: today,
          morningEnCompleted: !!parsed.morningEnCompleted,
          morningJaCompleted: !!parsed.morningJaCompleted,
          eveningEnCompleted: !!parsed.eveningEnCompleted,
          eveningJaCompleted: !!parsed.eveningJaCompleted,
        };
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const isConsecutive = parsed.lastActiveDate === yesterday;
      return {
        count: isConsecutive ? parsed.count : Math.max(1, parsed.count),
        lastActiveDate: today,
        morningEnCompleted: false,
        morningJaCompleted: false,
        eveningEnCompleted: false,
        eveningJaCompleted: false,
      };
    }
  } catch (e) {
    console.error('Failed to load streak', e);
  }

  return {
    count: 3,
    lastActiveDate: today,
    morningEnCompleted: false,
    morningJaCompleted: false,
    eveningEnCompleted: false,
    eveningJaCompleted: false,
  };
}

export function recordSessionCompletion(
  timeSlot: 'morning' | 'evening',
  lang: 'en' | 'ja'
): UserStreak {
  const current = loadStreak();
  const today = new Date().toISOString().split('T')[0];

  const updated: UserStreak = {
    ...current,
    lastActiveDate: today,
    morningEnCompleted: timeSlot === 'morning' && lang === 'en' ? true : current.morningEnCompleted,
    morningJaCompleted: timeSlot === 'morning' && lang === 'ja' ? true : current.morningJaCompleted,
    eveningEnCompleted: timeSlot === 'evening' && lang === 'en' ? true : current.eveningEnCompleted,
    eveningJaCompleted: timeSlot === 'evening' && lang === 'ja' ? true : current.eveningJaCompleted,
    count: current.count + 1,
  };

  try {
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  const userId = getCurrentUserId();
  if (userId) {
    cloudSync.syncStreak(userId, updated).catch((e) => console.error('[cloudSync] streak sync failed', e));
  }
  return updated;
}

/**
 * Called right after a user signs in. If the cloud account already has
 * data, it becomes the source of truth and overwrites local storage.
 * If the cloud account is empty (first login), the current local data
 * is uploaded instead so nothing the user already entered is lost.
 */
export async function syncOnLogin(userId: string): Promise<void> {
  const cloudHasData = await cloudSync.hasAnyCloudData(userId);

  if (!cloudHasData) {
    await Promise.all([
      cloudSync.syncSentences(userId, loadSentences()),
      cloudSync.syncReviewLogs(userId, loadReviewLogs()),
      cloudSync.syncReports(userId, loadReports()),
      cloudSync.syncStreak(userId, loadStreak()),
    ]);
    return;
  }

  const [sentences, logs, reports, streak] = await Promise.all([
    cloudSync.fetchCloudSentences(userId),
    cloudSync.fetchCloudReviewLogs(userId),
    cloudSync.fetchCloudReports(userId),
    cloudSync.fetchCloudStreak(userId),
  ]);

  localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  if (streak) {
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
  }
}

/**
 * Weighted Cumulative Random Sampling for 10 sentences:
 * Supports language filter ('en' | 'ja' | 'all') and mistake-based weights.
 */
export function selectTenSentences(
  sentences: Sentence[],
  mode: 'adaptive' | 'pure_random' | 'weakness_focus' = 'adaptive',
  language: 'en' | 'ja' | 'all' = 'all'
): Sentence[] {
  let pool = [...sentences];
  if (language !== 'all') {
    pool = pool.filter((s) => s.language === language);
  }

  if (pool.length <= 10) {
    return pool.sort(() => Math.random() - 0.5);
  }

  if (mode === 'pure_random') {
    return pool.sort(() => Math.random() - 0.5).slice(0, 10);
  }

  if (mode === 'weakness_focus') {
    return pool
      .sort((a, b) => {
        const scoreA = a.lastScore || 0;
        const scoreB = b.lastScore || 0;
        const weightA = a.weightMultiplier || 1.0;
        const weightB = b.weightMultiplier || 1.0;
        return weightB - weightA || scoreA - scoreB;
      })
      .slice(0, 10)
      .sort(() => Math.random() - 0.5);
  }

  // Adaptive Mode: weighted selection
  const selected: Sentence[] = [];
  const remaining = [...pool];

  while (selected.length < 10 && remaining.length > 0) {
    const weights = remaining.map((s) => {
      let weight = s.weightMultiplier || 1.0;
      if (s.lastScore < 70) weight *= 2.0;
      else if (s.lastScore < 85) weight *= 1.3;
      if (s.reviewCount === 0) weight *= 1.8;
      return Math.max(0.2, weight);
    });

    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let randomVal = Math.random() * totalWeight;
    let chosenIdx = 0;

    for (let i = 0; i < weights.length; i++) {
      randomVal -= weights[i];
      if (randomVal <= 0) {
        chosenIdx = i;
        break;
      }
    }

    selected.push(remaining[chosenIdx]);
    remaining.splice(chosenIdx, 1);
  }

  return selected;
}

/**
 * Extracts all KanjiItems from all Japanese sentences
 */
export function getAllKanjiItems(sentences: Sentence[]): KanjiItem[] {
  const kanjiMap = new Map<string, KanjiItem>();

  for (const s of sentences) {
    if (s.language === 'ja' && s.kanjiList) {
      for (const k of s.kanjiList) {
        if (!kanjiMap.has(k.kanji)) {
          kanjiMap.set(k.kanji, { ...k, originSentenceId: s.id });
        }
      }
    }
  }

  return Array.from(kanjiMap.values());
}

/**
 * Google Sheets / CSV Export (UTF-8 BOM included)
 */
export function exportToCSV(sentences: Sentence[]): void {
  const headers = ['언어(Language)', '원문(Sentence)', '후리가나/읽기', '한국어 뜻', '카테고리', '핵심 패턴', '복습 횟수', '정답 횟수', '최근 점수', '약점 분류', '가중치'];
  const rows = sentences.map((s) => [
    s.language === 'ja' ? '일본어 (JA)' : '영어 (EN)',
    `"${(s.targetText || s.english || s.japanese || '').replace(/"/g, '""')}"`,
    `"${(s.reading || '').replace(/"/g, '""')}"`,
    `"${(s.korean || '').replace(/"/g, '""')}"`,
    `"${(s.category || '').replace(/"/g, '""')}"`,
    `"${(s.keyPattern || '').replace(/"/g, '""')}"`,
    s.reviewCount,
    s.correctCount,
    s.lastScore,
    `"${(s.weaknessCategory || '정상').replace(/"/g, '""')}"`,
    s.weightMultiplier.toFixed(1),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `speakloop_sentences_en_ja_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parses CSV or Google Sheets copied text
 */
export function parseImportData(rawText: string, defaultLang: LanguageType = 'en'): Array<{
  targetText: string;
  korean: string;
  language: LanguageType;
  category?: string;
  reading?: string;
  pattern?: string;
}> {
  const lines = rawText.trim().split(/\r?\n/).filter(Boolean);
  const results: Array<{
    targetText: string;
    korean: string;
    language: LanguageType;
    category?: string;
    reading?: string;
    pattern?: string;
  }> = [];

  for (const line of lines) {
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 2) {
        // Detect if Japanese characters exist
        const isJa = defaultLang === 'ja' || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(parts[0]);
        results.push({
          targetText: parts[0],
          korean: parts[1],
          language: isJa ? 'ja' : 'en',
          category: parts[2] || '일상 회화',
          pattern: parts[3] || '',
        });
        continue;
      }
    }

    if (line.includes('//')) {
      const [foreign, kor] = line.split('//').map((p) => p.trim());
      if (foreign && kor) {
        const isJa = defaultLang === 'ja' || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(foreign);
        results.push({ targetText: foreign, korean: kor, language: isJa ? 'ja' : 'en', category: '일상 회화' });
        continue;
      }
    }

    if (line.includes('-') && !line.startsWith('-')) {
      const [foreign, kor] = line.split('-').map((p) => p.trim());
      if (foreign && kor) {
        const isJa = defaultLang === 'ja' || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(foreign);
        results.push({ targetText: foreign, korean: kor, language: isJa ? 'ja' : 'en', category: '일상 회화' });
        continue;
      }
    }

    const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length >= 2 && !parts[0].includes('영어') && !parts[0].includes('일본어')) {
      const isJa = defaultLang === 'ja' || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(parts[0]);
      results.push({
        targetText: parts[0],
        korean: parts[1],
        language: isJa ? 'ja' : 'en',
        category: parts[2] || '일상 회화',
        pattern: parts[3] || '',
      });
    }
  }

  return results;
}
