"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { notificationPrefs } from "@/lib/mock-data";

export default function NotificationsPage() {
  type PrefKey = "email" | "inApp" | "push";
  const [prefs,  setPrefs]  = useState(notificationPrefs);
  const [saving, setSaving] = useState(false);

  function toggle(id: string, key: PrefKey) {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: !p[key as keyof typeof p] } : p))
    );
  }

  async function save() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast.success("Notification preferences saved");
  }

  const categories = [...new Set(prefs.map((p) => p.category))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how and when WaveStack notifies you.</CardDescription>
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-[1fr_80px_80px_80px] gap-2 px-1">
          <span />
          <span className="text-center text-xs font-medium text-muted-foreground">Email</span>
          <span className="text-center text-xs font-medium text-muted-foreground">In-app</span>
          <span className="text-center text-xs font-medium text-muted-foreground">Push</span>
        </div>
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                {cat}
              </p>
              <div className="space-y-1">
                {prefs.filter((p) => p.category === cat).map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm">{p.label}</span>
                    {(["email", "inApp", "push"] as PrefKey[]).map((key) => (
                      <div key={key} className="flex justify-center">
                        <Switch
                          checked={p[key] as boolean}
                          onCheckedChange={() => toggle(p.id, key)}
                          className="scale-90"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
