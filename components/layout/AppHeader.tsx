"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  match: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    href: "/schedules/new",
    label: "Создать",
    shortLabel: "Создать",
    match: (pathname) => pathname === "/schedules/new",
  },
  {
    href: "/schedules",
    label: "Мои графики",
    shortLabel: "Графики",
    match: (pathname) =>
      pathname === "/schedules" ||
      (pathname.startsWith("/schedules/") && pathname !== "/schedules/new"),
  },
  {
    href: "/employees",
    label: "Сотрудники",
    shortLabel: "Сотрудники",
    match: (pathname) => pathname.startsWith("/employees"),
  },
];

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "border-b border-border bg-surface print:hidden",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-foreground">
          Графики
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          {navItems.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-2 py-1 text-sm transition-colors sm:px-0",
                  isActive
                    ? "font-medium text-primary"
                    : "text-muted hover:text-primary",
                )}
              >
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
