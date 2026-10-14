"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import BookingModal from "@/components/BookingModal";
import AvailabilityTimeline from "@/components/AvailabilityTimeline";
import Link from "next/link";
import { format } from "date-fns";
import {
  Layers,
  Calendar,
  Clock,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

interface DashboardData {
  totalResources: number;
  activeResources: number;
  bookingsToday: number;
  utilizationRate: number;
  upcomingBookings: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    resource: { id: string; name: string; category: { name: string } };
    user: { name: string; email: string };
  }>;
}

interface ResourceItem {
  id: string;
  name: string;
  location: string;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
  category: { id: string; name: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedStart, setSelectedStart] = useState<string | undefined>(undefined);
  const [selectedEnd, setSelectedEnd] = useState<string | undefined>(undefined);

  // Expanded Resource Timeline preview
  const [activeTimelineResourceId, setActiveTimelineResourceId] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, resourcesRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/resources?isActive=true"),
      ]);

      if (statsRes.status === 401) {
        // Not logged in -> quick auto-seed or redirect
        window.location.href = "/login";
        return;
      }

      const statsData = await statsRes.json();
      const resourcesData = await resourcesRes.json();

      setStats(statsData);
      if (resourcesData.resources) {
        setResources(resourcesData.resources);
        if (resourcesData.resources.length > 0 && !activeTimelineResourceId) {
          setActiveTimelineResourceId(resourcesData.resources[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function handleOpenBooking(resId?: string, date?: string, start?: string, end?: string) {
    setSelectedResourceId(resId);
    setSelectedDate(date);
    setSelectedStart(start);
    setSelectedEnd(end);
    setIsBookingOpen(true);
  }

  const activeTimelineResource = resources.find((r) => r.id === activeTimelineResourceId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar onOpenBookingModal={() => handleOpenBooking()} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800/80 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Intelligent Concurrency & Double-Booking Protection Active
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Resource Overview & Operations
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Reserve conference suites, engineering rigs, production gear, and vehicle fleets with instant conflict prevention backed by PostgreSQL exclusion constraints.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleOpenBooking()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Book Resource
              </button>
              <Link
                href="/resources"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Catalog
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Resources</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-white">{stats?.totalResources ?? "—"}</span>
              <span className="text-xs text-slate-400 ml-2 font-medium">
                ({stats?.activeResources ?? "—"} active)
              </span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Bookings Today</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-white">{stats?.bookingsToday ?? "—"}</span>
              <span className="text-xs text-indigo-400 ml-2 font-medium">scheduled</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Utilization Rate</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-white">{stats?.utilizationRate ?? 0}%</span>
              <span className="text-xs text-emerald-400 ml-2 font-medium">daily capacity</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Conflict Engine</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Postgres GIST
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Hardware & OS enforced</p>
            </div>
          </div>
        </div>

        {/* 2-Column: Live Availability Inspector & Upcoming Reservations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Availability Inspector (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Live Resource Availability & Free Slots
                </h2>
                <p className="text-xs text-slate-400">
                  Select a facility or hardware resource to preview availability and click any green slot to book.
                </p>
              </div>
            </div>

            {/* Resource Selector pills */}
            <div className="flex flex-wrap gap-2">
              {resources.map((res) => {
                const isSelected = res.id === activeTimelineResourceId;
                return (
                  <button
                    key={res.id}
                    onClick={() => setActiveTimelineResourceId(res.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 scale-105"
                        : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {res.name}
                  </button>
                );
              })}
            </div>

            {/* Timeline for selected resource */}
            {activeTimelineResourceId && (
              <AvailabilityTimeline
                resourceId={activeTimelineResourceId}
                resourceName={activeTimelineResource?.name}
                onBookSlot={(date, start, end) =>
                  handleOpenBooking(activeTimelineResourceId, date, start, end)
                }
              />
            )}
          </div>

          {/* Upcoming Reservations Feed (1 col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Upcoming Bookings
              </h2>
              <Link href="/reservations" className="text-xs text-cyan-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading bookings...</div>
              ) : stats?.upcomingBookings && stats.upcomingBookings.length > 0 ? (
                stats.upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{b.title}</h4>
                        <span className="text-[11px] text-cyan-400 font-medium">
                          {b.resource.name}
                        </span>
                      </div>
                      <span className="badge-confirmed text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0">
                        {b.status}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{b.user.name}</span>
                      <span className="font-mono text-slate-300">
                        {format(new Date(b.startTime), "MMM d, HH:mm")} -{" "}
                        {format(new Date(b.endTime), "HH:mm")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/50 text-center">
                  <p className="text-xs text-slate-400">No upcoming reservations.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => loadDashboard()}
        initialResourceId={selectedResourceId}
        initialDate={selectedDate}
        initialStartTime={selectedStart}
        initialEndTime={selectedEnd}
      />
    </div>
  );
}
