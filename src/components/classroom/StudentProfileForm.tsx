"use client";

import { useState } from "react";

type Props = {
  studentNumber: string;
  fullName: string;
  nickname: string;
  onStudentNumberChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
  onNicknameChange: (v: string) => void;
  disabled?: boolean;
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#5D4037",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #F5E6D3",
  borderRadius: 10,
  fontSize: 15,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

export default function StudentProfileForm({
  studentNumber,
  fullName,
  nickname,
  onStudentNumberChange,
  onFullNameChange,
  onNicknameChange,
  disabled,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>เลขที่</label>
        <input
          type="number"
          min={1}
          max={999}
          placeholder="เช่น 15"
          value={studentNumber}
          onChange={(e) => onStudentNumberChange(e.target.value)}
          disabled={disabled}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>ชื่อ-นามสกุล</label>
        <input
          type="text"
          placeholder="เช่น สมชาย ใจดี"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          disabled={disabled}
          style={inputStyle}
        />
        <p style={{ fontSize: 12, color: "#A1887F", margin: "6px 0 0", lineHeight: 1.5 }}>
          ไม่ต้องใส่คำนำหน้าชื่อ เช่น เด็กชาย, ด.ญ., นาย, นางสาว
        </p>
      </div>
      <div>
        <label style={labelStyle}>ชื่อเล่น</label>
        <input
          type="text"
          placeholder="เช่น ชาย"
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          disabled={disabled}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

export function LineProfileCard({
  displayName,
  pictureUrl,
}: {
  displayName: string | null;
  pictureUrl: string | null;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
      background: "#fff", borderRadius: 16, border: "1px solid #F5E6D3", marginBottom: 20,
    }}>
      {pictureUrl ? (
        <img src={pictureUrl} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: "#FFF8E1",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 700, color: "#F9A825",
        }}>
          {(displayName || "?")[0]}
        </div>
      )}
      <div>
        <div style={{ fontSize: 12, color: "#A1887F", marginBottom: 2 }}>ชื่อ LINE</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#3E2723" }}>{displayName || "ไม่ทราบชื่อ"}</div>
      </div>
    </div>
  );
}
