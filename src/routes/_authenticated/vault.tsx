import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LockKeyhole, ShieldCheck, Trash2, Unlock, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultCard } from "@/components/ResultCard";
import { supabase } from "@/integrations/supabase/client";
import {
  createVault,
  deleteReport,
  getVaultSettings,
  listReports,
  openReport,
  unlockVault,
  type ReportPayload,
  type VaultReportMeta,
} from "@/lib/vault";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Vault — Encrypted analysis reports | Vesta" },
      {
        name: "description",
        content:
          "Your sealed analysis reports, encrypted with a password only you know and locked automatically when your session ends.",
      },
      { property: "og:title", content: "Vault — Encrypted analysis reports" },
      {
        property: "og:description",
        content: "Password-protected, end-to-end encrypted report storage inside Vesta.",
      },
    ],
  }),
  component: VaultPage;
});

function VaultPage() {
  return null;
}
