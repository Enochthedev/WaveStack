"use client";

import { toast } from "sonner";
import { useBillingInfo, useInvoices } from "@/lib/hooks/use-billing";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";
import { Sensitive } from "@/lib/streamer-mode";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function PlanSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4 animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
          <div className="h-8 w-24 rounded bg-muted" />
        </div>
        <Separator />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-1.5 w-full rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { data: bi, isLoading: biLoading, isError: biError } = useBillingInfo();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ limit: 20 });

  const invoices = invoicesData?.data ?? [];

  if (biError) {
    return <EmptyState preset="offline" subtitle="Could not load billing info." />;
  }

  if (biLoading) {
    return (
      <div className="space-y-6">
        <PlanSkeleton />
        <Card>
          <CardContent className="pt-6 animate-pulse space-y-3">
            <div className="h-10 w-full rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bi) {
    return (
      <EmptyState
        preset="generic"
        title="No billing info"
        subtitle="Set up a plan to view billing details."
        size="lg"
      />
    );
  }

  const usageRows = [
    {
      label: "Active Agents",
      used: bi.usage?.agents?.used ?? 0,
      limit: bi.usage?.agents?.limit ?? 1,
      unit: "",
    },
    {
      label: "Clips this month",
      used: bi.usage?.clips?.used ?? 0,
      limit: bi.usage?.clips?.limit ?? 1,
      unit: "",
    },
    {
      label: "Storage",
      used: bi.usage?.storage?.used ?? 0,
      limit: bi.usage?.storage?.limit ?? 1,
      unit: " GB",
    },
    {
      label: "Team Seats",
      used: bi.usage?.teamSeats?.used ?? 0,
      limit: bi.usage?.teamSeats?.limit ?? 1,
      unit: "",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{bi.plan}</p>
                <Badge className="bg-primary/15 text-primary border-primary/20">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                <Sensitive>${bi.price}/month</Sensitive>
                {bi.nextBillingAt && <> · renews {relDate(bi.nextBillingAt)}</>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Plan management coming soon")}
            >
              Manage plan
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            {usageRows.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">
                    {row.used}
                    {row.unit} / {row.limit}
                    {row.unit}
                  </span>
                </div>
                <Progress value={(row.used / row.limit) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {bi.paymentMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded border bg-muted text-sm font-bold">
                  {bi.paymentMethod.brand}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    •••• •••• •••• <Sensitive>{bi.paymentMethod.last4}</Sensitive>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires <Sensitive>{bi.paymentMethod.expiresAt}</Sensitive>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Payment update coming soon")}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {invoicesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-5 w-16 rounded bg-muted" />
              </div>
            ))
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No invoices yet.</p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    <Sensitive>${inv.amount}</Sensitive>
                  </p>
                  <p className="text-xs text-muted-foreground">{relDate(inv.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                  >
                    {inv.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    onClick={() => toast.success(`Downloading invoice ${inv.id}`)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
