import React from 'react';
import {
  Flame,
  Sparkles,
  Plus,
  Sheet,
  Volume2,
  LogIn,
  LogOut,
  CloudUpload,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { UserStreak } from '../services/storage';
import { LanguageType } from '../types';

interface HeaderProps {
  streak: UserStreak;
  activeLanguage: LanguageType;
  onChangeLanguage: (lang: LanguageType) => void;
  onOpenRegister: () => void;
  onOpenReport: () => void;
  onOpenSheets: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streak,
  activeLanguage,
  onChangeLanguage,
  onOpenRegister,
  onOpenReport,
  onOpenSheets,
  user,
  onOpenAuth,
  onSignOut,
}) => {
  const isJapanese = activeLanguage === 'ja';

  return (
    <header className="border-b border-[#efe4c9] bg-[#fffdf7]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand & Language Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow-xs transition-colors ${
              isJapanese ? 'bg-[#f8eae4] text-[#bd6f63]' : 'bg-[#eef3fa] text-[#5b7fb0]'
            }`}>
              <Volume2 className="w-4 h-4" />
            </div>
            <span className={`text-lg font-black tracking-tight font-serif transition-colors ${
              isJapanese ? 'text-[#6b4038]' : 'text-[#33517a]'
            }`}>
              SpeakLoop
            </span>
          </div>

          {/* Warm Pottery Language Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-[#f6eed6] border border-[#e6d9b9] text-xs font-semibold">
            <button
              onClick={() => onChangeLanguage('en')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLanguage === 'en'
                  ? 'bg-[#5b7fb0] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded tracking-wide ${activeLanguage === 'en' ? 'bg-white/20 text-white' : 'bg-black/5 text-slate-500'}`}>
                US
              </span>
              <span>영어</span>
            </button>
            <button
              onClick={() => onChangeLanguage('ja')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLanguage === 'ja'
                  ? 'bg-[#bd6f63] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded tracking-wide ${activeLanguage === 'ja' ? 'bg-white/20 text-white' : 'bg-black/5 text-slate-500'}`}>
                JP
              </span>
              <span>일본어</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Lemon Accent Streak Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#fef9c3] border border-[#fde047] text-[#854d0e] text-xs font-bold shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{streak.count}일 연속 달성</span>
          </div>

          {/* 10-Day AI Report */}
          <button
            onClick={onOpenReport}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition shadow-xs cursor-pointer ${
              isJapanese
                ? 'bg-[#f8eae4] hover:bg-[#e9cec4] border border-[#e9cec4] text-[#8a5047]'
                : 'bg-[#eef3fa] hover:bg-[#d7e2f0] border border-[#c9d7ea] text-[#3a5c8a]'
            }`}
            title="10일 주기 AI 약점 분석 리포트"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isJapanese ? 'text-[#bd6f63]' : 'text-[#5b7fb0]'}`} />
            <span>10일 AI 리포트</span>
          </button>

          {/* Google Sheets */}
          <button
            onClick={onOpenSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#fffbf0] hover:bg-[#fbf4e0] border border-[#e6d9b9] text-slate-700 text-xs font-semibold transition shadow-xs"
            title="구글 스프레드시트 연동 및 CSV 백업"
          >
            <Sheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">스프레드시트</span>
          </button>

          {/* Manual Register */}
          <button
            onClick={onOpenRegister}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-white text-xs font-bold shadow-xs transition ${
              isJapanese
                ? 'bg-[#bd6f63] hover:bg-[#a85850]'
                : 'bg-[#5b7fb0] hover:bg-[#4a6a96]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>문장 등록</span>
          </button>

          {/* Account / Cloud Sync */}
          {user ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#fffbf0] hover:bg-[#fbf4e0] border border-[#e6d9b9] text-slate-700 text-xs font-semibold transition shadow-xs"
              title={`${user.email} (로그아웃)`}
            >
              <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline max-w-[9rem] truncate">{user.email}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#fffbf0] hover:bg-[#fbf4e0] border border-[#e6d9b9] text-slate-700 text-xs font-semibold transition shadow-xs"
              title="로그인하고 클라우드에 저장"
            >
              <LogIn className="w-3.5 h-3.5 text-[#5b7fb0]" />
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
