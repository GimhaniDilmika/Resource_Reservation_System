import { describe, it, expect } from "vitest";
import { doIntervalsOverlap } from "../src/lib/services/reservation.service";
import { reservationSchema } from "../src/lib/validators";

describe("Reservation Overlap Logic (doIntervalsOverlap)", () => {
  const existingStart = new Date("2026-10-15T10:00:00.000Z");
  const existingEnd = new Date("2026-10-15T12:00:00.000Z");

  it("detects exact overlap", () => {
    const newStart = new Date("2026-10-15T10:00:00.000Z");
    const newEnd = new Date("2026-10-15T12:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it("detects partial overlap starting before and ending during existing booking", () => {
    const newStart = new Date("2026-10-15T09:30:00.000Z");
    const newEnd = new Date("2026-10-15T10:30:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it("detects partial overlap starting during and ending after existing booking", () => {
    const newStart = new Date("2026-10-15T11:30:00.000Z");
    const newEnd = new Date("2026-10-15T13:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it("detects contained booking (inside existing booking)", () => {
    const newStart = new Date("2026-10-15T10:30:00.000Z");
    const newEnd = new Date("2026-10-15T11:30:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it("detects containing booking (engulfs existing booking)", () => {
    const newStart = new Date("2026-10-15T09:00:00.000Z");
    const newEnd = new Date("2026-10-15T13:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it("allows back-to-back bookings where new ends exactly when existing starts", () => {
    const newStart = new Date("2026-10-15T09:00:00.000Z");
    const newEnd = new Date("2026-10-15T10:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
  });

  it("allows back-to-back bookings where new starts exactly when existing ends", () => {
    const newStart = new Date("2026-10-15T12:00:00.000Z");
    const newEnd = new Date("2026-10-15T13:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
  });

  it("allows bookings completely before existing window", () => {
    const newStart = new Date("2026-10-15T07:00:00.000Z");
    const newEnd = new Date("2026-10-15T08:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
  });

  it("allows bookings completely after existing window", () => {
    const newStart = new Date("2026-10-15T14:00:00.000Z");
    const newEnd = new Date("2026-10-15T16:00:00.000Z");
    expect(doIntervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
  });
});

describe("Reservation Input Validation (Zod Schema)", () => {
  const futureBase = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future

  it("rejects booking where end time is before start time", () => {
    const start = new Date(futureBase.getTime() + 60 * 60 * 1000).toISOString();
    const end = new Date(futureBase.getTime()).toISOString();

    const result = reservationSchema.safeParse({
      resourceId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Design Review",
      startTime: start,
      endTime: end,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("End time must be strictly after start time");
    }
  });

  it("rejects booking where end time equals start time", () => {
    const start = new Date(futureBase.getTime()).toISOString();

    const result = reservationSchema.safeParse({
      resourceId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Design Review",
      startTime: start,
      endTime: start,
    });

    expect(result.success).toBe(false);
  });

  it("rejects booking in the past", () => {
    const pastStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

    const result = reservationSchema.safeParse({
      resourceId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Past Meeting",
      startTime: pastStart,
      endTime: pastEnd,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Reservations cannot be made in the past");
    }
  });

  it("rejects booking exceeding maximum duration of 12 hours", () => {
    const start = new Date(futureBase.getTime()).toISOString();
    const end = new Date(futureBase.getTime() + 14 * 60 * 60 * 1000).toISOString(); // 14 hours

    const result = reservationSchema.safeParse({
      resourceId: "123e4567-e89b-12d3-a456-426614174000",
      title: "All Night Workshop",
      startTime: start,
      endTime: end,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("A single reservation cannot exceed 12 hours");
    }
  });

  it("accepts a valid future reservation within duration limits", () => {
    const start = new Date(futureBase.getTime()).toISOString();
    const end = new Date(futureBase.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const result = reservationSchema.safeParse({
      resourceId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Valid Team Standup",
      startTime: start,
      endTime: end,
    });

    expect(result.success).toBe(true);
  });
});
