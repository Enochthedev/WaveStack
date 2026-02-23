"use client";

import { useState } from "react";
import { toast } from "sonner";
import { moderationStats, flaggedItems as initialFlagged, moderationRules as initialRules, moderationLog } from "@/lib/mock-data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, CheckCircle, Clock, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { PlatformIcon } from "@/components/icons/platform-icon";
import { platformLabel } from "@/lib/colors";

type FlaggedItem = (typeof initialFlagged)[number];
type Rule = (typeof initialRules)[number];

const reasonColors: Record<string, string> = {
  spam:         "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  hate_speech:  "bg-red-500/10 text-red-500 border-red-500/20",
  nsfw:         "bg-red-500/10 text-red-500 border-red-500/20",
  solicitation: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  harassment:   "bg-orange-500/10 text-orange-500 border-orange-500/20",
  dismissed:    "bg-muted text-muted-foreground",
};

const platformColors: Record<string, string> = {
  discord: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  twitch:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const actionColors: Record<string, string> = {
  deleted:     "text-destructive",
  timeout_10m: "text-orange-400",
  warned:      "text-yellow-400",
  banned:      "text-destructive",
  dismissed:   "text-muted-foreground",
};

function relTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState("queue");
  const [flagged, setFlagged] = useState<FlaggedItem[]>(initialFlagged);
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: "",
    type: "keyword",
    platform: "discord",
    value: "",
    action: "delete",
  });

  const pending  = flagged.filter((i) => i.status === "pending");
  const actioned = flagged.filter((i) => i.status !== "pending");
  const sorted   = [...pending, ...actioned];

  async function handleDelete(item: FlaggedItem) {
    setActioning(item.id);
    await new Promise((r) => setTimeout(r, 600));
    setFlagged((prev) =>
      prev.map((i) => i.id === item.id ? { ...i, status: "actioned" as const, action: "deleted" } : i)
    );
    setActioning(null);
    toast.success("Message deleted");
  }

  async function handleDismiss(item: FlaggedItem) {
    setActioning(item.id);
    await new Promise((r) => setTimeout(r, 400));
    setFlagged((prev) =>
      prev.map((i) => i.id === item.id ? { ...i, status: "dismissed" as const } : i)
    );
    setActioning(null);
    toast.success("Flag dismissed");
  }

  function toggleRule(id: string) {
    setRules((prev) =>
      prev.map((r) => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)
    );
    const rule = rules.find((r) => r.id === id);
    toast.success(rule?.isEnabled ? "Rule disabled" : "Rule enabled");
  }

  async function handleAddRule() {
    if (!newRule.name.trim() || !newRule.value.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    const created: Rule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      type: newRule.type as Rule["type"],
      platform: newRule.platform as Rule["platform"],
      value: newRule.value,
      action: newRule.action as Rule["action"],
      isEnabled: true,
      triggerCount: 0,
    };
    setRules((prev) => [created, ...prev]);
    setSaving(false);
    setAddRuleOpen(false);
    setNewRule({ name: "", type: "keyword", platform: "discord", value: "", action: "delete" });
    toast.success(`Rule "${created.name}" added`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Moderation" description="AI-powered content moderation">
        <Button variant="outline" onClick={() => setAddRuleOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Flagged Today"  value={moderationStats.flaggedToday}     change={moderationStats.flaggedChange}   trend="neutral" icon={Shield} />
        <StatCard title="Auto-Actioned"  value={moderationStats.autoActioned}     change={moderationStats.autoActionedPct} trend="up"      icon={CheckCircle} />
        <StatCard title="Pending Review" value={pending.length}                                                             icon={Clock} />
        <StatCard title="False Positive" value={moderationStats.falsePositiveRate}                                          icon={AlertTriangle} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue">
            Flagged Queue
            {pending.length > 0 && (
              <Badge className="ml-2 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="log">Action Log</TabsTrigger>
        </TabsList>

        {/* Flagged Queue */}
        <TabsContent value="queue" className="space-y-3 mt-4">
          {sorted.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`gap-1 ${platformColors[item.platform] ?? ""}`}>
                      <PlatformIcon platform={item.platform} size={12} branded />
                      {platformLabel[item.platform] ?? item.platform}
                    </Badge>
                    <Badge variant="outline" className={reasonColors[item.reason] ?? ""}>
                      {item.reason.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{item.author}</span>
                    <span className="text-xs text-muted-foreground">{item.confidence}% confidence</span>
                    <span className="text-xs text-muted-foreground">{relTime(item.detectedAt)}</span>
                  </div>
                  <div className="shrink-0">
                    {item.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actioning === item.id}
                          onClick={() => handleDelete(item)}
                        >
                          {actioning === item.id && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actioning === item.id}
                          onClick={() => handleDismiss(item)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : item.status === "actioned" ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        Actioned: {item.action}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm bg-muted/50 rounded px-3 py-2 line-clamp-2">{item.content}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 px-6 py-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <Badge variant="outline" className="text-xs">{rule.type}</Badge>
                        <Badge variant="outline" className={`text-xs gap-1 ${platformColors[rule.platform] ?? "text-muted-foreground"}`}>
                          <PlatformIcon platform={rule.platform} size={11} branded />
                          {platformLabel[rule.platform] ?? rule.platform}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{rule.value}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs">{rule.action}</Badge>
                      <span className="text-xs text-muted-foreground">{rule.triggerCount} triggers</span>
                      <Switch
                        checked={rule.isEnabled}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Log */}
        <TabsContent value="log" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {moderationLog.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-3 text-sm flex-wrap">
                    <Badge variant="outline" className={`shrink-0 text-xs gap-1 ${platformColors[entry.platform] ?? ""}`}>
                      <PlatformIcon platform={entry.platform} size={11} branded />
                      {platformLabel[entry.platform] ?? entry.platform}
                    </Badge>
                    <span className={`shrink-0 font-medium text-xs ${actionColors[entry.action] ?? ""}`}>
                      {entry.action.replace("_", " ")}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">{entry.author}</span>
                    <span className="flex-1 text-muted-foreground text-xs">by {entry.moderator}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relTime(entry.at)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Rule Dialog */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Moderation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Block crypto spam"
                value={newRule.name}
                onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newRule.type} onValueChange={(v) => setNewRule((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={newRule.platform} onValueChange={(v) => setNewRule((p) => ({ ...p, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="twitch">Twitch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-value">Pattern / Value</Label>
              <Input
                id="rule-value"
                placeholder="e.g., crypto|nft|invest"
                value={newRule.value}
                onChange={(e) => setNewRule((p) => ({ ...p, value: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={newRule.action} onValueChange={(v) => setNewRule((p) => ({ ...p, action: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="ban">Ban</SelectItem>
                  <SelectItem value="flag">Flag for review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRuleOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRule} disabled={saving || !newRule.name.trim() || !newRule.value.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
