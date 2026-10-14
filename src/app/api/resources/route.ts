import { NextRequest, NextResponse } from "next/server";
import { listResources, createResource, listCategories } from "@/lib/services/resource.service";
import { resourceSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const search = searchParams.get("search") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;

    const [resources, categories] = await Promise.all([
      listResources({ categoryId, search, isActive }),
      listCategories(),
    ]);

    return NextResponse.json({ resources, categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const validatedData = resourceSchema.parse(body);
    const newResource = await createResource(validatedData);
    return NextResponse.json(newResource, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
