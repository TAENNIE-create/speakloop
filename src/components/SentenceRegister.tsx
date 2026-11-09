import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Save,
  BookOpen,
  ClipboardPaste,
} from 'lucide-react';
import { Sentence, LanguageType } from '../types';
import { parseImportData } from '../services/storage';

interface SentenceRegisterProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSentence: (sentence: Sentence, immediateTest: boolean) => void;
  onBulkSave: (sentences: Sentence[]) => void;
  defaultLanguage?: LanguageType;
}

export const SentenceRegister: React.FC<SentenceRegisterProps> = ({
  isOpen,
  onClose,
  onSaveSentence,
  onBulkSave,
  defaultLanguage = 'en',
}) => {
  const [language, setLanguage] = useState<LanguageType>(defaultLanguage);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [targetText, setTargetText] = useState('');
  const [reading, setReading] = useState('');
  const [korean, setKorean] = useState('');
  const [category, setCategory] = useState('일상 회화');
  const [keyPattern, setKeyPattern] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isJapanese = language === 'ja';

  const handleAiAutoFill = async () => {
    const input = targetText.trim() || korean.trim();
    if (!input) {
      setErrorMessage(`${isJapanese ? '일본어' : '영어'} 문장 또는 한국어 뜻을 먼저 입력해주세요.`);
      return;
    }

    setIsAiParsing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/parse-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, language }),
      });

      if (!res.ok) throw new Error('AI 분석 실패');
      const data = await res.json();
      if (data.targetText) setTargetText(data.targetText);
      if (data.reading) setReading(data.reading);
      if (data.korean) setKorean(data.korean);
      if (data.category) setCategory(data.category);
      if (data.keyPattern) setKeyPattern(data.keyPattern);
    } catch (e: any) {
      setErrorMessage('AI 자동 정리에 일시적인 오류가 발생했습니다. 직접 입력해 주세요.');
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleSave = async (immediateTest: boolean) => {
    if (!targetText.trim() || !korean.trim()) {
      setErrorMessage(`${isJapanese ? '일본어' : '영어'} 문장과 한국어 뜻을 모두 입력해주세요.`);
      return;
    }

    let kanjiList = undefined;
    if (isJapanese) {
      try {
        const kanjiRes = await fetch('/api/extract-kanji', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ japaneseSentence: targetText }),
        });
        if (kanjiRes.ok) {
          const kanjiData = await kanjiRes.json();
          if (kanjiData.kanjiList && kanjiData.kanjiList.length > 0) {
            kanjiList = kanjiData.kanjiList.map((k: any, i: number) => ({
              id: `k-${Date.now()}-${i}`,
              kanji: k.kanji,
              reading: k.reading,
              readingType: k.readingType || '훈독 (訓読み)',
              meaning: k.meaning,
              testedCount: 0,
              correctCount: 0,
            }));
          }
        }
      } catch (e) {
        console.warn('Kanji auto extract failed', e);
      }
    }

    const newSentence: Sentence = {
      id: `s-${language}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      language,
      targetText: targetText.trim(),
      english: language === 'en' ? targetText.trim() : undefined,
      japanese: language === 'ja' ? targetText.trim() : undefined,
      reading: isJapanese ? (reading.trim() || undefined) : undefined,
      korean: korean.trim(),
      category: category.trim() || '일상 회화',
      keyPattern: keyPattern.trim() || undefined,
      kanjiList,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
      lastScore: 0,
      lastReviewedAt: null,
      weaknessCategory: null,
      weightMultiplier: 1.5,
    };

    onSaveSentence(newSentence, immediateTest);

    setTargetText('');
    setReading('');
    setKorean('');
    setKeyPattern('');
    setErrorMessage(null);

    if (!immediateTest) {
      onClose();
    }
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim()) {
      setErrorMessage('여러 줄의 문장을 입력해주세요.');
      return;
    }

    const parsed = parseImportData(bulkText, language);
    if (parsed.length === 0) {
      setErrorMessage('문장을 인식하지 못했습니다. 한 줄에 한 문장씩 입력해 주세요.');
      return;
    }

    const newSentences: Sentence[] = parsed.map((item, idx) => ({
      id: `s-${item.language}-${Date.now()}-${idx}`,
      language: item.language,
      targetText: item.targetText,
      english: item.language === 'en' ? item.targetText : undefined,
      japanese: item.language === 'ja' ? item.targetText : undefined,
      reading: item.reading,
      korean: item.korean,
      category: item.category || '일상 회화',
      keyPattern: item.pattern || undefined,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
      lastScore: 0,
      lastReviewedAt: null,
      weaknessCategory: null,
      weightMultiplier: 1.5,
    }));

    onBulkSave(newSentences);
    setBulkText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#5b7fb0]" />
            <h3 className="text-base font-bold text-[#33517a] font-serif">회화 문장 등록</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#f6eed6] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language & Tab selector */}
        <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f6eed6] pb-3 bg-[#fffbf0]">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#f6eed6] border border-[#e6d9b9] text-xs font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                language === 'en'
                  ? 'bg-[#5b7fb0] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇺🇸 영어 (English)
            </button>
            <button
              onClick={() => setLanguage('ja')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                language === 'ja'
                  ? 'bg-[#bd6f63] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇯🇵 일본어 (日本語)
            </button>
          </div>

          <div className="flex gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-xl transition ${
                mode === 'single'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              개별 등록
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                mode === 'bulk'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>대량 붙여넣기</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#fcf3ef] border border-[#e9cec4] text-[#8a5047] text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {mode === 'single' ? (
            <div className="space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isJapanese ? '일본어 문장' : '영어 문장'} <span className="text-[#bd6f63]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiAutoFill}
                    disabled={isAiParsing}
                    className="text-xs text-[#6c8fc7] hover:underline flex items-center gap-1 transition disabled:opacity-50 font-bold"
                  >
                    <Sparkles className="w-3 h-3 text-[#6c8fc7]" />
                    <span>{isAiParsing ? 'AI 분석 중...' : 'AI 자동 완성'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  placeholder={isJapanese ? '예: 急いで準備しないと。' : '예: I am running late.'}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-sm focus:border-[#6c8fc7] focus:bg-white focus:outline-none"
                />
              </div>

              {isJapanese && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    히라가나 읽기 (후리가나)
                  </label>
                  <input
                    type="text"
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                    placeholder="예: いそいでじゅんびしないと。"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-xs font-mono focus:border-[#bd6f63] focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  한국어 뜻 <span className="text-[#bd6f63]">*</span>
                </label>
                <input
                  type="text"
                  value={korean}
                  onChange={(e) => setKorean(e.target.value)}
                  placeholder="예: 서둘러 준비하지 않으면 늦어."
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-sm focus:border-[#6c8fc7] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    카테고리
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-700 text-xs focus:border-[#6c8fc7] focus:outline-none"
                  >
                    <option value="일상 회화">일상 회화</option>
                    <option value="비즈니스">비즈니스</option>
                    <option value="여행/식당">여행/식당</option>
                    <option value="감정/의견">감정/의견</option>
                    <option value="숙어/구문">숙어/구문 패턴</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    핵심 패턴
                  </label>
                  <input
                    type="text"
                    value={keyPattern}
                    onChange={(e) => setKeyPattern(e.target.value)}
                    placeholder="예: ~ないと"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-xs focus:border-[#6c8fc7] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                >
                  단순 저장
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className={`px-5 py-2.5 rounded-2xl text-white text-xs font-bold shadow-sm flex items-center gap-2 transition ${
                    isJapanese
                      ? 'bg-[#a85850] hover:bg-[#bd6f63]'
                      : 'bg-[#6c8fc7] hover:bg-[#5a7cb3]'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>저장하고 바로 테스트</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="한 줄에 한 문장씩 붙여넣기하세요..."
                className="w-full h-44 p-3.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-xs font-mono focus:border-[#6c8fc7] focus:outline-none resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  className="px-5 py-2.5 rounded-2xl bg-[#6c8fc7] hover:bg-[#5a7cb3] text-white text-xs font-bold shadow-sm"
                >
                  대량 등록
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
