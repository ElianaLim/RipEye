import { Link, useLocation } from "wouter";
import { Home, Package, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/deliveries", icon: Package, label: "Deliveries" },
    { href: "/history", icon: Clock, label: "History" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/[0.04] via-background to-muted/40">
      <div className="mx-auto w-full max-w-lg min-h-[100dvh] flex flex-col shadow-xl shadow-black/5 bg-background/80 backdrop-blur-sm">
        <main className="flex-1 pb-20">{children}</main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-background/95 backdrop-blur-md border-t border-border/80 pb-safe">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-[10px] font-medium transition-colors rounded-lg mx-0.5",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                      isActive && "bg-primary/10",
                    )}
                  >
                    <item.icon
                      className={cn("w-5 h-5", isActive && "stroke-[2.5]")}
                    />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
