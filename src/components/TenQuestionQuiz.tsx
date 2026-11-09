import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Mic,
  Volume2,
  Sparkles,
  HelpCircle,
  X,
  Keyboard,
  ChevronRight,
  RotateCcw,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BookOpen,
} from 'lucide-react';
import { Sentence, EvaluationResult, ReviewLog, LanguageType } from '../types';
import { selectTenSentences, recordSessionCompletion } from '../services/storage';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { sounds } from '../services/sound';

interface TenQuestionQuizProps {
  allSentences: Sentence[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateSentence: (updated: Sentence) => void;
  onSaveReviewLog: (log: ReviewLog) => void;
  sessionType?: 'morning' | 'evening' | 'adaptive10';
  targetLanguage?: LanguageType | 'all';
  onOpenReport?: () => void;
}

export const TenQuestionQuiz: React.FC<TenQuestionQuizProps> = ({
  allSentences,
  isOpen,
  onClose,
  onUpdateSentence,
  onSaveReviewLog,
  sessionType = 'adaptive10',
  targetLanguage = 'en',
  onOpenReport,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageType | 'all'>(targetLanguage);
  const [quizQuestions, setQuizQuestions] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<'adaptive' | 'pure_random' | 'weakness_focus'>('adaptive');
  const [showHint, setShowHint] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [sessionResults, setSessionResults] = useState<Array<{ sentence: Sentence; result: EvaluationResult }>>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const currentSentence = quizQuestions[currentIndex];
  const isJapanese = currentSentence?.language === 'ja';
  const targetSentenceText = currentSentence ? (currentSentence.targetText || currentSentence.english || currentSentence.japanese || '') : '';

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    audioLevel,
    error: speechError,
  } = useSpeechRecognition(isJapanese ? 'ja' : 'en');

  useEffect(() => {
    if (isOpen) {
      setSelectedLang(targetLanguage);
      initQuiz(quizMode, targetLanguage);
    } else {
      stopListening();
    }
  }, [isOpen, targetLanguage]);

  const initQuiz = (
    mode: 'adaptive' | 'pure_random' | 'weakness_focus',
    lang: LanguageType | 'all' = selectedLang
  ) => {
    const selected = selectTenSentences(allSentences, mode, lang);
    setQuizQuestions(selected);
    setCurrentIndex(0);
    setSessionResults([]);
    setIsCompleted(false);
    setResult(null);
    setShowHint(false);
    resetTranscript();
  };

  if (!isOpen) return null;

  const currentText = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      setResult(null);
      startListening();
    }
  };

  const handlePlayTTS = async (text: string, rate: number = 0.95) => {
    await sounds.speak(text, isJapanese ? 'ja' : 'en', rate);
  };

  const handleSubmitQuestion = async () => {
    stopListening();
    const spoken = currentText.trim();
    if (!spoken || !currentSentence) return;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSentence: targetSentenceText,
          spokenText: spoken,
          koreanMeaning: currentSentence.korean,
          language: currentSentence.language || 'en',
        }),
      });

      const evalData: EvaluationResult = await res.json();
      setResult(evalData);

      if (evalData.passed) {
        sounds.playSuccess();
      } else {
        sounds.playNeedsReview();
      }

      let newWeight = currentSentence.weightMultiplier || 1.0;
      if (evalData.score >= 90) {
        newWeight = Math.max(0.6, newWeight * 0.85);
      } else if (evalData.score < 75) {
        newWeight = Math.min(3.5, newWeight * 1.35);
      }

      const updatedSentence: Sentence = {
        ...currentSentence,
        reviewCount: (currentSentence.reviewCount || 0) + 1,
        correctCount: (currentSentence.correctCount || 0) + (evalData.passed ? 1 : 0),
        lastScore: evalData.score,
        lastReviewedAt: new Date().toISOString(),
        weaknessCategory: evalData.weaknessCategory,
        weightMultiplier: Number(newWeight.toFixed(2)),
      };

      onUpdateSentence(updatedSentence);

      const log: ReviewLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        language: currentSentence.language || 'en',
        sentenceId: currentSentence.id,
        targetSentence: targetSentenceText,
        spokenText: spoken,
        score: evalData.score,
        passed: evalData.passed,
        weaknessCategory: evalData.weaknessCategory,
        feedback: evalData.feedback,
        timestamp: new Date().toISOString(),
        mode: sessionType === 'morning' ? 'morning' : sessionType === 'evening' ? 'evening' : 'practice',
      };
      onSaveReviewLog(log);

      setSessionResults((prev) => [...prev, { sentence: currentSentence, result: evalData }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    resetTranscript();
    setResult(null);
    setShowHint(false);
    setManualMode(false);

    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      if (sessionType === 'morning' || sessionType === 'evening') {
        const langToRecord = selectedLang === 'ja' ? 'ja' : 'en';
        recordSessionCompletion(sessionType, langToRecord);
      }
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  };

  const handleRestartIncorrect = () => {
    const wrongOnes = sessionResults
      .filter((r) => !r.result.passed || r.result.score < 75)
      .map((r) => r.sentence);

    if (wrongOnes.length > 0) {
      setQuizQuestions(wrongOnes);
      setCurrentIndex(0);
      setSessionResults([]);
      setIsCompleted(false);
      setResult(null);
      resetTranscript();
    } else {
      initQuiz('adaptive', selectedLang);
    }
  };

  const totalScoreSum = sessionResults.reduce((acc, r) => acc + r.result.score, 0);
  const avgScore = sessionResults.length > 0 ? Math.round(totalScoreSum / sessionResults.length) : 0;
  const passedCount = sessionResults.filter((r) => r.result.passed).length;
  const failedResults = sessionResults.filter((r) => !r.result.passed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isJapanese ? 'bg-[#bd6f63]' : 'bg-[#5b7fb0]'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider font-serif ${isJapanese ? 'text-[#a85850]' : 'text-[#5b7fb0]'}`}>
              {sessionType === 'morning'
                ? `🌅 아침 ${selectedLang === 'ja' ? '일본어' : '영어'} 10문장 복습`
                : sessionType === 'evening'
                ? `🌙 저녁 ${selectedLang === 'ja' ? '일본어' : '영어'} 10문장 복습`
                : `🎯 스마트 ${selectedLang === 'ja' ? '일본어' : '영어'} 10문장 훈련`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isCompleted && quizQuestions.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fffbf0] border border-[#e6d9b9] text-slate-700">
                {currentIndex + 1} / {quizQuestions.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#f6eed6] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!isCompleted && (
          <div className="w-full bg-[#f6eed6] h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isJapanese ? 'bg-[#bd6f63]' : 'bg-[#5b7fb0]'
              }`}
              style={{
                width: `${((currentIndex + (result ? 1 : 0)) / Math.max(1, quizQuestions.length)) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {!isCompleted ? (
            currentSentence ? (
              <div className="space-y-6">
                
                {/* Prompt Banner */}
                <div className="bg-[#fbf4e0] border border-[#efe4c9] rounded-2xl p-5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      한국어 뜻을 보고 {isJapanese ? '일본어로' : '영어로'} 말해보세요
                    </span>
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs text-[#5b7fb0] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showHint ? '힌트 닫기' : '힌트'}</span>
                    </button>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                    {currentSentence.korean}
                  </h2>

                  {showHint && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1 animate-in fade-in">
                      {currentSentence.keyPattern && (
                        <div>
                          <span className="font-semibold text-[#6c8fc7]">💡 핵심 패턴:</span>{' '}
                          {currentSentence.keyPattern}
                        </div>
                      )}
                      {isJapanese && currentSentence.reading && (
                        <div>
                          <span className="font-semibold text-[#a85850]">📖 히라가나 읽기:</span>{' '}
                          <span className="font-mono text-slate-900">{currentSentence.reading}</span>
                        </div>
                      )}
                      {!isJapanese && (
                        <div>
                          <span className="font-semibold text-[#6c8fc7]">🔤 첫 단어:</span>{' '}
                          <span className="font-mono">{targetSentenceText.split(' ')[0]} ...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Microphone / Speaking Zone */}
                {!result ? (
                  <div className="flex flex-col items-center justify-center py-2 space-y-4">
                    
                    <div className="relative flex items-center justify-center">
                      {isListening && (
                        <div
                          className={`absolute rounded-full animate-pulse-ring ${
                            isJapanese ? 'bg-[#bd6f63]/20' : 'bg-[#5b7fb0]/20'
                          }`}
                          style={{
                            width: `${110 + audioLevel * 0.8}px`,
                            height: `${110 + audioLevel * 0.8}px`,
                          }}
                        />
                      )}

                      <button
                        onClick={handleToggleMic}
                        disabled={isEvaluating}
                        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-95 cursor-pointer ${
                          isListening
                            ? 'bg-[#bd6f63] text-white shadow-[#bd6f63]/30 ring-4 ring-[#e9cec4] scale-105'
                            : isJapanese
                            ? 'bg-[#bd6f63] hover:bg-[#a85850] text-white shadow-[#a85850]/20'
                            : 'bg-[#5b7fb0] hover:bg-[#4a6a96] text-white shadow-[#5b7fb0]/20'
                        }`}
                      >
                        <Mic className="w-8 h-8" />
                      </button>
                    </div>

                    <div className="text-center space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {isListening ? `듣고 있습니다... ${isJapanese ? '일본어로' : '영어로'} 말씀하세요` : `마이크를 켜고 ${isJapanese ? '일본어로' : '영어로'} 말하세요`}
                      </p>
                    </div>

                    {speechError && (
                      <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        {speechError}
                      </div>
                    )}

                    {/* Live Transcript Box */}
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-xs font-semibold text-slate-500">인식된 발화 내용:</span>
                        <button
                          onClick={() => setManualMode(!manualMode)}
                          className="text-xs text-[#6c8fc7] hover:underline flex items-center gap-1"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                          <span>{manualMode ? '음성 모드로' : '직접 타이핑'}</span>
                        </button>
                      </div>

                      {manualMode ? (
                        <textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          placeholder={isJapanese ? '일본어로 직접 입력...' : '영어로 직접 입력...'}
                          className="w-full p-3.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-800 text-sm focus:border-[#6c8fc7] focus:bg-white focus:outline-none resize-none h-18"
                        />
                      ) : (
                        <div className="w-full min-h-[60px] p-3.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-sm flex items-center">
                          {currentText ? (
                            <span className="text-slate-900 font-semibold">
                              {currentText}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              마이크를 누르고 한국어 뜻에 맞는 {isJapanese ? '일본어를' : '영어를'} 말해보세요...
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    {currentText.trim().length > 0 && (
                      <div className="flex items-center gap-3 w-full pt-1">
                        <button
                          onClick={resetTranscript}
                          className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                        >
                          다시 말하기
                        </button>
                        <button
                          onClick={handleSubmitQuestion}
                          disabled={isEvaluating}
                          className={`flex-1 py-3 px-5 rounded-2xl text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                            isJapanese
                              ? 'bg-[#a85850] hover:bg-[#bd6f63]'
                              : 'bg-[#6c8fc7] hover:bg-[#5a7cb3]'
                          }`}
                        >
                          {isEvaluating ? (
                            <>
                              <Sparkles className="w-4 h-4 animate-spin" />
                              <span>AI 채점 중...</span>
                            </>
                          ) : (
                            <span>제출 및 AI 분석 확인</span>
                          )}
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  /* Question Result View */
                  <div className="space-y-4 animate-in fade-in duration-200">
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#faf8f3] border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                            result.score >= 85
                              ? 'bg-emerald-100 text-emerald-700'
                              : result.score >= 70
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-[#f8eae4] text-[#8a5047]'
                          }`}
                        >
                          {result.score}점
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {result.passed ? '합격!' : '복습 필요'}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold">
                              {result.weaknessCategory}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {result.passed ? '핵심 표현이 훌륭하게 전달되었습니다.' : '문장 구성을 다시 확인해보세요.'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePlayTTS(targetSentenceText)}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#6c8fc7] text-slate-700 hover:text-[#6c8fc7] text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Volume2 className="w-4 h-4 text-[#6c8fc7]" />
                        <span>원어민 발음</span>
                      </button>
                    </div>

                    {/* Word-by-word diff */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs shadow-sm">
                      <div className="text-slate-500 font-bold">🎯 정답: <span className="text-slate-900 font-bold">{targetSentenceText}</span></div>
                      <div>
                        <span className="text-slate-500 font-bold block mb-1">🗣 발화 분석:</span>
                        <div className="flex flex-wrap gap-1">
                          {result.wordDiff && result.wordDiff.map((item, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                                item.status === 'correct'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'missing'
                                  ? 'bg-amber-100 text-amber-800 line-through'
                                  : 'bg-[#f8eae4] text-[#6b4038]'
                              }`}
                            >
                              {item.word}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Japanese Kanji details if Japanese */}
                    {isJapanese && currentSentence.kanjiList && currentSentence.kanjiList.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-[#fcf3ef] border border-[#f8eae4] text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-[#8a5047]">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>오늘의 한자 훈독(訓読み) 포인트</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentSentence.kanjiList.map((k, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-[#e9cec4] text-[11px] text-slate-800">
                              <strong className="text-[#4a2a22]">{k.kanji}</strong> ({k.reading}) - {k.meaning}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Feedback */}
                    <div className={`p-4 rounded-2xl border text-xs text-slate-800 space-y-1 ${
                      isJapanese
                        ? 'bg-[#f8eae4] border-[#e9cec4]'
                        : 'bg-[#eef3fa] border-[#c9d7ea]'
                    }`}>
                      <div className={`flex items-center gap-1.5 font-bold ${
                        isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI 피드백 & 팁</span>
                      </div>
                      <p>{result.feedback}</p>
                      {result.nativeAlternative && (
                        <p className={`pt-1 ${isJapanese ? 'text-[#8a5047]' : 'text-[#355480]'}`}>
                          💡 <span className="font-semibold">원어민 팁:</span> {result.nativeAlternative}
                        </p>
                      )}
                    </div>

                    {/* Next Button */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => {
                          setResult(null);
                          resetTranscript();
                          startListening();
                        }}
                        className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>다시 발화</span>
                      </button>

                      <button
                        onClick={handleNextQuestion}
                        className={`px-6 py-2.5 rounded-2xl text-white text-xs font-bold shadow-sm flex items-center gap-2 transition ${
                          isJapanese ? 'bg-[#a85850] hover:bg-[#bd6f63]' : 'bg-[#6c8fc7] hover:bg-[#5a7cb3]'
                        }`}
                      >
                        <span>
                          {currentIndex + 1 < quizQuestions.length ? '다음 문장' : '테스트 완료 결과 보기'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">문장 데이터가 없습니다.</div>
            )
          ) : (
            /* Session Completed View */
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
              <div className={`inline-flex p-4 rounded-3xl border ${
                isJapanese
                  ? 'bg-[#f8eae4] text-[#bd6f63] border-[#e9cec4]'
                  : 'bg-[#eef3fa] text-[#5b7fb0] border-[#c9d7ea]'
              }`}>
                <Trophy className="w-12 h-12 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  10문장 회화 복습 완료!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  오늘 세션이 기록되었으며, AI가 취약점 빈도를 학습 알고리즘에 반영했습니다.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[#faf8f3] border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">세션 평균 점수</span>
                  <span className="text-2xl font-black text-slate-900">{avgScore}점</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#faf8f3] border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">합격 문장</span>
                  <span className="text-2xl font-black text-emerald-600">{passedCount} / {quizQuestions.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#faf8f3] border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">연속 출석</span>
                  <div className="flex items-center justify-center gap-1 text-2xl font-black text-orange-500">
                    <Flame className="w-5 h-5 fill-orange-500" />
                    <span>달성</span>
                  </div>
                </div>
              </div>

              {/* Failed items list */}
              {failedResults.length > 0 && (
                <div className="text-left p-4 rounded-2xl bg-[#fcf3ef] border border-[#e9cec4] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#8a5047]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>이번 세션에서 보완이 필요한 문장 ({failedResults.length}개)</span>
                  </div>
                  <div className="space-y-1.5">
                    {failedResults.map(({ sentence, result: res }, i) => (
                      <div key={i} className="text-xs p-2.5 rounded-xl bg-white border border-[#f8eae4] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{sentence.korean}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{sentence.targetText}</span>
                        </div>
                        <span className="text-[#a85850] font-bold ml-2 shrink-0">{res.score}점 ({res.weaknessCategory})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                {failedResults.length > 0 && (
                  <button
                    onClick={handleRestartIncorrect}
                    className="px-4 py-2.5 rounded-2xl border border-[#d9b3a8] text-[#8a5047] hover:bg-[#fcf3ef] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>틀린 문장만 집중 복습</span>
                  </button>
                )}

                {onOpenReport && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReport();
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      isJapanese
                        ? 'bg-[#f8eae4] hover:bg-[#e9cec4] text-[#8a5047] border border-[#e9cec4]'
                        : 'bg-[#eef3fa] hover:bg-[#d7e2f0] text-[#3a5c8a] border border-[#c9d7ea]'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`} />
                    <span>10일 AI 종합 리포트 보기</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className={`px-6 py-2.5 rounded-2xl text-white text-xs font-bold shadow-xs transition cursor-pointer ${
                    isJapanese ? 'bg-[#bd6f63] hover:bg-[#a85850]' : 'bg-[#5b7fb0] hover:bg-[#4a6a96]'
                  }`}
                >
                  학습 완료 및 홈으로
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
