import React, { useState } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Plus,
  Copy,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Sentence, ReviewLog, AIDiagnosticReport, LanguageType } from '../types';
import { saveReports } from '../services/storage';

interface TenDayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentences: Sentence[];
  reviewLogs: ReviewLog[];
  reports: AIDiagnosticReport[];
  onAddSentence: (sentence: Sentence) => void;
  onUpdateReports: (reports: AIDiagnosticReport[]) => void;
  defaultLanguage?: LanguageType | 'all';
}

export const TenDayReportModal: React.FC<TenDayReportModalProps> = ({
  isOpen,
  onClose,
  sentences,
  reviewLogs,
  reports,
  onAddSentence,
  onUpdateReports,
  defaultLanguage = 'all',
}) => {
  const [reportLang, setReportLang] = useState<LanguageType | 'all'>(defaultLanguage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (!isOpen) return null;

  const filteredReports = reports.filter((r) =>
    reportLang === 'all' ? true : r.language === reportLang || r.language === 'all'
  );
  const currentReport = filteredReports.length > 0 ? filteredReports[0] : (reports[0] || null);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentences: reportLang === 'all' ? sentences : sentences.filter((s) => s.language === reportLang),
          reviewLogs: reportLang === 'all' ? reviewLogs : reviewLogs.filter((l) => l.language === reportLang),
          daysCount: 10,
          language: reportLang,
        }),
      });

      if (!res.ok) throw new Error('리포트 생성 실패');
      const data = await res.json();

      const newReport: AIDiagnosticReport = {
        id: `report-${Date.now()}`,
        language: reportLang,
        generatedAt: new Date().toISOString(),
        period: data.period || '최근 10일간의 누적 학습',
        reportTitle: data.reportTitle || `${reportLang === 'ja' ? '일본어 & 한자' : reportLang === 'en' ? '영어' : '영어·일본어'} 10일 AI 정밀 진단 리포트`,
        overallScore: data.overallScore ?? 78,
        masteryRate: data.masteryRate ?? 65,
        totalReviews: data.totalReviews ?? reviewLogs.length,
        kanjiMasteryRate: data.kanjiMasteryRate ?? 72,
        summaryDiagnosis: data.summaryDiagnosis || '',
        coreStrengths: data.coreStrengths || [],
        topWeaknesses: data.topWeaknesses || [],
        spacedRepetitionAdjustments: data.spacedRepetitionAdjustments || [],
        actionPlan: data.actionPlan || [],
        suggestedNewSentences: data.suggestedNewSentences || [],
        coachEncouragement: data.coachEncouragement || '',
      };

      const updated = [newReport, ...reports];
      onUpdateReports(updated);
      saveReports(updated);
    } catch (e) {
      console.error(e);
      alert('리포트 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReport = () => {
    if (!currentReport) return;
    const text = `[${currentReport.reportTitle}]
기간: ${currentReport.period} (${new Date(currentReport.generatedAt).toLocaleDateString()})
평균 발화 점수: ${currentReport.overallScore}점 | 숙달률: ${currentReport.masteryRate}% | 총 복습 횟수: ${currentReport.totalReviews}회${currentReport.kanjiMasteryRate ? ` | 한자 훈독 숙달률: ${currentReport.kanjiMasteryRate}%` : ''}

[AI 종합 진단]
${currentReport.summaryDiagnosis}

[주요 강점]
${currentReport.coreStrengths.map((s) => `• ${s}`).join('\n')}

[집중 보완 취약점]
${currentReport.topWeaknesses.map((w) => `• ${w.category} (${w.frequency}회): ${w.explanation}\n  - 실수 예시: ${w.sampleMistake}\n  - 교정 규칙: ${w.correctiveRule}`).join('\n\n')}

[AI 복습 빈도 가중 조절 현황]
${currentReport.spacedRepetitionAdjustments.map((a) => `• ${a.category}: ${a.weightMultiplier}배 (${a.reason})`).join('\n')}

[향후 10일 실천 플랜]
${currentReport.actionPlan.map((p, i) => `${i + 1}. ${p}`).join('\n')}

응원 한마디: ${currentReport.coachEncouragement}
`;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleAddSuggestedSentence = (suggested: any) => {
    const lang = (suggested.language as LanguageType) || (reportLang === 'ja' ? 'ja' : 'en');
    const newS: Sentence = {
      id: `s-${lang}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      language: lang,
      targetText: suggested.targetText || suggested.english || suggested.japanese || '',
      english: lang === 'en' ? (suggested.targetText || suggested.english) : undefined,
      japanese: lang === 'ja' ? (suggested.targetText || suggested.japanese) : undefined,
      reading: suggested.reading,
      korean: suggested.korean,
      category: 'AI 추천 약점 보완',
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
      lastScore: 0,
      lastReviewedAt: null,
      weaknessCategory: null,
      weightMultiplier: 2.0,
    };
    onAddSentence(newS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#f1f5fb] text-[#5b7fb0]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#33517a] font-serif">10일 주기 AI 약점 분석 리포트</h3>
              <p className="text-xs text-slate-500">
                오답 패턴 및 한자 훈독 숙달률 분석 & 출제 가중치 조절
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentReport && (
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded-xl bg-[#f6eed6] hover:bg-[#e6d9b9] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="리포트 텍스트 복사"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copyFeedback ? '복사됨!' : '복사'}</span>
              </button>
            )}

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="px-3.5 py-1.5 rounded-xl bg-[#5b7fb0] hover:bg-[#4a6a96] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'AI 진단 생성 중...' : '새 리포트 생성'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#f6eed6] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Filter */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-2 border-b border-[#f6eed6] bg-[#fffbf0]">
          <span className="text-xs font-bold text-[#33517a]">분석 대상:</span>
          <div className="flex gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setReportLang('all')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                reportLang === 'all' ? 'bg-[#33517a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              종합 (영어+일본어)
            </button>
            <button
              onClick={() => setReportLang('en')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                reportLang === 'en' ? 'bg-[#5b7fb0] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇺🇸 영어 전용
            </button>
            <button
              onClick={() => setReportLang('ja')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                reportLang === 'ja' ? 'bg-[#bd6f63] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇯🇵 일본어 & 한자
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {currentReport ? (
            <div className="space-y-6">
              
              {/* Report Header Card */}
              <div className="p-6 rounded-3xl bg-[#faf8f3] border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6c8fc7] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {currentReport.period} ({new Date(currentReport.generatedAt).toLocaleDateString()})
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f1f5fb] text-[#6c8fc7] border border-blue-200 font-bold">
                    10일 주기 AI 종합 진단
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentReport.reportTitle}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {currentReport.summaryDiagnosis}
                </p>

                {/* Score Stats */}
                <div className={`grid gap-3 pt-3 border-t border-slate-200/80 ${currentReport.kanjiMasteryRate ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-slate-400 block">평균 발화 점수</span>
                    <span className="text-xl font-black text-[#6c8fc7]">{currentReport.overallScore}점</span>
                  </div>
                  <div className="text-center border-x border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-400 block">회화 숙달률</span>
                    <span className="text-xl font-black text-emerald-600">{currentReport.masteryRate}%</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-slate-400 block">총 복습 횟수</span>
                    <span className="text-xl font-black text-slate-800">{currentReport.totalReviews}회</span>
                  </div>
                  {currentReport.kanjiMasteryRate && (
                    <div className="text-center border-l border-slate-200/80">
                      <span className="text-[11px] font-semibold text-[#bd6f63] block">한자 훈독 숙달률</span>
                      <span className="text-xl font-black text-[#a85850]">{currentReport.kanjiMasteryRate}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Core Strengths */}
              {currentReport.coreStrengths && currentReport.coreStrengths.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>학습자의 핵심 강점</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    {currentReport.coreStrengths.map((str, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#eef7ee] border border-emerald-100 flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Weaknesses */}
              {currentReport.topWeaknesses && currentReport.topWeaknesses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>집중 분석된 오답 & 취약점 패턴 ({currentReport.topWeaknesses.length}건)</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentReport.topWeaknesses.map((w, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {w.category}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            {w.frequency}회 발생
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {w.explanation}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-xl bg-[#fcf3ef] border border-[#f8eae4] text-[#4a2a22]">
                            <span className="font-bold block mb-0.5 text-[#a85850]">❌ 자주 나오는 실수:</span>
                            <span>{w.sampleMistake}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#eef7ee] border border-emerald-100 text-emerald-900">
                            <span className="font-bold block mb-0.5 text-emerald-600">✅ 교정 규칙:</span>
                            <span>{w.correctiveRule}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spaced Repetition Adjustments */}
              {currentReport.spacedRepetitionAdjustments && (
                <div className="p-4 rounded-2xl bg-[#faf8f3] border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#6c8fc7] uppercase tracking-wider">
                    <Sliders className="w-4 h-4" />
                    <span>AI 복습 빈도 자동 조절 시스템 반영 결과</span>
                  </div>
                  <div className="space-y-1.5">
                    {currentReport.spacedRepetitionAdjustments.map((adj, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{adj.category}</span>
                          <span className="text-slate-400 hidden sm:inline">- {adj.reason}</span>
                        </div>
                        <span className="font-bold px-2 py-0.5 rounded-md text-xs bg-blue-50 text-[#6c8fc7] border border-blue-200">
                          가중치 {adj.weightMultiplier}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Plan */}
              {currentReport.actionPlan && currentReport.actionPlan.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block">
                    🚀 향후 10일간의 실천 액션 플랜
                  </span>
                  <div className="space-y-2">
                    {currentReport.actionPlan.map((action, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-[#f1f5fb] text-[#6c8fc7] font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Sentences */}
              {currentReport.suggestedNewSentences && currentReport.suggestedNewSentences.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase tracking-wider">
                      💡 약점 보완을 위한 AI 추천 맞춤 문장
                    </span>
                    <span className="text-[11px] text-slate-400">클릭 시 내 보관함에 즉시 추가</span>
                  </div>

                  <div className="space-y-2">
                    {currentReport.suggestedNewSentences.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#faf8f3] border border-slate-200 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                              {item.language === 'ja' ? '🇯🇵 일본어' : '🇺🇸 영어'}
                            </span>
                            <span className="font-bold text-slate-900">{item.targetText}</span>
                          </div>
                          {item.reading && <div className="text-[#a85850] font-mono text-[11px]">{item.reading}</div>}
                          <div className="text-slate-500">{item.korean}</div>
                          <div className="text-[11px] text-[#6c8fc7]">사유: {item.focusReason}</div>
                        </div>
                        <button
                          onClick={() => handleAddSuggestedSentence(item)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-[#6c8fc7] text-xs font-bold flex items-center gap-1 transition shrink-0 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>추가</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Encouragement Footer */}
              {currentReport.coachEncouragement && (
                <div className="p-4 rounded-2xl bg-[#f1f5fb] border border-blue-200/80 text-center text-xs text-[#4a6a96] font-medium">
                  "{currentReport.coachEncouragement}"
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 rounded-3xl bg-blue-50 text-[#6c8fc7]">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">아직 생성된 10일 리포트가 없습니다</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  누적 발화 데이터와 오답 분석을 바탕으로 AI가 정밀 진단 리포트를 작성해드립니다.
                </p>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-2xl bg-[#6c8fc7] hover:bg-[#5a7cb3] text-white text-xs font-bold shadow-sm transition"
              >
                {isGenerating ? 'AI 진단 리포트 생성 중...' : '지금 10일 AI 리포트 생성하기'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
