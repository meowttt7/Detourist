import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { expireDeal } from "@/lib/deal-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const deal = await expireDeal(id);

  if (!deal) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }

  return NextResponse.json({ deal }, { status: 200 });
}
