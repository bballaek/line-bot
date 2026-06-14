export function buildCoTeacherInviteFlex(
  liffBaseUrl: string,
  token: string,
  ownerName: string
) {
  const acceptUrl = `${liffBaseUrl}/settings/co-teachers/invite?token=${encodeURIComponent(token)}`;

  return {
    type: "flex" as const,
    altText: `${ownerName} เชิญคุณเป็นครูผู้สอนร่วม`,
    contents: {
      type: "bubble" as const,
      size: "mega" as const,
      header: {
        type: "box" as const,
        layout: "vertical" as const,
        backgroundColor: "#FFF8E1",
        paddingAll: "16px",
        contents: [
          {
            type: "text" as const,
            text: "คำเชิญครูผู้สอนร่วม",
            weight: "bold",
            size: "md",
            color: "#3E2723",
          },
          {
            type: "text" as const,
            text: "Co-teacher invitation",
            size: "xs",
            color: "#A1887F",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "text" as const,
            text: ownerName,
            weight: "bold",
            size: "lg",
            color: "#3E2723",
            wrap: true,
          },
          {
            type: "text" as const,
            text: "เชิญคุณเป็นครูผู้สอนร่วม\nช่วยสร้างการบ้านและประกาศได้",
            size: "sm",
            color: "#795548",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box" as const,
        layout: "vertical" as const,
        paddingAll: "12px",
        spacing: "sm",
        contents: [
          {
            type: "button" as const,
            style: "primary",
            color: "#06C755",
            height: "sm",
            action: {
              type: "uri" as const,
              label: "ตกลง",
              uri: `${acceptUrl}&action=accept`,
            },
          },
          {
            type: "button" as const,
            style: "secondary",
            height: "sm",
            action: {
              type: "uri" as const,
              label: "ปฏิเสธ",
              uri: `${acceptUrl}&action=decline`,
            },
          },
        ],
      },
    },
  };
}
