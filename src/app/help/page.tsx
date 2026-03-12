"use client";

import { ArrowLeft, MessageSquare, ClipboardList, Megaphone, Send, Settings, Users, Bell, CheckCircle2, HelpCircle } from "lucide-react";

const steps = [
  {
    icon: <ClipboardList size={22} color="#ff7043" />,
    title: "สร้างการบ้าน",
    desc: "กดเมนู \"การบ้าน\" → กด \"สร้างการบ้าน\" → กรอกวิชา, ชื่อการบ้าน, รายละเอียด, กำหนดส่ง → กด \"ถัดไป\"",
    color: "#FFF3E0",
  },
  {
    icon: <Send size={22} color="#2563EB" />,
    title: "ส่งการบ้านเข้ากลุ่ม",
    desc: "หลังบันทึกจะขึ้น popup ให้เลือก \"ส่งเข้าแชทตัวเอง\" หรือ \"ส่งเข้าแชทกลุ่ม\" บอทจะส่ง Flex Message สวยๆ ให้",
    color: "#E3F2FD",
  },
  {
    icon: <Megaphone size={22} color="#1565c0" />,
    title: "สร้างประกาศ",
    desc: "กดเมนู \"ประกาศ\" → กด \"สร้างประกาศ\" → กรอกหัวข้อ, รายละเอียด, วันที่ → เลือกประเภท (แจ้งเพื่อทราบ / แจ้งเพื่อดำเนินการ)",
    color: "#E3F2FD",
  },
  {
    icon: <CheckCircle2 size={22} color="#16A34A" />,
    title: "รับทราบประกาศ",
    desc: "เมื่อผู้ปกครอง/นักเรียน เปิดดูประกาศ จะมีปุ่ม \"ฉันอ่านและรับทราบแล้ว\" กดเพื่อยืนยัน ครูสามารถดูสถานะว่าใครรับทราบแล้วบ้าง",
    color: "#F0FDF4",
  },
  {
    icon: <Users size={22} color="#7C3AED" />,
    title: "เพิ่มบอทเข้ากลุ่ม",
    desc: "เพิ่มบอท Song Yang เข้ากลุ่ม LINE ห้องเรียน บอทจะจำกลุ่มไว้ แล้วสามารถส่งการบ้าน/ประกาศเข้ากลุ่มได้",
    color: "#F5F3FF",
  },
  {
    icon: <MessageSquare size={22} color="#5e4034" />,
    title: "คำสั่งพิมพ์ในแชท",
    desc: "พิมพ์ #การบ้าน → แสดงเมนูจัดการการบ้าน\nพิมพ์ #ประกาศ → แสดงเมนูประกาศ",
    color: "#FFF9F0",
  },
  {
    icon: <Bell size={22} color="#D97706" />,
    title: "ตั้งค่าแจ้งเตือน",
    desc: "ไปที่เมนู \"ตั้งค่า\" เลือกเวลาแจ้งเตือนก่อนถึงกำหนดส่ง เช่น 1 วันก่อน, 3 วันก่อน (เลือกได้สูงสุด 3 อัน)",
    color: "#FFFBEB",
  },
  {
    icon: <Settings size={22} color="#475569" />,
    title: "ส่งการบ้านภายหลัง",
    desc: "ในหน้า \"การบ้านทั้งหมด\" กดไอคอน ส่ง ที่การบ้านแต่ละชิ้น เลือกส่งเข้าแชทตัวเองหรือกลุ่มได้ทุกเมื่อ",
    color: "#F1F5F9",
  },
];

export default function HelpPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F0F4FA" }}>
      {/* Header */}
      <div style={{ background: "#495ca4", padding: "18px 20px 16px", borderRadius: "0 0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => window.history.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={22} />
          </button>
          <HelpCircle size={22} color="#fff" />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>วิธีการใช้งาน</span>
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Intro */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "20px 18px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏫</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", margin: "0 0 6px" }}>Song-Yang บันทึกการบ้าน</h2>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
            ระบบช่วยครูจัดการการบ้านและประกาศ<br/>ส่งแจ้งเตือนเข้ากลุ่ม LINE ได้ง่ายๆ
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 14, padding: "16px 16px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: step.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", background: "#F1F5F9", borderRadius: 4, padding: "1px 6px" }}>ขั้นตอนที่ {i + 1}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>{step.title}</div>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center", padding: "24px 16px 40px", color: "#94A3B8", fontSize: 12 }}>
          หากมีปัญหาการใช้งาน ติดต่อผู้ดูแลระบบ 💬
        </div>
      </div>
    </div>
  );
}
