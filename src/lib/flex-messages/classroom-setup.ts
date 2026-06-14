/** Flex Message แจ้งครูเปิดใช้งานห้องเรียนเมื่อบอทเข้ากลุ่ม */
export function buildClassroomSetupFlex(liffBaseUrl: string, groupId: string) {
  const registerUrl = `${liffBaseUrl}/schedule/classrooms/register?group_id=${encodeURIComponent(groupId)}`;

  return {
    type: "flex" as const,
    altText: "เปิดใช้งานห้องเรียน — Song-Yang (เฉพาะครู)",
    contents: {
      type: "bubble" as const,
      size: "mega" as const,
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FFF8E1",
        paddingAll: "24px",
        contents: [
          {
            type: "text",
            text: "สำหรับ ครู",
            size: "xs",
            color: "#795548",
            weight: "bold",
          },
          {
            type: "text",
            text: "🏫 Song-Yang",
            size: "xxl",
            weight: "bold",
            align: "center",
            color: "#3E2723",
            margin: "md",
          },
          {
            type: "text",
            text: "บันทึกการบ้าน & ประกาศ",
            size: "xs",
            color: "#A1887F",
            align: "center",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "เฉพาะคุณครูเท่านั้น",
            weight: "bold",
            color: "#E53935",
            size: "md",
            align: "center",
          },
          {
            type: "text",
            text: "For teachers only",
            size: "xs",
            color: "#E53935",
            align: "center",
          },
          {
            type: "text",
            text: "กดปุ่มด้านล่างเพื่อลงทะเบียนห้องเรียน\nและดึงรายชื่อนักเรียนจากกลุ่มนี้",
            size: "xs",
            color: "#795548",
            align: "center",
            wrap: true,
            margin: "lg",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06C755",
            height: "sm",
            action: {
              type: "uri" as const,
              label: "เปิดใช้งานสำหรับห้องเรียนนี้",
              uri: registerUrl,
            },
          },
          {
            type: "text",
            text: "Set up this classroom",
            size: "xxs",
            color: "#A1887F",
            align: "center",
            margin: "sm",
          },
        ],
      },
    },
  };
}
