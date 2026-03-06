export const DESIGN_SHARE_MESSAGE_PREFIX = "[design_share]";

export type DesignSharePayload = {
  type: "design_share";
  text: string;
  designId: string;
  title: string;
  url: string;
  previewImage?: string | null;
};

export function buildDesignShareMessage(payload: Omit<DesignSharePayload, "type">): string {
  return `${DESIGN_SHARE_MESSAGE_PREFIX}${JSON.stringify({
    type: "design_share",
    ...payload,
  })}`;
}

export function parseDesignShareMessage(message: string): DesignSharePayload | null {
  if (!message?.startsWith(DESIGN_SHARE_MESSAGE_PREFIX)) return null;

  const raw = message.slice(DESIGN_SHARE_MESSAGE_PREFIX.length).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DesignSharePayload>;
    if (
      parsed.type !== "design_share" ||
      typeof parsed.text !== "string" ||
      typeof parsed.designId !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.url !== "string"
    ) {
      return null;
    }
    return {
      type: "design_share",
      text: parsed.text,
      designId: parsed.designId,
      title: parsed.title,
      url: parsed.url,
      previewImage: typeof parsed.previewImage === "string" ? parsed.previewImage : null,
    };
  } catch {
    return null;
  }
}
