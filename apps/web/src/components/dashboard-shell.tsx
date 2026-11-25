
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Visão geral", icon: "◫" },
  { href: "/indicadores", label: "Indicadores", icon: "▤" },
  { href: "/comparativos", label: "Comparativos", icon: "⇄" },
  { href: "/usuario", label: "Minha conta", icon: "◎" },
];

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-green-50 md:flex">
      <aside className="w-full bg-green-800 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="border-b border-white/15 px-6 py-7">
          <h1 className="text-xl font-bold">Indicadores CI</h1>
          <p className="mt-1 text-xs text-green-100">
            Campo Mourão - PR
          </p>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-4 md:flex-col">
          {links.map((link) => {
            const ativo = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  ativo
                    ? "bg-lime-400 text-green-950 shadow-md"
                    : "text-green-50 hover:bg-green-700 hover:text-white"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
