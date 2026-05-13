"use client";

import React from "react";
import { STATUS_MAP } from "./utils";

export default function StatusPill({ status }: { status: string }) {
  const [cls, lbl] = (STATUS_MAP as any)[status] || ["sp-healthy", "—"];
  return <span className={`status-pill ${cls}`}>{lbl}</span>;
}
