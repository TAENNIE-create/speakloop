import React, { useState, useEffect } from 'react';
import { Sentence, ReviewLog, AIDiagnosticReport, LanguageType } from './types';
import {
  loadSentences,
  saveSentences,
  loadReviewLogs,
  saveReviewLogs,
  loadReports,
  saveReports,
  loadStreak,
  getAllKanjiItems,
  syncOnLogin,
  UserStreak,
} from './services/storage';
import { setCurrentUserId } from './services/authState';
import { useAuth } from './hooks/useAuth';

import { Header } from './components/Header';
import { LiveDateTimeBanner } from './components/LiveDateTimeBanner';
import { TodayChecklist } from './components/TodayChecklist';
import { QuickSentenceInput } from './components/QuickSentenceInput';
import { TodayKanjiSection } from './components/TodayKanjiSection';
import { SentenceList } from './components/SentenceList';
import { SentenceRegister } from './components/SentenceRegister';
import { SpeakingTestModal } from './components/SpeakingTestModal';
import { TenQuestionQuiz } from './components/TenQuestionQuiz';
import { KanjiReadingQuiz } from './components/KanjiReadingQuiz';
import { TenDayReportModal } from './components/TenDayReportModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [reports, setReports] = useState<AIDiagnosticReport[]>([]);
  const [streak, setStreak] = useState<UserStreak>({
    count: 3,
    lastActiveDate: new Date().toISOString().split('T')[0],
    morningEnCompleted: false,
    morningJaCompleted: false,
    eveningEnCompleted: false,
    eveningJaCompleted: false,
  });

  // Current active language: 'en' or 'ja' (defaults cleanly to 'en')
  const [activeLanguage, setActiveLanguage] = useState<LanguageType>('en');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizSessionType, setQuizSessionType] = useState<'morning' | 'evening' | 'adaptive10'>('adaptive10');
  const [isKanjiQuizOpen, setIsKanjiQuizOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSheetsOpen, setIsSheetsOpen] = useState(false);

  // Single sentence immediate test state
  const [activeTestSentence, setActiveTestSentence] = useState<Sentence | null>(null);

  // Cloud login / sync
  const { user, signOut } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const reloadFromLocalStorage = () => {
    setSentences(loadSentences());
    setReviewLogs(loadReviewLogs());
    setReports(loadReports());
    setStreak(loadStreak());
  };

  // Load saved data (local-first, so the app works instantly offline)
  useEffect(() => {
    reloadFromLocalStorage();
  }, []);

  // When the signed-in user changes, point storage.ts's cloud mirroring at
  // them, then reconcile local data with whatever is already in the cloud.
  useEffect(() => {
    setCurrentUserId(user?.id ?? null);
    if (!user) return;

    setIsSyncing(true);
    syncOnLogin(user.id)
      .then(reloadFromLocalStorage)
      .catch((e) => console.error('[cloudSync] initial sync failed', e))
      .finally(() => setIsSyncing(false));
  }, [user]);

  const handleSentenceAdded = (newSentence: Sentence) => {
    const updated = [newSentence, ...sentences];
    setSentences(updated);
    saveSentences(updated);
  };

  const handleSaveSentence = (newSentence: Sentence, immediateTest: boolean) => {
    handleSentenceAdded(newSentence);
    if (immediateTest) {
      setIsRegisterOpen(false);
      setActiveTestSentence(newSentence);
    }
  };

  const handleBulkSave = (newSentences: Sentence[]) => {
    const updated = [...newSentences, ...sentences];
    setSentences(updated);
    saveSentences(updated);
  };

  const handleUpdateSentence = (updatedSentence: Sentence) => {
    const updated = sentences.map((s) => (s.id === updatedSentence.id ? updatedSentence : s));
    setSentences(updated);
    saveSentences(updated);
  };

  const handleDeleteSentence = (id: string) => {
    const updated = sentences.filter((s) => s.id !== id);
    setSentences(updated);
    saveSentences(updated);
  };

  const handleDeleteAllForLanguage = () => {
    const updated = sentences.filter((s) => s.language !== activeLanguage);
    setSentences(updated);
    saveSentences(updated);
  };

  const handleSaveReviewLog = (log: ReviewLog) => {
    const updated = [log, ...reviewLogs];
    setReviewLogs(updated);
    saveReviewLogs(updated);
  };

  const handleStartQuiz = (mode: 'morning' | 'evening' | 'adaptive10') => {
    setQuizSessionType(mode);
    setIsQuizOpen(true);
  };

  const isJapanese = activeLanguage === 'ja';
  const allKanji = getAllKanjiItems(sentences);
  const currentLangSentences = sentences.filter((s) => s.language === activeLanguage);

  return (
    <div className={`min-h-screen bg-[#faf6ec] text-slate-800 flex flex-col font-sans transition-colors ${
      isJapanese
        ? 'selection:bg-[#e9cec4] selection:text-[#6b4038]'
        : 'selection:bg-[#c9d7ea] selection:text-[#33517a]'
    }`}>
      
      {/* Clean Minimal Header */}
      <Header
        streak={streak}
        activeLanguage={activeLanguage}
        onChangeLanguage={setActiveLanguage}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSheets={() => setIsSheetsOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={signOut}
      />

      {/* Cloud sync indicator */}
      {isSyncing && (
        <div className="bg-[#eef3fa] text-[#3a5c8a] text-xs font-semibold text-center py-1.5">
          클라우드와 동기화하는 중...
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        
        {/* Live Date and Current Time Widget */}
        <LiveDateTimeBanner
          language={activeLanguage}
          totalSentences={currentLangSentences.length}
        />

        {/* 1. Today's Learning Checklist Buttons */}
        <TodayChecklist
          language={activeLanguage}
          streak={streak}
          totalSentences={currentLangSentences.length}
          totalKanji={allKanji.length}
          onStartMorningQuiz={() => handleStartQuiz('morning')}
          onStartEveningQuiz={() => handleStartQuiz('evening')}
          onStartWeaknessQuiz={() => handleStartQuiz('adaptive10')}
          onStartKanjiQuiz={() => setIsKanjiQuizOpen(true)}
        />

        {/* 2. One-Input Quick Auto-Translate Bar */}
        <QuickSentenceInput
          language={activeLanguage}
          onSentenceAdded={handleSentenceAdded}
        />

        {/* 3. Japanese Mode: "오늘의 한자" Section (Completely hidden in English mode) */}
        {isJapanese && (
          <TodayKanjiSection
            kanjiList={allKanji}
            onStartKanjiQuiz={() => setIsKanjiQuizOpen(true)}
          />
        )}

        {/* 4. Language-Scoped Sentence Library */}
        <SentenceList
          sentences={sentences}
          language={activeLanguage}
          onTestSentence={(sentence) => setActiveTestSentence(sentence)}
          onDeleteSentence={handleDeleteSentence}
          onDeleteAll={handleDeleteAllForLanguage}
          onOpenRegister={() => setIsRegisterOpen(true)}
        />

      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-[#efe4c9] py-6 text-center text-xs text-[#9a8c68]">
        <p>SpeakLoop - AI Spaced Repetition English & Japanese Speaking Practice</p>
      </footer>

      {/* Modals */}
      {/* 1. Single Sentence Immediate Speaking Test */}
      {activeTestSentence && (
        <SpeakingTestModal
          sentence={activeTestSentence}
          isOpen={!!activeTestSentence}
          onClose={() => setActiveTestSentence(null)}
          onComplete={(updatedSentence, score, passed) => {
            handleUpdateSentence(updatedSentence);
            const log: ReviewLog = {
              id: `log-${Date.now()}`,
              language: updatedSentence.language || 'en',
              sentenceId: updatedSentence.id,
              targetSentence: updatedSentence.targetText || updatedSentence.english || updatedSentence.japanese || '',
              spokenText: '',
              score,
              passed,
              weaknessCategory: updatedSentence.weaknessCategory || '정확함',
              feedback: '',
              timestamp: new Date().toISOString(),
              mode: 'immediate',
            };
            handleSaveReviewLog(log);
          }}
        />
      )}

      {/* 2. 10-Question Random Quiz (Scoped strictly to activeLanguage) */}
      <TenQuestionQuiz
        allSentences={sentences}
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onUpdateSentence={handleUpdateSentence}
        onSaveReviewLog={handleSaveReviewLog}
        sessionType={quizSessionType}
        targetLanguage={activeLanguage}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* 3. Japanese Kanji Reading Quiz */}
      <KanjiReadingQuiz
        kanjiList={allKanji}
        allSentences={sentences}
        isOpen={isKanjiQuizOpen}
        onClose={() => setIsKanjiQuizOpen(false)}
      />

      {/* 4. 10-Day AI Comprehensive Report */}
      <TenDayReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        sentences={sentences}
        reviewLogs={reviewLogs}
        reports={reports}
        defaultLanguage={activeLanguage}
        onAddSentence={(newSentence) => {
          handleSentenceAdded(newSentence);
          alert(`'${newSentence.targetText}' 문장이 보관함에 추가되었습니다!`);
        }}
        onUpdateReports={(newReports) => setReports(newReports)}
      />

      {/* 5. Google Sheets Sync */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsOpen}
        onClose={() => setIsSheetsOpen(false)}
        sentences={sentences}
        onImportSentences={(imported) => {
          const updated = [...imported, ...sentences];
          setSentences(updated);
          saveSentences(updated);
        }}
      />

      {/* 6. Register Sentence Detailed Modal */}
      <SentenceRegister
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSaveSentence={handleSaveSentence}
        onBulkSave={handleBulkSave}
        defaultLanguage={activeLanguage}
      />

      {/* 7. Login / Sign up */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

    </div>
  );
}
