import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { seedDemoData } from "@/lib/demo-seed";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await seedDemoData();
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not seed demo data." }, { status: 500 });
  }
}
