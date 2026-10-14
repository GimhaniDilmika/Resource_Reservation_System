import { NextRequest, NextResponse } from "next/server";
import { listReservations, createReservation } from "@/lib/services/reservation.service";
import { reservationSchema } from "@/lib/validators";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { ReservationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const resourceId = searchParams.get("resourceId") || undefined;
    const isMine = searchParams.get("mine") === "true";
    const statusParam = searchParams.get("status") as ReservationStatus | null;
    const status = statusParam && Object.values(ReservationStatus).includes(statusParam) ? statusParam : undefined;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const search = searchParams.get("search") || undefined;

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    // Regular users can only see all reservations in general calendar context or filter to mine
    const reservations = await listReservations({
      resourceId,
      userId: isMine ? session.userId : undefined,
      status,
      from,
      to,
      search,
    });

    return NextResponse.json({ reservations });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const validatedData = reservationSchema.parse(body);

    const reservation = await createReservation(session.userId, validatedData);
    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
