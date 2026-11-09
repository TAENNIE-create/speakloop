import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { LanguageType } from '../types';

interface LiveDateTimeBannerProps {
  language: LanguageType;
  totalSentences: number;
}

export const LiveDateTimeBanner: React.FC<LiveDateTimeBannerProps> = ({
  language,
  totalSentences,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isJapanese = language === 'ja';

  // Format Date in Korean
  const daysKo = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const date = currentTime.getDate();
  const dayName = daysKo[currentTime.getDay()];
  const formattedDate = `${year}년 ${month}월 ${date}일 ${dayName}`;

  // Format Time with AM/PM & seconds
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const isPM = hours >= 12;
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedTime = `${isPM ? '오후' : '오전'} ${pad(displayHours)}:${pad(minutes)}:${pad(seconds)}`;

  // Determine current review period
  const isMorning = hours >= 5 && hours < 12;
  const isAfternoon = hours >= 12 && hours < 18;
  const sessionText = isMorning
    ? '🌅 아침 복습'
    : isAfternoon
    ? '☀️ 오후 연습'
    : '🌙 저녁 복습';

  return (
    <div className="bg-[#fffdf7] rounded-3xl border border-[#efe4c9] p-4 sm:p-5 shadow-[0_2px_8px_rgba(40,30,10,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Date & Session Info */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Lemon accent pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef9c3] border border-[#fde047] text-[#854d0e] text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#eab308] animate-pulse" />
            {sessionText}
          </span>

          {/* Language indicator pill */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
            isJapanese
              ? 'bg-[#f8eae4] border border-[#e9cec4] text-[#8a5047]'
              : 'bg-[#f1f5fb] border border-[#c9d7ea] text-[#3f6090]'
          }`}>
            {isJapanese ? '일본어' : '영어'}
          </span>
        </div>

        {/* Date string */}
        <div className="flex items-center gap-2 pt-1">
          <Calendar className={`w-4 h-4 transition-colors ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`} />
          <h2 className={`text-base sm:text-lg font-bold tracking-tight transition-colors ${
            isJapanese ? 'text-[#6b4038]' : 'text-[#2e4360]'
          }`}>
            {formattedDate}
          </h2>
        </div>
      </div>

      {/* Live Clock Display (Ceramic Blue or Japanese Coral Red + Lemon Glow) */}
      <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#f6eed6]">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-xs transition-colors ${
          isJapanese
            ? 'bg-[#f8eae4] border-[#e9cec4]'
            : 'bg-[#eef3fa] border-[#c9d7ea]'
        }`}>
          <div className={`w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center shadow-xs transition-colors ${
            isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'
          }`}>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${
              isJapanese ? 'text-[#a66a5e]' : 'text-[#7996bc]'
            }`}>
              현재 시각 (LIVE)
            </div>
            <div className={`text-lg sm:text-xl font-black tracking-tight leading-none ${
              isJapanese ? 'text-[#6b4038]' : 'text-[#355480]'
            }`}>
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Ceramic 3-dot decoration inspired by Diafano reference design */}
        <div className="hidden sm:flex items-center gap-1.5 px-2">
          <span className={`w-2 h-2 rounded-full ${isJapanese ? 'bg-[#e9cec4]' : 'bg-[#c9d7ea]'}`} />
          <span className={`w-2 h-2 rounded-full ${isJapanese ? 'bg-[#bd6f63]' : 'bg-[#5b7fb0]'}`} />
          <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] shadow-xs" />
        </div>
      </div>
    </div>
  );
};
