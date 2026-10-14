"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertTriangle, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { format, addHours, addMinutes } from "date-fns";

interface ResourceOption {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialResourceId?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  onSuccess,
  initialResourceId,
  initialDate,
  initialStartTime,
  initialEndTime,
}: BookingModalProps) {
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [resourceId, setResourceId] = useState(initialResourceId || "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [date, setDate] = useState(initialDate || "");
  const [startTime, setStartTime] = useState(initialStartTime || "");
  const [endTime, setEndTime] = useState(initialEndTime || "");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    if (!date) {
      const now = new Date();
      setDate(initialDate || format(now, "yyyy-MM-dd"));
      setStartTime(initialStartTime || format(addHours(now, 1), "HH:00"));
      setEndTime(initialEndTime || format(addHours(now, 2), "HH:00"));
    }
  }, [initialDate, initialStartTime, initialEndTime, date]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/resources?isActive=true")
        .then((r) => r.json())
        .then((d) => {
          if (d.resources) {
            setResources(d.resources);
            if (!resourceId && d.resources.length > 0) {
              setResourceId(initialResourceId || d.resources[0].id);
            }
          }
        });
    }
  }, [isOpen, initialResourceId]);

  useEffect(() => {
    if (initialResourceId) setResourceId(initialResourceId);
    if (initialDate) setDate(initialDate);
    if (initialStartTime) setStartTime(initialStartTime);
    if (initialEndTime) setEndTime(initialEndTime);
    setErrorMsg(null);
    setSuggestedSlot(null);
  }, [initialResourceId, initialDate, initialStartTime, initialEndTime, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuggestedSlot(null);

    try {
      const fullStart = new Date(`${date}T${startTime}:00`).toISOString();
      const fullEnd = new Date(`${date}T${endTime}:00`).toISOString();

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          title,
          notes: notes || undefined,
          startTime: fullStart,
          endTime: fullEnd,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "Failed to create reservation");
        if (data.error?.details?.nextFreeSlot) {
          setSuggestedSlot({
            start: data.error.details.nextFreeSlot.start,
            end: data.error.details.nextFreeSlot.end,
          });
        }
        return;
      }

      onSuccess();
      onClose();
      setTitle("");
      setNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function applySuggestedSlot() {
    if (!suggestedSlot) return;
    const s = new Date(suggestedSlot.start);
    const e = new Date(suggestedSlot.end);
    setDate(format(s, "yyyy-MM-dd"));
    setStartTime(format(s, "HH:mm"));
    setEndTime(format(e, "HH:mm"));
    setErrorMsg(null);
    setSuggestedSlot(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              New Reservation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Book shared facility with automated conflict protection</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium leading-relaxed">{errorMsg}</p>
                {suggestedSlot && (
                  <button
                    type="button"
                    onClick={applySuggestedSlot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
                  >
                    <span>Use Suggested Slot ({format(new Date(suggestedSlot.start), "MMM d, HH:mm")} - {format(new Date(suggestedSlot.end), "HH:mm")})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Resource Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Resource *</label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="" disabled>Choose a resource...</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.location}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reservation Title / Purpose *</label>
            <input
              type="text"
              required
              minLength={3}
              placeholder="e.g. Sprint Architecture Review or Client Demo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-500 transition-colors"
            />
          </div>

          {/* Date and Time slots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Additional Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Special AV equipment requirements, guest count, projector setup"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying & Reserving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Reservation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
