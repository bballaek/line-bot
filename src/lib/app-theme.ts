/** Warm theme — matches settings pages */
export const t = {
  bg: "#FFF9F0",
  card: "#FFFFFF",
  border: "#F5E6D3",
  borderLight: "#E8E0D4",
  text: "#3E2723",
  textSecondary: "#5D4037",
  textMuted: "#A1887F",
  textHint: "#795548",
  header: "#5D4037",
  headerSub: "#D7CCC8",
  accent: "#FFC107",
  accentIcon: "#F9A825",
  accentLight: "#FFF8E1",
  accentPale: "#FFE082",
  btnPrimary: "#FFC107",
  btnPrimaryText: "#3E2723",
  btnDisabled: "#BCAAA4",
  chipSubject: { bg: "#FFF8E1", text: "#F9A825" },
  chipGroup: { bg: "#FFF3E0", text: "#E65100" },
  error: "#E53935",
  success: "#66BB6A",
  overlay: "rgba(0,0,0,0.4)",
  footerBg: "rgba(255,249,240,0.95)",
  shadow: "0 1px 3px rgba(93,64,55,0.08)",
  segmentedBg: "#F5E6D3",
  segmentedActive: "#FFFFFF",
} as const;

export const pageStyle = { minHeight: "100vh", background: t.bg } as const;
export const cardStyle = {
  background: t.card,
  borderRadius: 16,
  border: `1px solid ${t.border}`,
  boxShadow: t.shadow,
} as const;
export const primaryBtnStyle = {
  background: t.btnPrimary,
  color: t.btnPrimaryText,
  fontWeight: 700,
  border: "none",
  borderRadius: 50,
  cursor: "pointer",
} as const;
