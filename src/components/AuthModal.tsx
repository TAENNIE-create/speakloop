import React, { useState } from 'react';
import { X, LogIn, UserPlus, CloudUpload, AlertTriangle, MailCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSignupDone(false);
    setMode('signin');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        resetAndClose();
      } else {
        await signUp(email.trim(), password);
        setSignupDone(true);
      }
    } catch (err: any) {
      setError(err?.message || '요청 처리 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#fffdf7] border border-[#efe4c9] rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f6eed6] flex items-center justify-between bg-[#faf6ec]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#eef3fa] text-[#5b7fb0]">
              <CloudUpload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#33517a]">
              {mode === 'signin' ? '로그인' : '회원가입'}
            </h3>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#f6eed6] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {!isSupabaseConfigured ? (
            <div className="p-3.5 rounded-2xl bg-[#fef9c3] border border-[#fde047] text-[#854d0e] text-xs flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                아직 클라우드 저장이 연결되지 않았습니다. <code>.env</code>에{' '}
                <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 설정한 뒤
                개발 서버를 다시 시작해주세요.
              </span>
            </div>
          ) : signupDone ? (
            <div className="p-4 rounded-2xl bg-[#eef7ee] border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 leading-relaxed">
              <MailCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                가입 확인 메일을 보냈어요. 메일함에서 인증 링크를 눌러주시면 로그인할 수 있습니다.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center p-1 rounded-2xl bg-[#f6eed6] border border-[#e6d9b9] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className={`flex-1 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'signin' ? 'bg-[#5b7fb0] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`flex-1 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'signup' ? 'bg-[#5b7fb0] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  회원가입
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-sm focus:border-[#6c8fc7] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상"
                    minLength={6}
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#faf8f3] border border-slate-200 text-slate-900 text-sm focus:border-[#6c8fc7] focus:bg-white focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-[#f8eae4] border border-[#e9cec4] text-[#8a5047] text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-5 py-2.5 rounded-2xl bg-[#5b7fb0] hover:bg-[#4a6a96] text-white text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isSubmitting ? '처리 중...' : mode === 'signin' ? '로그인' : '회원가입'}</span>
                </button>

                <p className="text-center text-[11px] text-slate-500 leading-relaxed">
                  로그인하면 학습 데이터가 클라우드에 자동 저장되어, 다른 기기에서도 이어서 복습할 수 있어요.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
