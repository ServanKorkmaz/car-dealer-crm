import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Car, 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp,
  Moon,
  Sun,
  LogOut,
  User
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Biler", href: "/cars", icon: Car },
  { name: "Kunder", href: "/customers", icon: Users },
  { name: "Kontrakter", href: "/contracts", icon: FileText },
  { name: "Rapporter", href: "/reports", icon: TrendingUp },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Car className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">ForhandlerPRO</h1>
            </div>
          </Link>
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            ) : (
              <Sun className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
          </Button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg group transition-colors",
                    isActive
                      ? "text-primary bg-primary/10 dark:bg-primary/20"
                      : "text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 w-5 h-5",
                    isActive 
                      ? "text-primary" 
                      : "text-slate-400 group-hover:text-primary"
                  )} />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user && typeof user === 'object' && 'email' in user && user.email ? user.email : "Bruker"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Forhandler
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
