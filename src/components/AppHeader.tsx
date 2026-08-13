import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, LineChart, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ email }: { email?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="font-display text-xl tracking-tight">
          Vesta
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/studio">
              <LineChart className="size-4" /> Studio
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/vault">
              <LockKeyhole className="size-4" /> Vault
            </Link>
          </Button>
          <span className="mx-2 hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
