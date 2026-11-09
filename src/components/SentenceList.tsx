import React, { useState } from 'react';
import {
  Search,
  Volume2,
  Mic,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Tag,
  BookOpen,
  Eraser,
} from 'lucide-react';
import { Sentence, LanguageType } from '../types';
import { sounds } from '../services/sound';

interface SentenceListProps {
  sentences: Sentence[];
  language: LanguageType;
  onTestSentence: (sentence: Sentence) => void;
  onDeleteSentence: (id: string) => void;
  onDeleteAll: () => void;
  onOpenRegister: () => void;
}

export const SentenceList: React.FC<SentenceListProps> = ({
  sentences,
  language,
  onTestSentence,
  onDeleteSentence,
  onDeleteAll,
  onOpenRegister,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'needs_review' | 'mastered'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const isJapanese = language === 'ja';

  // Filter strictly by the current language
  const langSentences = sentences.filter((s) => s.language === language);
  const categories = Array.from(new Set(langSentences.map((s) => s.category).filter(Boolean)));

  const handlePlayTTS = async (id: string, text: string) => {
    setPlayingId(id);
    await sounds.speak(text, language, 0.95);
    setPlayingId(null);
  };

  const filteredSentences = langSentences.filter((s) => {
    const targetText = s.targetText || s.english || s.japanese || '';
    const reading = s.reading || '';
    const kanjiStr = s.kanjiList ? s.kanjiList.map((k) => `${k.kanji} ${k.reading}`).join(' ') : '';

    const matchesSearch =
      targetText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kanjiStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.korean.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.keyPattern && s.keyPattern.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;

    if (!matchesSearch || !matchesCategory) return false;

    if (activeTab === 'needs_review') {
      return s.lastScore < 75 || (s.weaknessCategory && s.weaknessCategory !== '정확함');
    }
    if (activeTab === 'mastered') {
      return s.lastScore >= 85 && s.reviewCount >= 2;
    }

    return true;
  });

  return (
    <div className="bg-[#fffdf7] rounded-3xl border border-[#efe4c9] p-6 shadow-[0_2px_8px_rgba(40,30,10,0.03)] space-y-5">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#f6eed6]">
        <h3 className={`text-base font-bold tracking-tight flex items-center gap-2 font-serif ${
          isJapanese ? 'text-[#6b4038]' : 'text-[#33517a]'
        }`}>
          <span>{isJapanese ? '일본어' : '영어'} 문장 보관함</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
            isJapanese
              ? 'bg-[#f8eae4] text-[#a85850] border-[#e9cec4]'
              : 'bg-[#f1f5fb] text-[#3f6090] border-[#c9d7ea]'
          }`}>
            {filteredSentences.length}개
          </span>
        </h3>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#f6eed6] border border-[#e6d9b9] text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'all'
                ? isJapanese
                  ? 'bg-[#bd6f63] text-white shadow-xs font-bold'
                  : 'bg-[#5b7fb0] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 ({langSentences.length})
          </button>
          <button
            onClick={() => setActiveTab('needs_review')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'needs_review'
                ? 'bg-[#ca8a04] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>복습 필요</span>
          </button>
          <button
            onClick={() => setActiveTab('mastered')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'mastered'
                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>숙달 완료</span>
          </button>
        </div>

        {langSentences.length > 0 && (
          <button
            onClick={() => {
              if (confirm(`${isJapanese ? '일본어' : '영어'} 문장 ${langSentences.length}개를 전부 삭제하시겠습니까? 예시 문장을 포함해 되돌릴 수 없습니다.`)) {
                onDeleteAll();
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-[#a85850] hover:bg-[#f8eae4] transition cursor-pointer self-start sm:self-auto"
            title={`${isJapanese ? '일본어' : '영어'} 문장 전체 삭제`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>전체 삭제</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`원문, ${isJapanese ? '히라가나, 한자, ' : ''}한국어 뜻 검색...`}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white transition ${
              isJapanese
                ? 'bg-[#fcf3ef] border-[#e9cec4] focus:border-[#bd6f63]'
                : 'bg-[#f1f5fb] border-[#d7e2f0] focus:border-[#5b7fb0]'
            }`}
          />
        </div>

        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`w-full sm:w-auto px-3.5 py-2.5 rounded-2xl border text-slate-700 text-xs focus:outline-none ${
              isJapanese
                ? 'bg-[#fcf3ef] border-[#e9cec4] focus:border-[#bd6f63]'
                : 'bg-[#f1f5fb] border-[#d7e2f0] focus:border-[#5b7fb0]'
            }`}
          >
            <option value="all">모든 카테고리</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sentence Cards Grid */}
      {filteredSentences.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSentences.map((sentence) => {
            const hasReviewed = (sentence.reviewCount || 0) > 0;
            const targetText = sentence.targetText || sentence.english || sentence.japanese || '';

            return (
              <div
                key={sentence.id}
                className={`p-5 rounded-2xl bg-[#fbf4e0] border border-[#efe4c9] hover:bg-[#fffbf0] transition flex flex-col justify-between space-y-3 group shadow-2xs ${
                  isJapanese ? 'hover:border-[#bd6f63]' : 'hover:border-[#5b7fb0]'
                }`}
              >
                {/* Top badges */}
                <div className="flex items-center justify-between text-[11px] gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#e6d9b9] text-slate-600 font-medium">
                    {sentence.category || '일상'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {sentence.weightMultiplier && sentence.weightMultiplier >= 1.6 && (
                      <span className="px-2 py-0.5 rounded bg-[#fef9c3] text-[#854d0e] border border-[#fde047] text-[10px] font-bold">
                        출제빈도 {sentence.weightMultiplier}x
                      </span>
                    )}

                    {hasReviewed ? (
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                          sentence.lastScore >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : sentence.lastScore >= 70
                            ? 'bg-[#fef9c3] text-[#854d0e] border border-[#fde047]'
                            : 'bg-[#f8eae4] text-[#a85850]'
                        }`}
                      >
                        {sentence.lastScore}점
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-[#e6d9b9] text-slate-400 font-medium">
                        미응시
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Text */}
                <div className="space-y-1">
                  <h4 className={`text-base font-bold text-[#2d4566] tracking-wide leading-snug transition-colors ${
                    isJapanese ? 'group-hover:text-[#bd6f63]' : 'group-hover:text-[#5b7fb0]'
                  }`}>
                    {targetText}
                  </h4>

                  {isJapanese && sentence.reading && (
                    <p className="text-xs text-[#a85850] font-mono">
                      {sentence.reading}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {sentence.korean}
                  </p>

                  {sentence.keyPattern && (
                    <div className={`text-[11px] pt-0.5 font-medium ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`}>
                      💡 {sentence.keyPattern}
                    </div>
                  )}

                  {/* Japanese Kanji tags if Japanese */}
                  {isJapanese && sentence.kanjiList && sentence.kanjiList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {sentence.kanjiList.map((k, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-white border border-[#e9cec4] text-[11px] text-slate-700 flex items-center gap-1"
                        >
                          <BookOpen className="w-2.5 h-2.5 text-[#a85850]" />
                          <strong className="text-[#8a5047]">{k.kanji}</strong>
                          <span className="text-[#a85850]">({k.reading})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#ecdfb9] text-xs">
                  <div className="flex items-center gap-2">
                    {/* TTS Audio */}
                    <button
                      onClick={() => handlePlayTTS(sentence.id, targetText)}
                      disabled={playingId === sentence.id}
                      className={`p-1.5 rounded-xl bg-white border border-[#e6d9b9] text-slate-600 transition flex items-center gap-1 shadow-2xs cursor-pointer ${
                        isJapanese
                          ? 'hover:text-[#bd6f63] hover:border-[#e9cec4]'
                          : 'hover:text-[#5b7fb0] hover:border-[#c9d7ea]'
                      }`}
                      title="원어민 발음 듣기"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${
                        playingId === sentence.id
                          ? `animate-bounce ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`
                          : ''
                      }`} />
                      <span className="text-[11px] font-medium hidden sm:inline">발음</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`'${targetText}' 문장을 삭제하시겠습니까?`)) {
                          onDeleteSentence(sentence.id);
                        }
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-[#a85850] hover:bg-white transition cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Test Now Button */}
                  <button
                    onClick={() => onTestSentence(sentence)}
                    className={`px-3.5 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                      isJapanese
                        ? 'bg-[#bd6f63] hover:bg-[#a85850]'
                        : 'bg-[#5b7fb0] hover:bg-[#4a6a96]'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>말하기 테스트</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 p-6 rounded-2xl bg-[#fbf4e0] border border-[#efe4c9] text-slate-500 space-y-3">
          <p className="text-xs">등록된 문장이 없습니다. 상단에서 원어를 작성해 보세요!</p>
          <button
            onClick={onOpenRegister}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition cursor-pointer ${
              isJapanese
                ? 'bg-[#bd6f63] hover:bg-[#a85850]'
                : 'bg-[#5b7fb0] hover:bg-[#4a6a96]'
            }`}
          >
            새 문장 등록
          </button>
        </div>
      )}

    </div>
  );
};
