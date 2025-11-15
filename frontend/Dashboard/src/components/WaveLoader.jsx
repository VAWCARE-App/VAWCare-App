// src/components/WaveLoader.jsx
import React from "react";

export default function WaveLoader({ text }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #faf7ff 0%, #f6f3ff 100%)",
        zIndex: 9999,
      }}
    >
      <div className="loader">
        <div className="ball"></div>
        <div className="ball"></div>
        <div className="ball"></div>
      </div>
      {text && (
        <p
          style={{
            marginTop: "2em",
            color: "#e91e63",
            fontSize: "1.2em",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          {text}
        </p>
      )}

      <style>{`
        .loader {
          width: 100px;
          height: 100px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .ball {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          animation: bounce6135 1.2s ease-in-out alternate infinite;
          background: #e91e63;
        }

        .ball:nth-child(2) {
          animation-delay: 0.3s;
          background: #ec407a;
        }

        .ball:nth-child(3) {
          animation-delay: 0.6s;
          background: #f06292;
        }

        @keyframes bounce6135 {
          0% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.5) translateY(-10px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
