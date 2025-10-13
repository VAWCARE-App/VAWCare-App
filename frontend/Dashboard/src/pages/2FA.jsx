import React, { useState, useRef, useEffect } from "react";
import { App as AntApp, Button, Card, Input, Typography, Grid, Modal } from "antd";
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { exchangeCustomTokenForIdToken } from '../lib/firebase';
import { saveToken } from '../lib/api';
import Logo from "../assets/logo1.svg?react";

/* ---------- Background Carousel Layer ---------- */
function BackgroundCarouselLayer({ slides, speed = 30, top = "20vh", opacity = 0.5, reverse = false }) {
  return (
    <div
      className="bg-carousel-layer"
      style={{
        top,
        transform: `rotate(-10deg) perspective(800px) rotateX(8deg)`,
        opacity,
      }}
    >
      <div
        className="bg-carousel-track"
        style={{ animation: `${reverse ? "slideLoopReverse" : "slideLoop"} ${speed}s linear infinite` }}
      >
        {[...slides, ...slides].map((s, i) => (
          <div key={i} className="bg-slide" style={{ background: s.color }}>
            <span className="bg-slide__text">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Multi-Layer Background Carousel ---------- */
function MultiBackgroundCarousel() {
  const slides = [
    { color: "#ffd1dc", label: "Support" },
    { color: "#ff9bb5", label: "Safety" },
    { color: "#ffc4d3", label: "Care" },
    { color: "#ffb3c4", label: "Hope" },
    { color: "#ff8fa8", label: "Trust" },
  ];

  return (
    <>
      <div className="bg-carousel">
        <BackgroundCarouselLayer slides={slides} speed={28} top="12vh" opacity={0.55} />
        <BackgroundCarouselLayer slides={slides} speed={34} top="28vh" opacity={0.5} reverse />
        <BackgroundCarouselLayer slides={slides} speed={40} top="44vh" opacity={0.45} />
        <BackgroundCarouselLayer slides={slides} speed={48} top="60vh" opacity={0.4} reverse />
        <BackgroundCarouselLayer slides={slides} speed={56} top="76vh" opacity={0.35} />
      </div>

      <style>{`
        .bg-carousel {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .bg-carousel-layer {
          position: absolute;
          left: -15vw;
          right: -15vw;
          height: clamp(160px, 24vh, 220px);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
        }

        .bg-carousel-track {
          display: flex;
          gap: 18px;
          will-change: transform;
        }

        .bg-slide {
          width: clamp(160px, 26vw, 300px);
          height: 100%;
          border-radius: 16px;
          box-shadow:
            inset 0 6px 12px rgba(255,255,255,0.35),
            inset 0 -8px 16px rgba(0,0,0,0.08),
            0 18px 28px rgba(233,30,99,0.12);
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.4s ease;
        }
        .bg-slide:hover { transform: scale(1.05); }

        .bg-slide__text {
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
          font-size: clamp(16px, 2.5vw, 24px);
          opacity: 0.45;
          user-select: none;
        }

        .bg-slide::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.18), transparent 60%);
        }

        @keyframes slideLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideLoopReverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        @media (max-width: 576px) {
          .bg-carousel-layer { opacity: 0.3; height: 120px; }
        }
        @media (max-width: 380px) {
          .bg-carousel { display: none; }
        }

        /* Card animations */
        .twofa-card {
          animation: fadeInUp 0.8s ease both;
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

export default function TwoFactor() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const inputsRef = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location?.state?.email || null;
  const purpose = location?.state?.purpose || null; // 'register' etc.

  useEffect(() => {
    // ensure refs array length
    if (!inputsRef.current) inputsRef.current = [];
  }, []);

  const maxWidth = screens.x2 ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;
  const cardPadding = screens.md ? 24 : 16;

  const submitCode = async () => {
    try {
      setLoading(true);
      if (purpose === 'register') {
        if (!email) {
          throw new Error('Missing email context for registration verification');
        }
        const { data } = await api.post('/api/victims/register/verify', { email, otp: code });
        if (!data || !data.success) {
          throw new Error(data?.message || 'Verification failed');
        }

        // If backend created a Firebase custom token, exchange it for an ID token and save
        if (data.data && data.data.token) {
          try {
            const idToken = await exchangeCustomTokenForIdToken(data.data.token);
            if (idToken) {
              saveToken(idToken);
            } else {
              throw new Error('Token exchange failed');
            }
          } catch (ex) {
            console.error('Token exchange error after registration verify:', ex);
            message.error('Verification succeeded but authentication failed. Please login.');
            setLoading(false);
            return;
          }
        }

        // persist user info if returned
        if (data.data && data.data.victim) localStorage.setItem('user', JSON.stringify(data.data.victim));
        if (data.data && data.data.victim && data.data.victim.id) {
          localStorage.setItem('actorId', String(data.data.victim.id));
          localStorage.setItem('actorType', 'victim');
        }
        if (data.data && data.data.victim && data.data.victim.victimID) {
          localStorage.setItem('actorBusinessId', String(data.data.victim.victimID));
        }

        message.success('Email verified and account created');
        navigate('/victim/victim-test');
        return;
      }

      // fallback behavior
      console.log('Submitted code:', code);
      message.success('Code submitted (placeholder)');
    } catch (err) {
      console.error('2FA submit error:', err);
      setModalMessage(err?.response?.data?.message || err.message || 'Verification failed');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", backgroundColor: "#fff0f5" }}>
      <MultiBackgroundCarousel />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <Card
          className="twofa-card"
          style={{
            width: '100%',
            maxWidth,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            padding: cardPadding,
            backdropFilter: 'blur(10px) saturate(150%)',
            background: 'rgba(255,255,255,0.65)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            {/* Force logo to use brand pink color */}
            <Logo style={{ width: 80, height: 80, color: '#e91e63' }} className="vawc-logo-pink" />
            <style>{`.vawc-logo-pink svg, .vawc-logo-pink path, .vawc-logo-pink circle, .vawc-logo-pink rect { fill: #e91e63 !important; stroke: #e91e63 !important; }`}</style>
          </div>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 6 }}>Two-Factor Authentication</Typography.Title>
          <Typography.Paragraph style={{ textAlign: 'center', color: '#555', marginBottom: 18 }}>Enter the 6-digit code sent to your email or authenticator app.</Typography.Paragraph>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const digits = code.split('');
              const val = digits[i] || '';
              return (
                <Input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  value={val}
                  onChange={(e) => {
                    const raw = e.target.value || '';
                    const digit = raw.replace(/\D/g, '').slice(-1);
                    const arr = code.split('');
                    while (arr.length < 6) arr.push('');
                    arr[i] = digit;
                    setCode(arr.join(''));
                    if (digit && i < 5) {
                      // move focus to next
                      const next = inputsRef.current[i + 1];
                      if (next) next.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    const key = e.key;
                    if (key === 'Backspace') {
                      const arr = code.split('');
                      while (arr.length < 6) arr.push('');
                      if (arr[i]) {
                        // clear current
                        arr[i] = '';
                        setCode(arr.join(''));
                      } else if (i > 0) {
                        const prev = inputsRef.current[i - 1];
                        if (prev) {
                          prev.focus();
                          const parr = code.split('');
                          while (parr.length < 6) parr.push('');
                          parr[i - 1] = '';
                          setCode(parr.join(''));
                        }
                      }
                    } else if (key === 'ArrowLeft' && i > 0) {
                      inputsRef.current[i - 1]?.focus();
                    } else if (key === 'ArrowRight' && i < 5) {
                      inputsRef.current[i + 1]?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text') || '';
                    const digitsOnly = paste.replace(/\D/g, '');
                    if (!digitsOnly) return;
                    const take = digitsOnly.slice(0, 6).split('');
                    const arr = [];
                    for (let k = 0; k < 6; k++) arr.push(take[k] || '');
                    setCode(arr.join(''));
                    // focus the next empty or last
                    const firstEmpty = arr.findIndex((d) => !d);
                    const focusIndex = firstEmpty === -1 ? 5 : firstEmpty;
                    setTimeout(() => inputsRef.current[focusIndex]?.focus(), 0);
                  }}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={1}
                  style={{ width: 46, height: 46, textAlign: 'center', fontSize: 20, borderRadius: 8 }}
                />
              );
            })}
          </div>

          <Button type="primary" block loading={loading} onClick={submitCode}>Verify</Button>

          <Modal title="Verification" open={modalVisible} onOk={() => setModalVisible(false)} onCancel={() => setModalVisible(false)}>
            <Typography.Paragraph>{modalMessage}</Typography.Paragraph>
          </Modal>
        </Card>
      </div>
    </div>
  );
}
