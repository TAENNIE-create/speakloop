import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Send,
  AlertCircle,
  ChevronRight,
  X,
  Keyboard,
  BookOpen,
} from 'lucide-react';
import { Sentence, EvaluationResult } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { sounds } from '../services/sound';

interface SpeakingTestModalProps {
  sentence: Sentence;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (updatedSentence: Sentence, score: number, passed: boolean) => void;
  isSequential?: boolean;
  quizIndex?: number;
  totalQuestions?: number;
}

export const SpeakingTestModal: React.FC<SpeakingTestModalProps> = ({
  sentence,
  isOpen,
  onClose,
  onComplete,
  isSequential = false,
  quizIndex = 1,
  totalQuestions = 10,
}) => {
  const isJapanese = sentence.language === 'ja';
  const targetText = sentence.targetText || sentence.english || sentence.japanese || '';

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

  const [showHint, setShowHint] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      setResult(null);
      setShowHint(false);
      setManualMode(false);
    } else {
      stopListening();
    }
  }, [isOpen, sentence.id]);

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

  const handlePlayTTS = async (text: string, speed: number = 0.95) => {
    setIsPlayingAudio(true);
    await sounds.speak(text, isJapanese ? 'ja' : 'en', speed);
    setIsPlayingAudio(false);
  };

  const handleSubmitEvaluation = async () => {
    stopListening();
    const spoken = currentText.trim();
    if (!spoken) return;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSentence: targetText,
          spokenText: spoken,
          koreanMeaning: sentence.korean,
          language: sentence.language || 'en',
        }),
      });

      const data: EvaluationResult = await res.json();
      setResult(data);

      if (data.passed) {
        sounds.playSuccess();
      } else {
        sounds.playNeedsReview();
      }

      let newWeight = sentence.weightMultiplier || 1.0;
      if (data.score >= 90) {
        newWeight = Math.max(0.6, newWeight * 0.85);
      } else if (data.score < 75) {
        newWeight = Math.min(3.5, newWeight * 1.35);
      }

      const updatedSentence: Sentence = {
        ...sentence,
        reviewCount: (sentence.reviewCount || 0) + 1,
        correctCount: (sentence.correctCount || 0) + (data.passed ? 1 : 0),
        lastScore: data.score,
        lastReviewedAt: new Date().toISOString(),
        weaknessCategory: data.weaknessCategory,
        weightMultiplier: Number(newWeight.toFixed(2)),
      };

      onComplete(updatedSentence, data.score, data.passed);
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetry = () => {
    resetTranscript();
    setResult(null);
    startListening();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isJapanese ? 'bg-[#bd6f63]' : 'bg-[#5b7fb0]'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider font-serif ${isJapanese ? 'text-[#a85850]' : 'text-[#5b7fb0]'}`}>
              {isSequential
                ? `${isJapanese ? '일본어' : '영어'} 10문장 복습 (${quizIndex}/${totalQuestions})`
                : `${isJapanese ? '일본어' : '영어'} AI 말하기 테스트`}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#fffbf0] border border-[#e6d9b9] text-slate-700 font-medium">
              {sentence.category || '일상 회화'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#f6eed6] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Korean Prompt Banner */}
          <div className="bg-[#fbf4e0] border border-[#efe4c9] rounded-2xl p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                한국어 뜻을 보고 {isJapanese ? '일본어로' : '영어로'} 말해보세요
              </span>
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-xs text-[#5b7fb0] hover:underline flex items-center gap-1 font-bold transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? '힌트 숨기기' : '힌트 보기'}</span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {sentence.korean}
            </h2>

            {showHint && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-600 animate-in fade-in">
                {sentence.keyPattern && (
                  <div>
                    <span className="font-semibold text-[#6c8fc7]">💡 핵심 패턴:</span> {sentence.keyPattern}
                  </div>
                )}
                {isJapanese && sentence.reading && (
                  <div>
                    <span className="font-semibold text-[#a85850]">📖 히라가나 읽기:</span>{' '}
                    <span className="font-mono text-slate-900">{sentence.reading}</span>
                  </div>
                )}
                {!isJapanese && (
                  <div>
                    <span className="font-semibold text-[#6c8fc7]">🔤 첫 단어:</span>{' '}
                    <span className="font-mono">{targetText.split(' ')[0]} ...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Microphone & Voice Interaction Zone */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              
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
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-95 ${
                    isListening
                      ? 'bg-[#bd6f63] text-white shadow-[#bd6f63]/30 ring-4 ring-[#e9cec4] scale-105'
                      : isJapanese
                      ? 'bg-[#a85850] hover:bg-[#bd6f63] text-white shadow-[#a85850]/20'
                      : 'bg-[#6c8fc7] hover:bg-[#5a7cb3] text-white shadow-[#5b7fb0]/20'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </button>
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {isListening ? `듣고 있습니다... ${isJapanese ? '일본어로' : '영어로'} 말씀하세요` : '마이크를 누르고 말해보세요'}
                </p>
                <p className="text-xs text-slate-400">
                  {isListening ? '말씀이 끝나면 마이크를 다시 누르거나 채점 버튼을 누르세요' : '클릭하여 음성 인식을 시작합니다'}
                </p>
              </div>

              {speechError && (
                <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span>{speechError}</span>
                    <button
                      onClick={() => setManualMode(true)}
                      className="ml-2 underline font-bold"
                    >
                      직접 타이핑하기
                    </button>
                  </div>
                </div>
              )}

              {/* Transcript Display Box */}
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
                    className="w-full p-3.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-800 text-sm focus:border-[#6c8fc7] focus:bg-white focus:outline-none resize-none h-20"
                  />
                ) : (
                  <div className="w-full min-h-[64px] p-3.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-sm flex items-center">
                    {currentText ? (
                      <span className="text-slate-900 font-semibold tracking-wide">
                        {currentText}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">
                        마이크를 누르고 말씀하시면 여기에 실시간으로 표시됩니다...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Submit */}
              {currentText.trim().length > 0 && (
                <div className="flex items-center gap-3 w-full pt-1">
                  <button
                    onClick={resetTranscript}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                  >
                    다시 말하기
                  </button>

                  <button
                    onClick={handleSubmitEvaluation}
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
                      <>
                        <Send className="w-4 h-4" />
                        <span>채점 및 AI 분석 제출</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Result Card */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Score Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#faf8f3] border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
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
                      <span className="text-base font-bold text-slate-900">
                        {result.passed ? '합격! 훌륭합니다' : '아쉬워요, 다시 도전해보세요'}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold">
                        {result.weaknessCategory}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {result.score >= 85
                        ? '의미와 표현이 정확하게 전달되었습니다.'
                        : '의미 파악 및 핵심 문법 포인트를 한 번 더 점검해보세요.'}
                    </p>
                  </div>
                </div>

                {/* TTS */}
                <button
                  onClick={() => handlePlayTTS(targetText, 1.0)}
                  disabled={isPlayingAudio}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#6c8fc7] text-slate-700 hover:text-[#6c8fc7] text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  title="원어민 발음 듣기"
                >
                  <Volume2 className="w-4 h-4 text-[#6c8fc7]" />
                  <span>원어민 발음</span>
                </button>
              </div>

              {/* Target vs Spoken Comparison */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">🎯 목표 원문:</span>
                  <div className="text-sm font-bold text-slate-900">{targetText}</div>
                  {isJapanese && sentence.reading && (
                    <div className="text-xs text-[#a85850] font-mono mt-0.5">{sentence.reading}</div>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-500 block mb-1">🗣 발화 분석:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.wordDiff && result.wordDiff.length > 0 ? (
                      result.wordDiff.map((item, idx) => (
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
                      ))
                    ) : (
                      <span className="text-slate-800">{currentText}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Coaching Feedback */}
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                isJapanese
                  ? 'bg-[#f8eae4] border-[#e9cec4] text-slate-800'
                  : 'bg-[#eef3fa] border-[#c9d7ea] text-slate-800'
              }`}>
                <div className={`flex items-center gap-1.5 font-bold ${
                  isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'
                }`}>
                  <Sparkles className="w-4 h-4" />
                  <span>AI 코치의 피드백</span>
                </div>
                <p className="leading-relaxed">{result.feedback}</p>
                {result.nativeAlternative && (
                  <div className={`pt-1.5 border-t ${
                    isJapanese
                      ? 'border-[#e9cec4] text-[#8a5047]'
                      : 'border-[#c9d7ea] text-[#355480]'
                  }`}>
                    💡 <span className="font-semibold">원어민 팁:</span> {result.nativeAlternative}
                  </div>
                )}
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>다시 말해보기</span>
                </button>

                <button
                  onClick={onClose}
                  className={`px-6 py-2.5 rounded-2xl text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition ${
                    isJapanese ? 'bg-[#a85850] hover:bg-[#bd6f63]' : 'bg-[#6c8fc7] hover:bg-[#5a7cb3]'
                  }`}
                >
                  <span>{isSequential ? '다음 문장' : '완료'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
