"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Calendar,
  Layers,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
  PlusCircle,
  Sparkles,
} from "lucide-react";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface NavbarProps {
  onOpenBookingModal?: () => void;
}

export default function Navbar({ onOpenBookingModal }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    router.push("/login");
    router.refresh();
  }

  async function quickSwitch(email: string) {
    try {
      const password = email.startsWith("admin") ? "admin123" : "user123";
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      fetchUser();
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/resources", label: "Resources", icon: Layers },
    { href: "/reservations", label: "Reservations", icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                PrimeWave <span className="text-cyan-700 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200">Core</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">Resource Reservation System</p>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-cyan-50 text-cyan-800 border border-cyan-200/80 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions & Auth */}
        <div className="flex items-center gap-3">
          {onOpenBookingModal && (
            <button
              onClick={onOpenBookingModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Booking
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Demo Switcher Quick Pill */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-lg text-xs">
                <span className="text-slate-500 text-[11px] px-1.5 font-medium">Switch Demo:</span>
                <button
                  onClick={() => quickSwitch("admin@primewave.com")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    currentUser.role === "ADMIN"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => quickSwitch("user@primewave.com")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    currentUser.role === "USER"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  User
                </button>
              </div>

              {/* User badge */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentUser.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-cyan-100 text-cyan-800"
                }`}>
                  {currentUser.role === "ADMIN" ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-none">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono leading-none mt-0.5">{currentUser.role}</div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Log In
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
