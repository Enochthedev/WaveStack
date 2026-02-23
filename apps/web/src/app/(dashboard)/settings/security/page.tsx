"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogOut, Loader2, Smartphone, Monitor } from "lucide-react";
import { activeSessions } from "@/lib/mock-data";

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SecurityPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [currentPw,   setCurrentPw]  = useState("");
  const [newPw,       setNewPw]      = useState("");
  const [confirmPw,   setConfirmPw]  = useState("");
  const [twoFA,       setTwoFA]      = useState(false);
  const [saving,      setSaving]     = useState(false);
  const [sessions,    setSessions]   = useState(activeSessions);
  const [revoking,    setRevoking]   = useState<string | null>(null);

  async function updatePassword() {
    if (!currentPw || !newPw || newPw !== confirmPw) {
      toast.error(newPw !== confirmPw ? "Passwords don't match" : "Please fill all fields");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    toast.success("Password updated");
  }

  async function revokeSession(id: string) {
    setRevoking(id);
    await new Promise((r) => setTimeout(r, 600));
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setRevoking(null);
    toast.success("Session revoked");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
              <button
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <button
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={confirmPw && newPw !== confirmPw ? "border-destructive" : ""}
            />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-destructive">Passwords don&apos;t match</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={updatePassword} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Authenticator app (TOTP)</p>
              <p className="text-xs text-muted-foreground">
                {twoFA
                  ? "2FA is active — your account is protected."
                  : "Use Google Authenticator, Authy, or similar."}
              </p>
            </div>
            <Switch
              checked={twoFA}
              onCheckedChange={(v) => {
                setTwoFA(v);
                toast.success(`2FA ${v ? "enabled" : "disabled"}`);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {s.device.includes("iPhone")
                  ? <Smartphone className="h-4 w-4 text-muted-foreground" />
                  : <Monitor className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{s.device}</p>
                  {s.isCurrent && (
                    <Badge className="text-[10px] h-4 py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.browser} · {s.location} · {relTime(s.lastActiveAt)}
                </p>
              </div>
              {!s.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive gap-1.5"
                  disabled={revoking === s.id}
                  onClick={() => revokeSession(s.id)}
                >
                  {revoking === s.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <LogOut className="h-3.5 w-3.5" />}
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
