import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { getAdminHealthSnapshot } from "@/lib/admin-health";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const snapshot = await getAdminHealthSnapshot();
  return NextResponse.json(snapshot, { status: 200 });
}