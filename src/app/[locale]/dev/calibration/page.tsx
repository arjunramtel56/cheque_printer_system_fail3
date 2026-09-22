import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CalibrationTool from "@/components/dev/calibration-tool";

export const metadata: Metadata = {
  title: "Print Calibration (dev)",
  robots: { index: false, follow: false },
};

export default function CalibrationPage() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_CALIBRATION === "true";

  if (!enabled) {
    notFound();
  }

  return <CalibrationTool />;
}
