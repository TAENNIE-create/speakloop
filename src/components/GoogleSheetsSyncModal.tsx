import React, { useState } from 'react';
import {
  X,
  Sheet,
  Download,
  Copy,
  Upload,
  CheckCircle,
} from 'lucide-react';
import { Sentence } from '../types';
import { exportToCSV, parseImportData } from '../services/storage';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentences: Sentence[];
  onImportSentences: (imported: Sentence[]) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  sentences,
  onImportSentences,
}) => {
  const [copied, setCopied] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyForSheet = () => {
    const headers = ['언어', '원문 문장', '후리가나/읽기', '한국어 뜻', '카테고리', '핵심 패턴', '복습 횟수', '정답률(%)', '최근 점수', '약점 분류'];
    const rows = sentences.map((s) => [
      s.language === 'ja' ? '일본어' : '영어',
      s.targetText || s.english || s.japanese || '',
      s.reading || '',
      s.korean,
      s.category,
      s.keyPattern || '',
      s.reviewCount,
      s.reviewCount > 0 ? Math.round((s.correctCount / s.reviewCount) * 100) : 0,
      s.lastScore,
      s.weaknessCategory || '정상',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleImportPasted = () => {
    if (!pasteData.trim()) return;
    const parsed = parseImportData(pasteData);
    if (parsed.length === 0) {
      setImportStatus('데이터를 인식하지 못했습니다. 구글 시트의 셀을 복사한 후 붙여넣어 주세요.');
      return;
    }

    const newItems: Sentence[] = parsed.map((item, idx) => ({
      id: `s-imported-${Date.now()}-${idx}`,
      language: item.language,
      targetText: item.targetText,
      english: item.language === 'en' ? item.targetText : undefined,
      japanese: item.language === 'ja' ? item.targetText : undefined,
      reading: item.reading,
      korean: item.korean,
      category: item.category || '스프레드시트 가져옴',
      keyPattern: item.pattern,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
      lastScore: 0,
      lastReviewedAt: null,
      weaknessCategory: null,
      weightMultiplier: 1.5,
    }));

    onImportSentences(newItems);
    setImportStatus(`성공적으로 ${newItems.length}개의 문장을 스프레드시트에서 가져왔습니다!`);
    setPasteData('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#33517a] font-serif">구글 스프레드시트 연동 및 백업</h3>
              <p className="text-xs text-slate-500">
                공부한 문장을 구글 시트와 자유롭게 복사/가져오기/내보내기
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#f6eed6] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          <div className="space-y-3">
            <span className="font-bold text-[#33517a] uppercase tracking-wider block">
              1. 현재 문장 목록 내보내기 ({sentences.length}개)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCopyForSheet}
                className="p-4 rounded-2xl bg-[#fbf4e0] border border-[#efe4c9] hover:border-emerald-400 hover:bg-[#eef7ee] text-left space-y-1.5 group transition shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <Copy className="w-4 h-4" />
                    <span>구글 시트용 셀 복사</span>
                  </div>
                  {copied && <span className="text-[10px] text-emerald-600 font-bold">복사 완료!</span>}
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  구글 스프레드시트의 A1 셀을 누르고 <strong>Ctrl + V</strong>만 누르면 바로 표로 깔끔하게 들어갑니다.
                </p>
              </button>

              <button
                onClick={() => exportToCSV(sentences)}
                className="p-4 rounded-2xl bg-[#fbf4e0] border border-[#efe4c9] hover:border-[#5b7fb0] hover:bg-[#eef3fa] text-left space-y-1.5 group transition shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-[#5b7fb0]">
                  <Download className="w-4 h-4" />
                  <span>CSV 파일 다운로드</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  한글 깨짐 없는 UTF-8 BOM CSV 파일로 다운받아 구글 드라이브나 엑셀에 바로 저장합니다.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="font-bold text-slate-700 uppercase tracking-wider block">
              2. 구글 스프레드시트에서 문장 가져오기
            </span>
            <p className="text-slate-500 text-[11px]">
              구글 시트에서 원문 문장(A열)과 한국어 뜻(B열) 영역을 선택 후 복사(Ctrl+C)하여 아래에 붙여넣으세요.
            </p>

            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="구글 시트에서 복사한 셀 내용을 여기에 붙여넣으세요 (Ctrl + V)..."
              className="w-full h-28 p-3 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-800 font-mono text-xs focus:border-[#6c8fc7] focus:bg-white focus:outline-none resize-none"
            />

            {importStatus && (
              <div className="p-3 rounded-2xl bg-[#eef7ee] border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{importStatus}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleImportPasted}
                disabled={!pasteData.trim()}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                <span>스프레드시트 데이터 불러오기</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
