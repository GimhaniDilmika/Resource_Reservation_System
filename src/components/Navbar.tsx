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
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                PrimeWave <span className="text-cyan-400 font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">Core</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Resource Reservation System</p>
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
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
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              New Booking
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* Demo Switcher Quick Pill */}
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 p-1 rounded-lg text-xs">
                <span className="text-slate-400 text-[11px] px-1.5">Switch Demo:</span>
                <button
                  onClick={() => quickSwitch("admin@primewave.com")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    currentUser.role === "ADMIN"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => quickSwitch("user@primewave.com")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    currentUser.role === "USER"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  User
                </button>
              </div>

              {/* User badge */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentUser.role === "ADMIN" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                }`}>
                  {currentUser.role === "ADMIN" ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-none">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">{currentUser.role}</div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Log In
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
