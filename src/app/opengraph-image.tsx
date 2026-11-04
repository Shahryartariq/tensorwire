import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Tensorwire: today's AI news from the labs and the press";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage("Today's AI news, in one feed", "18 sources, updated every 15 minutes");
}
