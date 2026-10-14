import { NextRequest, NextResponse } from "next/server";
import { getResourceById, updateResource } from "@/lib/services/resource.service";
import { updateResourceSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resource = await getResourceById(id);
    return NextResponse.json(resource);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateResourceSchema.parse(body);
    const updated = await updateResource(id, validatedData);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
