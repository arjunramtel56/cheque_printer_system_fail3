"use client";

import Link from "next/link";
import Workspace from "@/components/Workspace";

export default function HomePage() {
  return (
    <>
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100 }}>
        <Link href="/admin" className="text-button" style={{ fontSize: "0.78rem", opacity: 0.6 }} aria-label="Admin panel">
          Admin
        </Link>
      </div>
      <Workspace />
    </>
  );
}
