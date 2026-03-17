import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, adminLoginWithOtp, adminRequestOtp, getAuthMode } from '../../lib/api';

export function AdminLogin() {
  const [authMode, setAuthMode] = useState<'otp' | 'password' | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getAuthMode().then(setAuthMode);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await adminLogin(password);
      if (ok) {
        navigate('/admin');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminRequestOtp(email);
      if (result.ok) {
        setOtpSent(true);
      } else {
        setError(result.error || 'Failed to send code');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminLoginWithOtp(email, otp);
      if (result.ok) {
        navigate('/admin');
      } else {
        setError(result.error || 'Invalid code');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (authMode === null) {
    return <div className="admin-login loading">Loading...</div>;
  }

  return (
    <div className="page admin-login">
      <h1>Admin Login</h1>
      {authMode === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="login-form">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading}>{loading ? '...' : 'Login'}</button>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} className="login-form">
          {!otpSent ? (
            <>
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send code'}</button>
            </>
          ) : (
            <>
              <p className="otp-hint">Check your inbox for the 6-digit code</p>
              <input
                type="text"
                placeholder="Enter code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
              />
              <button type="submit" disabled={loading || otp.length !== 6}>{loading ? '...' : 'Verify'}</button>
              <button
                type="button"
                className="link"
                onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
              >
                Use different email
              </button>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </div>
  );
}
