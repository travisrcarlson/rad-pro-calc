import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Freya2026') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '40px 60px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>☢️</div>
        <h1 style={{ color: '#E0E1DD', margin: '0 0 5px 0', fontSize: '1.8rem', letterSpacing: '1px' }}>RadPro Analyst</h1>
        <p style={{ color: '#888', marginBottom: '30px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Secure Gateway</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter passphrase"
            autoFocus
            style={{
              padding: '12px 15px',
              borderRadius: '8px',
              border: `1px solid ${error ? '#e74c3c' : 'rgba(255,255,255,0.2)'}`,
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border 0.3s ease'
            }}
          />
          {error && <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '-10px', textAlign: 'left' }}>Invalid verification code.</div>}
          
          <button type="submit" style={{
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #3498db, #2980b9)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            cursor: 'pointer',
            transition: 'transform 0.1s ease, box-shadow 0.2s ease',
            marginTop: '10px'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
