"use client";

import { useState, useEffect } from "react";
import Navbar, { UserSession } from "@/components/Navbar";
import BookingModal from "@/components/BookingModal";
import ResourceModal from "@/components/ResourceModal";
import AvailabilityTimeline from "@/components/AvailabilityTimeline";
import {
  Layers,
  Search,
  Plus,
  MapPin,
  Users,
  Calendar,
  Edit2,
  PowerOff,
  Clock,
} from "lucide-react";

interface Resource {
  id: string;
  name: string;
  categoryId: string;
  location: string;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
  category: { id: string; name: string };
  _count?: { reservations: number };
}

interface Category {
  id: string;
  name: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingResourceId, setBookingResourceId] = useState<string | undefined>();
  const [bookingDate, setBookingDate] = useState<string | undefined>();
  const [bookingStart, setBookingStart] = useState<string | undefined>();
  const [bookingEnd, setBookingEnd] = useState<string | undefined>();

  // Admin Resource Modal (Create / Edit)
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Timeline expanded resource
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [userRes, resourcesRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/resources?${selectedCategory !== "ALL" ? `categoryId=${selectedCategory}&` : ""}${search ? `search=${encodeURIComponent(search)}&` : ""}${showActiveOnly ? "isActive=true" : ""}`),
      ]);

      const userData = await userRes.json();
      const resData = await resourcesRes.json();

      setCurrentUser(userData.user);
      if (resData.resources) setResources(resData.resources);
      if (resData.categories) setCategories(resData.categories);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory, search, showActiveOnly]);

  function handleOpenBooking(resId: string, date?: string, start?: string, end?: string) {
    setBookingResourceId(resId);
    setBookingDate(date);
    setBookingStart(start);
    setBookingEnd(end);
    setIsBookingOpen(true);
  }

  function handleCreateResource() {
    setEditingResource(null);
    setIsResourceModalOpen(true);
  }

  function handleEditResource(res: Resource) {
    setEditingResource(res);
    setIsResourceModalOpen(true);
  }

  async function handleToggleActive(res: Resource) {
    const willDeactivate = res.isActive;
    if (willDeactivate) {
      const confirmed = window.confirm(
        `Are you sure you want to deactivate "${res.name}"? If there are any upcoming confirmed bookings, you will be prompted to cancel them first.`
      );
      if (!confirmed) return;
    }

    try {
      const resp = await fetch(`/api/resources/${res.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !res.isActive }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error?.message || "Failed to update status");
        return;
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred");
    }
  }

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar onOpenBookingModal={() => handleOpenBooking(resources[0]?.id)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100/70 border border-cyan-200 text-cyan-800 text-xs font-semibold mb-1.5">
              <Layers className="w-3.5 h-3.5" />
              Organizational Assets Catalog
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Facility & Equipment Resources</h1>
            <p className="text-xs text-slate-600">Search and reserve rooms, high-compute stations, and equipment with live availability.</p>
          </div>

          {isAdmin && (
            <button
              onClick={handleCreateResource}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources by name, location, or equipment specs..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            {/* Active Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 shrink-0 font-medium">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 border-slate-300"
              />
              <span>Active only</span>
            </label>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === "ALL"
                  ? "bg-cyan-600 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === c.id
                    ? "bg-cyan-600 text-white font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading resources catalog...</div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No resources found</h3>
            <p className="text-xs text-slate-500">Try adjusting your category or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((res) => {
              const isExpanded = expandedResourceId === res.id;
              return (
                <div
                  key={res.id}
                  className={`bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md hover:border-slate-300 ${
                    res.isActive ? "border-slate-200" : "border-slate-200 opacity-60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                        {res.category.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          res.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {res.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{res.name}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {res.description || "No specific instructions provided."}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>{res.location}</span>
                      </div>
                      {res.capacity && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Cap: {res.capacity}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setExpandedResourceId(isExpanded ? null : res.id)}
                        className="flex items-center gap-1.5 text-xs text-cyan-700 hover:text-cyan-800 font-bold"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {isExpanded ? "Hide Schedule" : "View Schedule"}
                      </button>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEditResource(res)}
                              title="Edit Resource"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(res)}
                              title={res.isActive ? "Deactivate" : "Activate"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                res.isActive
                                  ? "bg-slate-100 text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              }`}
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleOpenBooking(res.id)}
                          disabled={!res.isActive}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-2xs active:scale-95 disabled:opacity-40 transition-all"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Book
                        </button>
                      </div>
                    </div>

                    {/* Inline Collapsible Availability Timeline */}
                    {isExpanded && (
                      <div className="pt-2 animate-in fade-in duration-200">
                        <AvailabilityTimeline
                          resourceId={res.id}
                          resourceName={res.name}
                          onBookSlot={(date, start, end) => handleOpenBooking(res.id, date, start, end)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => loadData()}
        initialResourceId={bookingResourceId}
        initialDate={bookingDate}
        initialStartTime={bookingStart}
        initialEndTime={bookingEnd}
      />

      {/* Admin Resource Modal */}
      <ResourceModal
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        onSuccess={() => loadData()}
        categories={categories}
        editingResource={editingResource}
      />
    </div>
  );
}
