import { db } from "../db";
import { ConflictError, NotFoundError, ForbiddenError, AppError } from "../errors";
import { ReservationInput } from "../validators";
import { ReservationStatus, Role } from "@prisma/client";
import { addMinutes, format, isAfter, isBefore, parseISO, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

export interface ListReservationsParams {
  resourceId?: string;
  userId?: string;
  status?: ReservationStatus;
  from?: Date;
  to?: Date;
  search?: string;
}

export function doIntervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  // Overlap condition: startA < endB AND endA > startB
  // Note: If startA >= endB or endA <= startB, they do NOT overlap (back-to-back allowed)
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export async function findConflictingReservation(
  resourceId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string
) {
  const conflicts = await db.reservation.findMany({
    where: {
      resourceId,
      status: ReservationStatus.CONFIRMED,
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    include: {
      user: { select: { name: true, email: true } },
      resource: { select: { name: true } },
    },
    take: 1,
  });

  return conflicts[0] || null;
}

export async function findNextAvailableSlot(
  resourceId: string,
  afterTime: Date,
  desiredDurationMinutes: number
): Promise<{ start: Date; end: Date } | null> {
  // Look forward up to 3 days to find a free business-hour window
  const businessStartHour = 8;
  const businessEndHour = 18;

  let searchDate = new Date(afterTime);

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const dayStart = setMilliseconds(setSeconds(setMinutes(setHours(searchDate, businessStartHour), 0), 0), 0);
    const dayEnd = setMilliseconds(setSeconds(setMinutes(setHours(searchDate, businessEndHour), 0), 0), 0);

    const checkFrom = isAfter(searchDate, dayStart) ? searchDate : dayStart;

    if (isBefore(checkFrom, dayEnd)) {
      // Fetch confirmed bookings for this day
      const existing = await db.reservation.findMany({
        where: {
          resourceId,
          status: ReservationStatus.CONFIRMED,
          startTime: { lt: dayEnd },
          endTime: { gt: checkFrom },
        },
        orderBy: { startTime: "asc" },
      });

      let candidateStart = checkFrom;

      for (const res of existing) {
        if (candidateStart.getTime() + desiredDurationMinutes * 60 * 1000 <= res.startTime.getTime()) {
          // Found free gap before this booking
          return {
            start: candidateStart,
            end: addMinutes(candidateStart, desiredDurationMinutes),
          };
        }
        if (isAfter(res.endTime, candidateStart)) {
          candidateStart = res.endTime;
        }
      }

      // Check remaining time after last booking until business day end
      if (candidateStart.getTime() + desiredDurationMinutes * 60 * 1000 <= dayEnd.getTime()) {
        return {
          start: candidateStart,
          end: addMinutes(candidateStart, desiredDurationMinutes),
        };
      }
    }

    // Move to next day 08:00
    searchDate = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000);
    searchDate = setHours(searchDate, businessStartHour);
    searchDate = setMinutes(searchDate, 0);
  }

  return null;
}

export async function createReservation(userId: string, data: ReservationInput) {
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  // 1. Verify resource exists and is active
  const resource = await db.resource.findUnique({
    where: { id: data.resourceId },
  });

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  if (!resource.isActive) {
    throw new AppError("This resource is currently deactivated and cannot accept new bookings", "BAD_REQUEST", 400);
  }

  // 2. Application-level overlap check (for immediate descriptive feedback)
  const existingConflict = await findConflictingReservation(data.resourceId, startTime, endTime);
  if (existingConflict) {
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
    const nextFree = await findNextAvailableSlot(data.resourceId, existingConflict.endTime, durationMinutes);

    let conflictMessage = `The resource "${resource.name}" is already booked by ${existingConflict.user.name} from ${format(
      existingConflict.startTime,
      "HH:mm"
    )} to ${format(existingConflict.endTime, "HH:mm")}.`;

    if (nextFree) {
      conflictMessage += ` The next available slot is at ${format(nextFree.start, "yyyy-MM-dd HH:mm")}.`;
    }

    throw new ConflictError(conflictMessage, {
      conflictReservationId: existingConflict.id,
      nextFreeSlot: nextFree,
    });
  }

  // 3. Database insertion with exclusion constraint safeguard
  try {
    return await db.reservation.create({
      data: {
        resourceId: data.resourceId,
        userId,
        title: data.title,
        notes: data.notes,
        startTime,
        endTime,
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        resource: { select: { id: true, name: true, location: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  } catch (err: any) {
    // Catch PostgreSQL exclusion constraint code 23P01
    if (err?.code === "P2010" || err?.code === "23P01" || (err?.message && err.message.includes("no_overlapping_reservations"))) {
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
      const nextFree = await findNextAvailableSlot(data.resourceId, endTime, durationMinutes);
      throw new ConflictError(
        `Concurrent booking conflict: "${resource.name}" was just reserved by another user for this time window. ${
          nextFree ? `Next available slot is ${format(nextFree.start, "yyyy-MM-dd HH:mm")}.` : ""
        }`,
        { nextFreeSlot: nextFree }
      );
    }
    throw err;
  }
}

export async function listReservations(params: ListReservationsParams = {}) {
  const { resourceId, userId, status, from, to, search } = params;

  const where: any = {};

  if (resourceId) where.resourceId = resourceId;
  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (from || to) {
    where.AND = [];
    if (from) where.AND.push({ endTime: { gte: from } });
    if (to) where.AND.push({ startTime: { lte: to } });
  }

  if (search && search.trim() !== "") {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { resource: { name: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  return await db.reservation.findMany({
    where,
    include: {
      resource: {
        include: { category: true },
      },
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { startTime: "desc" },
  });
}

export async function cancelReservation(reservationId: string, currentUserId: string, currentUserRole: Role) {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: true },
  });

  if (!reservation) {
    throw new NotFoundError("Reservation not found");
  }

  // Only the owner or an admin can cancel
  if (currentUserRole !== Role.ADMIN && reservation.userId !== currentUserId) {
    throw new ForbiddenError("You can only cancel your own reservations");
  }

  if (reservation.status === ReservationStatus.CANCELLED) {
    throw new AppError("Reservation is already cancelled", "BAD_REQUEST", 400);
  }

  // Soft cancel: preserve audit history while instantly freeing the exclusion constraint slot
  return await db.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.CANCELLED,
      cancelledAt: new Date(),
    },
    include: {
      resource: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getResourceAvailability(resourceId: string, dateStr: string) {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: { category: true },
  });

  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  // Target date business hours: 08:00 to 18:00
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayStart = new Date(Date.UTC(year, month - 1, day, 8, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 18, 0, 0));

  // Fetch confirmed reservations overlapping this day
  const bookings = await db.reservation.findMany({
    where: {
      resourceId,
      status: ReservationStatus.CONFIRMED,
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startTime: "asc" },
  });

  // Calculate free slots within 08:00 - 18:00
  const freeSlots: { start: string; end: string; durationMinutes: number }[] = [];
  let currentPointer = dayStart;

  for (const b of bookings) {
    const bookingStart = b.startTime < dayStart ? dayStart : b.startTime;
    const bookingEnd = b.endTime > dayEnd ? dayEnd : b.endTime;

    if (bookingStart.getTime() > currentPointer.getTime()) {
      const freeDuration = Math.round((bookingStart.getTime() - currentPointer.getTime()) / (60 * 1000));
      if (freeDuration >= 15) {
        freeSlots.push({
          start: currentPointer.toISOString(),
          end: bookingStart.toISOString(),
          durationMinutes: freeDuration,
        });
      }
    }

    if (bookingEnd.getTime() > currentPointer.getTime()) {
      currentPointer = bookingEnd;
    }
  }

  if (currentPointer.getTime() < dayEnd.getTime()) {
    const freeDuration = Math.round((dayEnd.getTime() - currentPointer.getTime()) / (60 * 1000));
    if (freeDuration >= 15) {
      freeSlots.push({
        start: currentPointer.toISOString(),
        end: dayEnd.toISOString(),
        durationMinutes: freeDuration,
      });
    }
  }

  return {
    resource,
    date: dateStr,
    businessHours: {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    },
    bookedSlots: bookings.map((b) => ({
      id: b.id,
      title: b.title,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      user: b.user,
    })),
    freeSlots,
  };
}

export async function getDashboardStats() {
  const totalResources = await db.resource.count();
  const activeResources = await db.resource.count({ where: { isActive: true } });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const bookingsToday = await db.reservation.count({
    where: {
      status: ReservationStatus.CONFIRMED,
      startTime: { gte: todayStart, lte: todayEnd },
    },
  });

  const upcomingBookings = await db.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      endTime: { gte: now },
    },
    include: {
      resource: { include: { category: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { startTime: "asc" },
    take: 6,
  });

  // Calculate approximate utilization for today
  // 10 business hours * total active resources = total available capacity in hours
  const businessHoursPerDay = 10;
  const totalCapacityHours = (activeResources || 1) * businessHoursPerDay;

  const todayConfirmed = await db.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      startTime: { gte: todayStart, lte: todayEnd },
    },
  });

  let bookedHours = 0;
  for (const b of todayConfirmed) {
    const duration = (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
    bookedHours += Math.max(0, duration);
  }

  const utilizationRate = Math.min(100, Math.round((bookedHours / totalCapacityHours) * 100));

  return {
    totalResources,
    activeResources,
    bookingsToday,
    utilizationRate,
    upcomingBookings,
  };
}
