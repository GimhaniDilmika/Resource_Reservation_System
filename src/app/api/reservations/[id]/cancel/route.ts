import { NextRequest, NextResponse } from "next/server";
import { cancelReservation } from "@/lib/services/reservation.service";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const cancelled = await cancelReservation(id, session.userId, session.role);
    return NextResponse.json({
      message: "Reservation cancelled successfully",
      reservation: cancelled,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
