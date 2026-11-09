import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Sentence, LanguageType } from '../types';

interface QuickSentenceInputProps {
  language: LanguageType;
  onSentenceAdded: (sentence: Sentence) => void;
}

export const QuickSentenceInput: React.FC<QuickSentenceInputProps> = ({
  language,
  onSentenceAdded,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isJapanese = language === 'ja';

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setSuccessToast(null);

    try {
      const res = await fetch('/api/parse-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, language }),
      });

      if (!res.ok) throw new Error('자동 번역 실패');
      const data = await res.json();

      let kanjiList = data.kanjiList;
      if (isJapanese && (!kanjiList || kanjiList.length === 0)) {
        try {
          const kRes = await fetch('/api/extract-kanji', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ japaneseSentence: data.targetText || trimmed }),
          });
          if (kRes.ok) {
            const kData = await kRes.json();
            kanjiList = kData.kanjiList;
          }
        } catch (err) {
          // Ignore
        }
      }

      const newSentence: Sentence = {
        id: `s-${language}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        language,
        targetText: data.targetText || trimmed,
        english: language === 'en' ? (data.targetText || trimmed) : undefined,
        japanese: language === 'ja' ? (data.targetText || trimmed) : undefined,
        reading: isJapanese ? data.reading : undefined,
        korean: data.korean || '자동 번역 완료',
        category: data.category || '일상 회화',
        keyPattern: data.keyPattern || undefined,
        kanjiList: kanjiList && kanjiList.length > 0 ? kanjiList.map((k: any, i: number) => ({
          id: `k-${Date.now()}-${i}`,
          kanji: k.kanji,
          reading: k.reading,
          readingType: k.readingType || '훈독 (訓読み)',
          meaning: k.meaning,
          testedCount: 0,
          correctCount: 0,
        })) : undefined,
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        correctCount: 0,
        lastScore: 0,
        lastReviewedAt: null,
        weaknessCategory: null,
        weightMultiplier: 1.5,
      };

      onSentenceAdded(newSentence);
      setInput('');
      setSuccessToast(`"${newSentence.targetText}" 문장이 한국어 뜻과 함께 보관함에 저장되었습니다!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (e) {
      console.error(e);
      alert('자동 번역 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#fffdf7] rounded-3xl border border-[#efe4c9] p-4 sm:p-5 shadow-[0_2px_8px_rgba(40,30,10,0.03)] space-y-2.5">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-bold ${isJapanese ? 'text-[#6b4038]' : 'text-[#33517a]'}`}>
          <Sparkles className={`w-4 h-4 ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`} />
          <span>문장 자동 번역 & 저장</span>
        </div>
      </div>

      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isJapanese
              ? '일본어 문장 입력 (예: 明日早く起きなきゃ。)'
              : '영어 문장 입력 (예: I am running out of time.)'
          }
          disabled={isLoading}
          className={`flex-1 px-4 py-3 rounded-2xl border text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white transition ${
            isJapanese
              ? 'bg-[#fcf3ef] border-[#e9cec4] focus:border-[#bd6f63]'
              : 'bg-[#f1f5fb] border-[#d7e2f0] focus:border-[#5b7fb0]'
          }`}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`px-5 py-3 rounded-2xl text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition disabled:opacity-40 shrink-0 cursor-pointer ${
            isJapanese
              ? 'bg-[#bd6f63] hover:bg-[#a85850]'
              : 'bg-[#5b7fb0] hover:bg-[#4a6a96]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>저장 중...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>저장</span>
            </>
          )}
        </button>
      </form>

      {successToast && (
        <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
          isJapanese
            ? 'bg-[#f8eae4] border-[#e9cec4] text-[#8a5047]'
            : 'bg-[#eef3fa] border-[#c9d7ea] text-[#355480]'
        }`}>
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`} />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}
    </div>
  );
};
