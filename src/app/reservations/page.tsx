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
  Layers,
  User,
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar onOpenBookingModal={() => setIsBookingOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100/70 border border-cyan-200 text-cyan-800 text-xs font-semibold mb-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Reservation Management & Audit
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Bookings & Schedules</h1>
            <p className="text-xs text-slate-600">View confirmed reservations, audit soft cancellations, and coordinate facility usage.</p>
          </div>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            New Reservation
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab switch: All / Mine */}
            <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
              <button
                onClick={() => setTab("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Bookings
              </button>
              <button
                onClick={() => setTab("MINE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === "MINE"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
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
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              {["ALL", "CONFIRMED", "CANCELLED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    statusFilter === status
                      ? "bg-white text-slate-900 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
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
          <div className="py-16 text-center text-xs text-slate-500">Loading reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No reservations found</h3>
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
                      ? "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                      : "bg-slate-50/70 border-slate-200/60 opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
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

                      <h3 className="text-base font-bold text-slate-900">{b.title}</h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="font-semibold text-cyan-700 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {b.resource.name} ({b.resource.location})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {b.user.name} ({b.user.role})
                        </span>
                      </div>

                      {b.notes && (
                        <p className="text-xs text-slate-500 italic pt-1">
                          &ldquo;{b.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800 font-mono">
                          {format(new Date(b.startTime), "EEE, MMM d, yyyy")}
                        </div>
                        <div className="text-xs font-mono text-cyan-700 font-semibold">
                          {format(new Date(b.startTime), "HH:mm")} – {format(new Date(b.endTime), "HH:mm")}
                        </div>
                      </div>

                      {canCancel && (
                        <button
                          onClick={() => handleCancelReservation(b.id, b.title)}
                          disabled={cancellingId === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
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
