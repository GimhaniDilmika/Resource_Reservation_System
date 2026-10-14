"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Clock, Calendar, CheckCircle, AlertCircle, Sparkles } from "lucide-react";

interface BookedSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  user: { id: string; name: string; email: string };
}

interface FreeSlot {
  start: string;
  end: string;
  durationMinutes: number;
}

interface AvailabilityData {
  resource: { id: string; name: string; location: string };
  date: string;
  businessHours: { start: string; end: string };
  bookedSlots: BookedSlot[];
  freeSlots: FreeSlot[];
}

interface AvailabilityTimelineProps {
  resourceId: string;
  resourceName?: string;
  onBookSlot?: (date: string, startTime: string, endTime: string) => void;
}

export default function AvailabilityTimeline({
  resourceId,
  resourceName,
  onBookSlot,
}: AvailabilityTimelineProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!resourceId || !selectedDate) return;
    setLoading(true);
    fetch(`/api/availability?resourceId=${resourceId}&date=${selectedDate}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
      })
      .catch((err) => console.error("Error fetching availability:", err))
      .finally(() => setLoading(false));
  }, [resourceId, selectedDate]);

  // Business hours are 08:00 to 18:00 (10 hours total = 600 minutes)
  const totalDayMinutes = 600;
  const dayStartHour = 8;

  function getMinuteOffset(isoString: string): number {
    const d = new Date(isoString);
    // Convert to UTC/local representation
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const totalMins = h * 60 + m;
    const startMins = dayStartHour * 60;
    return Math.max(0, Math.min(totalDayMinutes, totalMins - startMins));
  }

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Availability Timeline (08:00 – 18:00)
          </h3>
          <p className="text-xs text-slate-400">
            {resourceName ? `Real-time schedule for ${resourceName}` : "Choose a date to view reservations"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading availability schedule...</div>
      ) : data ? (
        <div className="space-y-4">
          {/* Visual Progress Bar Timeline */}
          <div className="relative w-full h-14 bg-slate-950/80 rounded-xl border border-slate-800 p-1.5 overflow-hidden">
            {/* Background hour grid indicators */}
            <div className="absolute inset-0 grid grid-cols-10 pointer-events-none opacity-20">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border-r border-slate-600 h-full" />
              ))}
            </div>

            {/* Booked blocks rendered inside bar */}
            {data.bookedSlots.map((slot) => {
              const startOffset = getMinuteOffset(slot.startTime);
              const endOffset = getMinuteOffset(slot.endTime);
              const widthPct = Math.max(3, ((endOffset - startOffset) / totalDayMinutes) * 100);
              const leftPct = (startOffset / totalDayMinutes) * 100;

              return (
                <div
                  key={slot.id}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${slot.title} (${format(new Date(slot.startTime), "HH:mm")} - ${format(
                    new Date(slot.endTime),
                    "HH:mm"
                  )} by ${slot.user.name})`}
                  className="absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-rose-500/80 to-red-600/80 border border-red-400/50 flex items-center px-2 text-white text-[10px] font-semibold truncate shadow-md z-10 cursor-help"
                >
                  <span className="truncate">{slot.title}</span>
                </div>
              );
            })}
          </div>

          {/* Time markers (08:00 to 18:00) */}
          <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span>14:00</span>
            <span>16:00</span>
            <span>18:00</span>
          </div>

          {/* List of Free and Booked Slots for the Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Free slots */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Available Slots (Click to Reserve)
              </h4>
              {data.freeSlots.length === 0 ? (
                <p className="text-[11px] text-slate-400">No free slots remaining on this day.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.freeSlots.map((fs, idx) => {
                    const startH = format(new Date(fs.start), "HH:mm");
                    const endH = format(new Date(fs.end), "HH:mm");
                    return (
                      <button
                        key={idx}
                        onClick={() => onBookSlot && onBookSlot(selectedDate, startH, endH)}
                        className="px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/60 text-emerald-300 text-xs font-mono transition-all hover:scale-105 active:scale-95"
                      >
                        {startH} - {endH} ({fs.durationMinutes}m)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Booked slots */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Confirmed Reservations ({data.bookedSlots.length})
              </h4>
              {data.bookedSlots.length === 0 ? (
                <p className="text-[11px] text-slate-400">No reservations currently booked for this day.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {data.bookedSlots.map((b) => (
                    <div
                      key={b.id}
                      className="text-[11px] p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-200">{b.title}</span>
                        <span className="text-slate-400 ml-1.5">({b.user.name})</span>
                      </div>
                      <span className="font-mono text-slate-300 shrink-0">
                        {format(new Date(b.startTime), "HH:mm")} - {format(new Date(b.endTime), "HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
