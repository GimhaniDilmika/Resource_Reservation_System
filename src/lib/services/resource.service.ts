import { db } from "../db";
import { NotFoundError, AppError } from "../errors";
import { ResourceInput } from "../validators";

export interface ListResourcesParams {
  categoryId?: string;
  search?: string;
  isActive?: boolean;
}

export async function listResources(params: ListResourcesParams = {}) {
  const { categoryId, search, isActive } = params;

  const where: any = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search && search.trim() !== "") {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const resources = await db.resource.findMany({
    where,
    include: {
      category: true,
      _count: {
        select: {
          reservations: {
            where: {
              status: "CONFIRMED",
              endTime: { gte: new Date() },
            },
          },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return resources;
}

export async function getResourceById(id: string) {
  const resource = await db.resource.findUnique({
    where: { id },
    include: {
      category: true,
      reservations: {
        where: {
          status: "CONFIRMED",
          endTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 10,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!resource) {
    throw new NotFoundError(`Resource with ID ${id} not found`);
  }

  return resource;
}

export async function createResource(data: ResourceInput) {
  const categoryExists = await db.resourceCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!categoryExists) {
    throw new NotFoundError(`Category with ID ${data.categoryId} not found`);
  }

  return await db.resource.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      location: data.location,
      capacity: data.capacity,
      description: data.description,
      isActive: data.isActive ?? true,
    },
    include: { category: true },
  });
}

export async function updateResource(id: string, data: Partial<ResourceInput>) {
  const existing = await db.resource.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Resource with ID ${id} not found`);
  }

  if (data.categoryId) {
    const categoryExists = await db.resourceCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!categoryExists) {
      throw new NotFoundError(`Category with ID ${data.categoryId} not found`);
    }
  }

  // If deactivating, check if there are future confirmed reservations
  if (data.isActive === false && existing.isActive === true) {
    const futureBookingsCount = await db.reservation.count({
      where: {
        resourceId: id,
        status: "CONFIRMED",
        endTime: { gte: new Date() },
      },
    });

    if (futureBookingsCount > 0) {
      throw new AppError(
        `Cannot deactivate resource. It currently has ${futureBookingsCount} upcoming confirmed reservation(s). Cancel or reschedule them before deactivating.`,
        "BAD_REQUEST",
        400
      );
    }
  }

  return await db.resource.update({
    where: { id },
    data,
    include: { category: true },
  });
}

export async function listCategories() {
  return await db.resourceCategory.findMany({
    include: {
      _count: {
        select: { resources: true },
      },
    },
    orderBy: { name: "asc" },
  });
}
