import { iconImage } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the tensor mark on navy. */
export default function AppleIcon() {
  return iconImage(180);
}
