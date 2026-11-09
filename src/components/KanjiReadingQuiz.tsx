import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  X,
  Trophy,
  Mic,
} from 'lucide-react';
import { KanjiItem, Sentence } from '../types';
import { sounds } from '../services/sound';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface KanjiReadingQuizProps {
  kanjiList: KanjiItem[];
  allSentences: Sentence[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateKanjiItem?: (item: KanjiItem) => void;
}

export const KanjiReadingQuiz: React.FC<KanjiReadingQuizProps> = ({
  kanjiList,
  allSentences,
  isOpen,
  onClose,
  onUpdateKanjiItem,
}) => {
  const [quizList, setQuizList] = useState<KanjiItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [scoreList, setScoreList] = useState<boolean[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition('ja');

  useEffect(() => {
    if (isOpen) {
      initQuiz();
    }
  }, [isOpen, kanjiList.length]);

  useEffect(() => {
    if (transcript) {
      setUserInput(transcript.replace(/\s+/g, ''));
    }
  }, [transcript]);

  const initQuiz = () => {
    if (kanjiList.length === 0) return;
    const shuffled = [...kanjiList]
      .sort((a, b) => {
        const scoreA = a.lastScore ?? 0;
        const scoreB = b.lastScore ?? 0;
        return (scoreA - scoreB) + (Math.random() - 0.5) * 40;
      })
      .slice(0, 10);
    setQuizList(shuffled);
    setCurrentIndex(0);
    setUserInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setScoreList([]);
    setShowHint(false);
    setIsCompleted(false);
  };

  if (!isOpen) return null;

  const currentItem = quizList[currentIndex];
  const originSentence = currentItem?.originSentenceId
    ? allSentences.find((s) => s.id === currentItem.originSentenceId)
    : null;

  const cleanString = (str: string) =>
    str.trim().toLowerCase().replace(/[\s.,?!'、。！？]/g, '');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    stopListening();
    if (!userInput.trim() || !currentItem) return;

    const userClean = cleanString(userInput);
    const correctClean = cleanString(currentItem.reading);

    const correct = userClean === correctClean || userClean.includes(correctClean);
    setIsCorrect(correct);
    setIsAnswered(true);
    setScoreList((prev) => [...prev, correct]);

    if (correct) {
      sounds.playSuccess();
    } else {
      sounds.playNeedsReview();
    }

    if (onUpdateKanjiItem) {
      onUpdateKanjiItem({
        ...currentItem,
        testedCount: (currentItem.testedCount || 0) + 1,
        correctCount: (currentItem.correctCount || 0) + (correct ? 1 : 0),
        lastScore: correct ? 100 : 0,
        lastTestedAt: new Date().toISOString(),
      });
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setIsCorrect(false);
    setUserInput('');
    setShowHint(false);
    resetTranscript();

    if (currentIndex + 1 < quizList.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const correctCount = scoreList.filter(Boolean).length;
  const accuracyRate = scoreList.length > 0 ? Math.round((correctCount / scoreList.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#f8eae4] text-[#a85850]">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#6b4038] font-serif">문장 속 핵심 한자 10개 훈독(訓読み) 읽기 테스트</h3>
              <p className="text-xs text-[#8a5c52]">
                문장 속 핵심 한자 중 10개를 선별하여 훈독 읽기를 테스트합니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && quizList.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fffbf0] border border-[#e6d9b9] text-slate-700">
                {currentIndex + 1} / {quizList.length}
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
        {!isCompleted && quizList.length > 0 && (
          <div className="w-full bg-[#f6eed6] h-1.5 overflow-hidden">
            <div
              className="bg-[#bd6f63] h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + (isAnswered ? 1 : 0)) / quizList.length) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {!isCompleted ? (
            currentItem ? (
              <div className="space-y-6">
                
                {/* Kanji Card Banner */}
                <div className="p-6 rounded-2xl bg-[#f8eae4] border border-[#e9cec4] text-center space-y-3 shadow-2xs">
                  
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f8eae4] text-[#a85850] text-xs font-bold">
                      {currentItem.readingType || '훈독 (訓読み)'}
                    </span>
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs text-[#a85850] hover:underline flex items-center gap-1 font-bold"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showHint ? '힌트 닫기' : '힌트'}</span>
                    </button>
                  </div>

                  <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-wider py-2 font-serif">
                    {currentItem.kanji}
                  </h2>

                  <div className="text-xs text-slate-600 font-medium">
                    <span className="text-slate-400">뜻:</span> {currentItem.meaning}
                  </div>

                  {originSentence && (
                    <div className="pt-2 border-t border-[#f8eae4] text-xs text-slate-500">
                      <span className="font-bold text-slate-700">예문:</span> {originSentence.targetText}
                      <span className="block text-[11px] text-slate-400 mt-0.5">({originSentence.korean})</span>
                    </div>
                  )}

                  {showHint && (
                    <div className="pt-2 text-xs text-[#6b4038] bg-white p-2.5 rounded-xl border border-[#e9cec4]">
                      💡 글자 수: {currentItem.reading.length}글자 | 첫 글자: "{currentItem.reading[0]}"
                    </div>
                  )}
                </div>

                {/* Input Form */}
                {!isAnswered ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <label className="text-xs font-semibold text-slate-600">
                          히라가나 훈독 입력:
                        </label>
                        <button
                          type="button"
                          onClick={() => (isListening ? stopListening() : startListening())}
                          className={`text-xs flex items-center gap-1 font-medium px-2 py-0.5 rounded-lg transition ${
                            isListening
                              ? 'bg-[#bd6f63] text-white animate-pulse'
                              : 'text-[#a85850] hover:bg-[#fcf3ef]'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isListening ? '듣는 중...' : '음성으로 말하기'}</span>
                        </button>
                      </div>

                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="예: てつだう (히라가나로 입력)"
                        autoFocus
                        className="w-full px-4 py-3 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-base focus:border-[#bd6f63] focus:bg-white focus:outline-none tracking-wider font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!userInput.trim()}
                      className="w-full py-3 rounded-2xl bg-[#a85850] hover:bg-[#bd6f63] text-white text-xs font-bold shadow-sm transition disabled:opacity-40"
                    >
                      정답 확인하기
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    
                    <div
                      className={`p-4 rounded-2xl border flex items-center justify-between ${
                        isCorrect
                          ? 'bg-[#eef7ee] border-emerald-200 text-emerald-900'
                          : 'bg-[#fcf3ef] border-[#e9cec4] text-[#4a2a22]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCorrect ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        ) : (
                          <XCircle className="w-8 h-8 text-[#a85850]" />
                        )}
                        <div>
                          <div className="text-base font-bold">
                            {isCorrect ? '정답입니다!' : '오답입니다. 다시 기억해두세요'}
                          </div>
                          <div className="text-xs mt-0.5">
                            정답 읽기: <strong className="text-base underline">{currentItem.reading}</strong>
                            <span className="ml-2 font-medium">({currentItem.readingType})</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => sounds.speak(currentItem.kanji, 'ja', 0.9)}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#d9b3a8] text-slate-700 hover:text-[#a85850] text-xs flex items-center gap-1.5 transition shadow-sm"
                        title="원어민 발음 듣기"
                      >
                        <Volume2 className="w-4 h-4 text-[#bd6f63]" />
                        <span>발음</span>
                      </button>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleNext}
                        className="px-6 py-2.5 rounded-2xl bg-[#a85850] hover:bg-[#bd6f63] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
                      >
                        <span>{currentIndex + 1 < quizList.length ? '다음 한자' : '결과 확인'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">등록된 일본어 한자가 없습니다.</div>
            )
          ) : (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="inline-flex p-4 rounded-3xl bg-[#f8eae4] text-[#a85850]">
                <Trophy className="w-12 h-12 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">오늘의 한자 훈독 퀴즈 완료!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  총 {quizList.length}개 한자 중 {correctCount}개를 맞추셨습니다 (정답률 {accuracyRate}%).
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={initQuiz}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>다시 풀기</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-[#a85850] hover:bg-[#bd6f63] text-white text-xs font-bold shadow-sm transition"
                >
                  테스트 완료
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
