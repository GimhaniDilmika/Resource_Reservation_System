import { NextRequest, NextResponse } from "next/server";
import { getResourceAvailability } from "@/lib/services/reservation.service";
import { availabilityQuerySchema } from "@/lib/validators";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {
      resourceId: searchParams.get("resourceId") || "",
      date: searchParams.get("date") || "",
    };

    const validated = availabilityQuerySchema.parse(query);
    const availability = await getResourceAvailability(validated.resourceId, validated.date);
    return NextResponse.json(availability);
  } catch (err) {
    return handleApiError(err);
  }
}
