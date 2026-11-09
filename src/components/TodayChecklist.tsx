import React from 'react';
import { CheckCircle2, Circle, Sun, Moon, Sparkles, BookOpen, ChevronRight, Play } from 'lucide-react';
import { UserStreak } from '../services/storage';
import { LanguageType } from '../types';

interface TodayChecklistProps {
  language: LanguageType;
  streak: UserStreak;
  totalSentences: number;
  totalKanji: number;
  onStartMorningQuiz: () => void;
  onStartEveningQuiz: () => void;
  onStartWeaknessQuiz: () => void;
  onStartKanjiQuiz?: () => void;
}

export const TodayChecklist: React.FC<TodayChecklistProps> = ({
  language,
  streak,
  totalSentences,
  totalKanji,
  onStartMorningQuiz,
  onStartEveningQuiz,
  onStartWeaknessQuiz,
  onStartKanjiQuiz,
}) => {
  const isJapanese = language === 'ja';

  const morningDone = isJapanese ? streak.morningJaCompleted : streak.morningEnCompleted;
  const eveningDone = isJapanese ? streak.eveningJaCompleted : streak.eveningEnCompleted;
  const kanjiDone = isJapanese && streak.morningJaCompleted && streak.eveningJaCompleted;

  const totalTasks = isJapanese ? 3 : 2;
  const completedCount = (morningDone ? 1 : 0) + (eveningDone ? 1 : 0) + (isJapanese && kanjiDone ? 1 : 0);

  return (
    <div className="bg-[#fffdf7] rounded-3xl border border-[#efe4c9] p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.03)] space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#f6eed6]">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isJapanese ? 'bg-[#bd6f63]' : 'bg-[#5b7fb0]'}`} />
          <h2 className={`text-base font-bold tracking-tight font-serif ${isJapanese ? 'text-[#6b4038]' : 'text-[#33517a]'}`}>
            오늘의 {isJapanese ? '일본어' : '영어'} 학습
          </h2>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fef9c3] text-[#854d0e] border border-[#fde047]">
          {completedCount} / {totalTasks} 완료
        </span>
      </div>

      {/* Checklist Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        
        {/* 1. Morning 10-Question Review */}
        <button
          onClick={onStartMorningQuiz}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
            morningDone
              ? 'bg-[#eef7ee] border-[#c3ddc4] text-[#2f5c3a]'
              : isJapanese
              ? 'bg-[#fcf3ef] hover:bg-[#f8eae4] border-[#e9cec4] hover:border-[#bd6f63] text-[#6b4038] shadow-2xs'
              : 'bg-[#f1f5fb] hover:bg-[#f1f5fb] border-[#d7e2f0] hover:border-[#5b7fb0] text-[#33517a] shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                morningDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-[#fef9c3] text-[#ca8a04]'
              }`}
            >
              {morningDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Sun className="w-5 h-5 text-[#ca8a04]" />
              )}
            </div>
            <span className="text-sm font-bold">아침 10문장</span>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
              morningDone
                ? 'bg-emerald-200/70 text-emerald-800'
                : isJapanese
                ? 'bg-white border border-[#e9cec4] text-[#bd6f63] group-hover:bg-[#bd6f63] group-hover:text-white transition'
                : 'bg-white border border-[#c9d7ea] text-[#5b7fb0] group-hover:bg-[#5b7fb0] group-hover:text-white transition'
            }`}
          >
            {morningDone ? '✓ 완료' : '시작'}
          </span>
        </button>

        {/* 2. Evening 10-Question Review */}
        <button
          onClick={onStartEveningQuiz}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
            eveningDone
              ? 'bg-[#eef7ee] border-[#c3ddc4] text-[#2f5c3a]'
              : isJapanese
              ? 'bg-[#fcf3ef] hover:bg-[#f8eae4] border-[#e9cec4] hover:border-[#bd6f63] text-[#6b4038] shadow-2xs'
              : 'bg-[#f1f5fb] hover:bg-[#f1f5fb] border-[#d7e2f0] hover:border-[#5b7fb0] text-[#33517a] shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                eveningDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : isJapanese
                  ? 'bg-[#f8eae4] text-[#bd6f63]'
                  : 'bg-[#e6edf7] text-[#5b7fb0]'
              }`}
            >
              {eveningDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Moon className={`w-5 h-5 ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`} />
              )}
            </div>
            <span className="text-sm font-bold">저녁 10문장</span>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
              eveningDone
                ? 'bg-emerald-200/70 text-emerald-800'
                : isJapanese
                ? 'bg-white border border-[#e9cec4] text-[#bd6f63] group-hover:bg-[#bd6f63] group-hover:text-white transition'
                : 'bg-white border border-[#c9d7ea] text-[#5b7fb0] group-hover:bg-[#5b7fb0] group-hover:text-white transition'
            }`}
          >
            {eveningDone ? '✓ 완료' : '시작'}
          </span>
        </button>

        {/* 3. Japanese: Core Kanji 10-Item Kun'yomi Quiz OR English: Weakness Drill */}
        {isJapanese ? (
          <button
            onClick={onStartKanjiQuiz}
            className="p-3.5 sm:p-4 rounded-2xl border border-[#e9cec4] bg-[#f8eae4] hover:bg-[#f8eae4] text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f8eae4] text-[#a85850] flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-[#a85850]" />
              </div>
              <span className="text-sm font-bold text-[#623830]">한자 10개 훈독</span>
            </div>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#e9cec4] text-[#bd6f63] group-hover:bg-[#bd6f63] group-hover:text-white transition">
              시작
            </span>
          </button>
        ) : (
          <button
            onClick={onStartWeaknessQuiz}
            className="p-3.5 sm:p-4 rounded-2xl border border-[#d7e2f0] bg-[#f1f5fb] hover:bg-[#f1f5fb] text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e6edf7] text-[#5b7fb0] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#5b7fb0]" />
              </div>
              <span className="text-sm font-bold text-[#33517a]">약점 10문장</span>
            </div>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#c9d7ea] text-[#5b7fb0] group-hover:bg-[#5b7fb0] group-hover:text-white transition">
              시작
            </span>
          </button>
        )}

      </div>
    </div>
  );
};
