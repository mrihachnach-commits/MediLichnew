import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Lock, Mail, AlertCircle, Stethoscope, ArrowRight } from 'lucide-react';

export function LoginScreen() {
  const { login, loginWithEmail, registerWithEmail, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!account.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await registerWithEmail(account, password);
      } else {
        await loginWithEmail(account, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        setErrorMsg('Mật khẩu hoặc tài khoản không chính xác.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('Tài khoản/Email này đã được đăng ký trước đó. Vui lòng chọn Đăng nhập.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Mật khẩu quá yếu, vui lòng sử dụng ít nhất 6 ký tự.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('Đăng nhập bằng Email/Mật khẩu chưa mở trên cấu hình Firebase. Vui lòng nhấn nút "Tiếp tục bằng tài khoản Google" bên dưới để đăng nhập!');
      } else {
        setErrorMsg(err.message || 'Không thể xác thực. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl text-left space-y-6 shadow-2xl z-10"
      >
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Doctor AI Assistant</h1>
            <p className="text-xs text-slate-400">Hệ Thống Lịch Trình Y Khoa & Trợ Lý Bác Sĩ</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              !isRegistering 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              isRegistering 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo Tài Khoản</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tài khoản / Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập tên tài khoản hoặc email..."
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegistering ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">Hoặc</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => login()}
          className="w-full flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-800/90 text-slate-200 border border-slate-800 font-medium py-2.5 rounded-xl transition-all active:scale-[0.98] text-xs"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Tiếp tục bằng tài khoản Google
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Dữ liệu lịch trực và cài đặt của bạn sẽ tự động lưu vĩnh viễn vào Google Cloud Firestore.
        </p>
      </motion.div>
    </div>
  );
}
