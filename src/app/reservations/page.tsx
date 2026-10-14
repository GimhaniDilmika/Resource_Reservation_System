"use client";

import { useState, useEffect } from "react";
import Navbar, { UserSession } from "@/components/Navbar";
import BookingModal from "@/components/BookingModal";
import { format } from "date-fns";
import {
  Calendar,
  Search,
  PlusCircle,
  XCircle,
  CheckCircle2,
  Clock,
  Layers,
  User,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface ReservationItem {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED";
  resource: {
    id: string;
    name: string;
    location: string;
    category: { name: string };
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tab, setTab] = useState<"ALL" | "MINE">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Cancelling State
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [userRes, resRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(
          `/api/reservations?${tab === "MINE" ? "mine=true&" : ""}${
            statusFilter !== "ALL" ? `status=${statusFilter}&` : ""
          }${search ? `search=${encodeURIComponent(search)}&` : ""}`
        ),
      ]);

      const userData = await userRes.json();
      const reservationsData = await resRes.json();

      setCurrentUser(userData.user);
      if (reservationsData.reservations) {
        setReservations(reservationsData.reservations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tab, statusFilter, search]);

  async function handleCancelReservation(resId: string, title: string) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the reservation "${title}"? This will immediately free up the slot for other members while preserving audit history.`
    );
    if (!confirmed) return;

    setCancellingId(resId);
    try {
      const res = await fetch(`/api/reservations/${resId}/cancel`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || "Failed to cancel reservation");
        return;
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar onOpenBookingModal={() => setIsBookingOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Reservation Management & Audit
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">System Bookings & Schedules</h1>
            <p className="text-xs text-slate-400">View confirmed reservations, audit soft cancellations, and coordinate facility usage.</p>
          </div>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            New Reservation
          </button>
        </div>

        {/* Filters and Search */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab switch: All / Mine */}
            <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              <button
                onClick={() => setTab("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === "ALL"
                    ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Bookings
              </button>
              <button
                onClick={() => setTab("MINE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === "MINE"
                    ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                My Bookings Only
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, notes, resource or user name..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
              {["ALL", "CONFIRMED", "CANCELLED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    statusFilter === status
                      ? "bg-slate-700 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {status === "ALL" ? "All Status" : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reservations Feed */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800 space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No reservations found</h3>
            <p className="text-xs text-slate-500">There are no records matching the selected criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((b) => {
              const isConfirmed = b.status === "CONFIRMED";
              const canCancel =
                isConfirmed &&
                (currentUser?.role === "ADMIN" || currentUser?.id === b.user.id);

              return (
                <div
                  key={b.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isConfirmed
                      ? "glass-card border-slate-800/80"
                      : "bg-slate-950/40 border-slate-900 opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                          {b.resource.category.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConfirmed ? "badge-confirmed" : "badge-cancelled"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{b.title}</h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                        <span className="font-semibold text-cyan-400 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {b.resource.name} ({b.resource.location})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {b.user.name} ({b.user.role})
                        </span>
                      </div>

                      {b.notes && (
                        <p className="text-xs text-slate-400 italic pt-1">
                          &ldquo;{b.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-200 font-mono">
                          {format(new Date(b.startTime), "EEE, MMM d, yyyy")}
                        </div>
                        <div className="text-xs font-mono text-cyan-400">
                          {format(new Date(b.startTime), "HH:mm")} – {format(new Date(b.endTime), "HH:mm")}
                        </div>
                      </div>

                      {canCancel && (
                        <button
                          onClick={() => handleCancelReservation(b.id, b.title)}
                          disabled={cancellingId === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/50 hover:bg-red-900/60 text-red-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          {cancellingId === b.id ? "Cancelling..." : "Cancel Booking"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
