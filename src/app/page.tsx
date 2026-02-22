"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/homework-list";
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFF9F0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}>
      {/* Logo */}
      <div style={{ animation: "fadeIn 0.6s ease" }}>
        <img
          src="/image/logosy2.svg"
          alt="Song-Yang"
          style={{ width: 120, height: 120 }}
        />
      </div>

      {/* App name */}
      <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease" }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "#5e4034",
          margin: "0 0 4px", letterSpacing: "-0.5px",
        }}>
          Song-Yang
        </h1>
        <p style={{ fontSize: 13, color: "#8c7b75", margin: 0 }}>
          บันทึกการบ้าน
        </p>
      </div>

      {/* Loading dots */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#ffb74d",
            animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
