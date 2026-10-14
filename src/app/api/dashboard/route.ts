import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/services/reservation.service";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAuth();
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    return handleApiError(err);
  }
}
