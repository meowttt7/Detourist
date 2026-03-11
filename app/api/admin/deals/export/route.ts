import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { getAllDeals } from "@/lib/deal-store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const deals = await getAllDeals();
  const fileName = `detourist-deals-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), count: deals.length, deals }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
