"use client";

import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";
import { billingInfo } from "@/lib/mock-data";
import { Sensitive } from "@/lib/streamer-mode";

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function BillingPage() {
  const bi = billingInfo;
  const usageRows = [
    { label: "Active Agents",    used: bi.usage.agents.used,     limit: bi.usage.agents.limit,     unit: ""    },
    { label: "Clips this month", used: bi.usage.clips.used,      limit: bi.usage.clips.limit,      unit: ""    },
    { label: "Storage",          used: bi.usage.storage.used,    limit: bi.usage.storage.limit,    unit: " GB" },
    { label: "Team Seats",       used: bi.usage.teamSeats.used,  limit: bi.usage.teamSeats.limit,  unit: ""    },
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
                <Sensitive>${bi.price}/month</Sensitive> · renews {relDate(bi.nextBillingAt)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info("Plan management coming soon")}>
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
                    {row.used}{row.unit} / {row.limit}{row.unit}
                  </span>
                </div>
                <Progress value={(row.used / row.limit) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded border bg-muted text-sm font-bold">
                {bi.paymentMethod.brand}
              </div>
              <div>
                <p className="text-sm font-medium">•••• •••• •••• <Sensitive>{bi.paymentMethod.last4}</Sensitive></p>
                <p className="text-xs text-muted-foreground">Expires <Sensitive>{bi.paymentMethod.expiresAt}</Sensitive></p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info("Payment update coming soon")}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {bi.invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium"><Sensitive>${inv.amount}.00</Sensitive></p>
                <p className="text-xs text-muted-foreground">{relDate(inv.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                  {inv.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5"
                  onClick={() => toast.success(`Downloading invoice ${inv.id}`)}
                >
                  <Download className="h-3.5 w-3.5" />Download
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
