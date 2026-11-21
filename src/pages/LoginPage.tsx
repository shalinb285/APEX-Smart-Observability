
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const result = await login(identifier.trim(), password);

      if (result.mfaRequired) {
        await logout();

        setError(
          'This account requires MFA. Server-side MFA verification has not yet been implemented.'
        );

        return;
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;

      let message = 'Login failed. Please check your username/email and password.';

      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((item: any) => item.msg).join(', ');
      } else if (typeof err?.message === 'string') {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px',
    marginBottom: '22px',
    background: '#080b11',
    color: '#fff',
    border: '1px solid #303b4c',
    borderRadius: '7px',
    outline: 'none',
    fontFamily: 'monospace',
    fontSize: '13px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#e8edf5'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07090d',
        color: '#e8edf5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px',
          background: '#10141c',
          border: '1px solid #293241',
          borderRadius: '14px',
          boxShadow: '0 20px 70px rgba(0,0,0,0.45)'
        }}
      >
        {/* APEX Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '4px',
              color: '#ffffff'
            }}
          >
            APEX
          </div>

          <div
            style={{
              color: '#8b9bb4',
              fontSize: '11px',
              letterSpacing: '3px',
              marginTop: '6px'
            }}
          >
            SMART OBSERVABILITY
          </div>

          <h2 style={{ marginTop: '32px', fontSize: '20px' }}>
            Operator Sign In
          </h2>

          <p style={{ color: '#8793a5', fontSize: '12px' }}>
            Authenticate to access your observability console.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <label style={labelStyle}>
            USERNAME OR EMAIL ADDRESS
          </label>

          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter username or Gmail address"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            style={inputStyle}
          />

          <label style={labelStyle}>
            PASSWORD
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            style={inputStyle}
          />

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              style={{
                padding: '12px',
                marginBottom: '18px',
                background: '#351719',
                border: '1px solid #873b40',
                color: '#ff9b9b',
                borderRadius: '7px',
                fontSize: '12px',
                lineHeight: '1.6',
                overflowWrap: 'anywhere'
              }}
            >
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || !identifier.trim() || !password}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#34445c' : '#1677e8',
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              letterSpacing: '1px',
              opacity: !identifier.trim() || !password ? 0.65 : 1
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN TO APEX'}
          </button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: '#66758a',
            fontSize: '10px',
            marginTop: '28px',
            lineHeight: '1.6'
          }}
        >
          SECURE OPERATOR ACCESS · APEX SMART OBSERVABILITY
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
