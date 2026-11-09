import React from 'react';
import { BookOpen, Volume2, ArrowRight } from 'lucide-react';
import { KanjiItem } from '../types';
import { sounds } from '../services/sound';

interface TodayKanjiSectionProps {
  kanjiList: KanjiItem[];
  onStartKanjiQuiz: () => void;
}

export const TodayKanjiSection: React.FC<TodayKanjiSectionProps> = ({
  kanjiList,
  onStartKanjiQuiz,
}) => {
  if (kanjiList.length === 0) return null;

  const handlePlayAudio = (e: React.MouseEvent, kanji: string) => {
    e.stopPropagation();
    sounds.speak(kanji, 'ja', 0.9);
  };

  return (
    <section className="bg-[#fffdf7] rounded-3xl border border-[#efe4c9] p-6 shadow-[0_2px_8px_rgba(40,30,10,0.03)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#f6eed6]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#f8eae4] text-[#a85850]">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-[#6b4038] tracking-tight font-serif flex items-center gap-2">
            <span>문장 속 핵심 한자</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f8eae4] text-[#a85850] font-bold border border-[#e9cec4]">
              10개
            </span>
          </h3>
        </div>

        <button
          onClick={onStartKanjiQuiz}
          className="px-4 py-2 rounded-2xl bg-[#bd6f63] hover:bg-[#a85850] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>시작</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Kanji Cards Grid (Strictly 10 daily cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
        {kanjiList.slice(0, 10).map((k) => (
          <div
            key={k.id}
            className="p-3.5 rounded-2xl bg-[#fbf4e0] border border-[#ecdfb9] hover:border-[#bd6f63] hover:bg-[#f8eae4] transition flex flex-col justify-between space-y-2 group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f8eae4] text-[#a05349]">
                {k.readingType?.includes('훈독') ? '훈독' : '음독'}
              </span>
              <button
                onClick={(e) => handlePlayAudio(e, k.kanji)}
                className="text-slate-400 hover:text-[#a85850] transition cursor-pointer"
                title="발음 듣기"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-center py-1">
              <div className="text-2xl font-black text-slate-800 font-serif group-hover:text-[#a85850] transition">
                {k.kanji}
              </div>
              <div className="text-xs font-bold text-[#a85850] mt-1 font-mono">
                {k.reading}
              </div>
            </div>

            <div className="text-[11px] text-slate-600 text-center line-clamp-1 border-t border-[#ecdfb9] pt-1 font-medium">
              {k.meaning}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
