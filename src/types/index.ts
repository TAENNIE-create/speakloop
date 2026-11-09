export type LanguageType = 'en' | 'ja';

export interface KanjiItem {
  id: string;
  kanji: string;
  reading: string; // Hiragana (e.g., "てつだう", "いそぐ")
  readingType: '훈독 (訓読み)' | '음독 (音読み)' | '혼합/특수';
  meaning: string; // Korean meaning + kanji explanation
  originSentenceId?: string;
  testedCount: number;
  correctCount: number;
  lastScore?: number;
  lastTestedAt?: string | null;
}

export interface Sentence {
  id: string;
  language: LanguageType;
  targetText: string; // English or Japanese sentence
  english?: string; // backward compatibility
  japanese?: string;
  reading?: string; // Hiragana reading for Japanese (후리가나)
  korean: string;
  category: string;
  keyPattern?: string;
  kanjiList?: KanjiItem[]; // Extracted Kanji words for Japanese
  createdAt: string; // ISO date string
  reviewCount: number;
  correctCount: number;
  lastScore: number;
  lastReviewedAt: string | null;
  weaknessCategory: string | null;
  weightMultiplier: number; // e.g. 1.0, 1.5, 2.0 based on mistakes
  notes?: string;
}

export interface WordDiffItem {
  word: string;
  status: 'correct' | 'missing' | 'wrong' | 'added';
  spoken?: string;
}

export interface EvaluationResult {
  score: number;
  passed: boolean;
  feedback: string;
  weaknessCategory: string;
  nativeAlternative: string;
  wordDiff: WordDiffItem[];
}

export interface ReviewLog {
  id: string;
  language: LanguageType;
  sentenceId: string;
  targetSentence: string;
  spokenText: string;
  score: number;
  passed: boolean;
  weaknessCategory: string;
  feedback: string;
  timestamp: string;
  mode: 'morning' | 'evening' | 'immediate' | 'practice';
}

export interface WeaknessPattern {
  category: string;
  frequency: number;
  explanation: string;
  sampleMistake: string;
  correctiveRule: string;
}

export interface SpacedRepetitionAdjustment {
  category: string;
  weightMultiplier: number;
  reason: string;
}

export interface SuggestedSentence {
  language: LanguageType;
  targetText: string;
  reading?: string;
  korean: string;
  focusReason: string;
}

export interface AIDiagnosticReport {
  id: string;
  language: LanguageType | 'all';
  generatedAt: string;
  period: string;
  reportTitle: string;
  overallScore: number;
  masteryRate: number;
  totalReviews: number;
  kanjiMasteryRate?: number; // Japanese kanji quiz accuracy
  summaryDiagnosis: string;
  coreStrengths: string[];
  topWeaknesses: WeaknessPattern[];
  spacedRepetitionAdjustments: SpacedRepetitionAdjustment[];
  actionPlan: string[];
  suggestedNewSentences: SuggestedSentence[];
  coachEncouragement: string;
}

export type ReviewSessionMode = 'morning' | 'evening' | 'immediate' | 'adaptive10' | 'random10' | 'weakness10' | 'kanji_test';
