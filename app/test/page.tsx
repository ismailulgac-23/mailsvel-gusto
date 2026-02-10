'use client';

import { useState } from 'react';

export default function TestPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/whatsapp/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/whatsapp/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>WhatsApp Doğrulama Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Telefon Numarası (örn: 905551234567)
        </label>
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="905551234567"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>

      <button
        onClick={sendCode}
        disabled={loading || !phoneNumber}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#008060',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '30px',
          opacity: loading || !phoneNumber ? 0.5 : 1
        }}
      >
        {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
      </button>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Doğrulama Kodu
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          maxLength={6}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>

      <button
        onClick={verifyCode}
        disabled={loading || !phoneNumber || !code}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#5C6AC4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '30px',
          opacity: loading || !phoneNumber || !code ? 0.5 : 1
        }}
      >
        {loading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
      </button>

      {result && (
        <div
          style={{
            padding: '20px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            marginTop: '20px'
          }}
        >
          <h3 style={{ marginTop: 0 }}>Sonuç:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Test Bilgileri:</h3>
        <ul>
          <li>Telefon numarasını uluslararası formatta girin (örn: 905551234567)</li>
          <li>Kod gönder butonuna tıklayın</li>
          <li>Sonuç alanında gelen kodu göreceksiniz (development mode)</li>
          <li>Kodu girerek doğrulayın</li>
          <li>WhatsApp Business API bağlıysa gerçek mesaj gönderilir</li>
        </ul>
      </div>
    </div>
  );
}