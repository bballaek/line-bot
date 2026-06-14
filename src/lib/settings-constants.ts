export const GROUP_OPTIONS = [
  { value: "All", label: "ทั้งหมด" },
  { value: "Group A", label: "Group A" },
  { value: "Group B", label: "Group B" },
] as const;

export const NOTIFY_PRESETS = [
  { label: "1 ชั่วโมงก่อนกำหนดส่ง", value: "1h" },
  { label: "6 ชั่วโมงก่อนกำหนดส่ง", value: "6h" },
  { label: "1 วันก่อนวันกำหนดส่ง", value: "1d" },
  { label: "3 วันก่อนวันกำหนดส่ง", value: "3d" },
  { label: "1 สัปดาห์ก่อนวันกำหนดส่ง", value: "1w" },
] as const;

export const MAX_NOTIFY_SELECTIONS = 3;

export function groupLabel(value: string) {
  return GROUP_OPTIONS.find((g) => g.value === value)?.label ?? value;
}
