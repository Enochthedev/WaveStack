"use client";

import { useState } from "react";
import {
  useSkills,
  useMarketplaceSkills,
  useCreateSkill,
  useInstallSkill,
  useDeleteSkill,
  useExecuteSkill,
} from "@/lib/hooks/use-workflows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Download, Star, Layers, CheckCircle2, Loader2, Plus, Play, Trash2 } from "lucide-react";
import type { Skill } from "@/types";

const categories = ["all", "content", "growth", "analytics", "community", "custom"] as const;

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkillCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="h-3 w-12 rounded bg-muted animate-pulse" />
          <div className="h-3 w-14 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-full rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

function SkillGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkillCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Skill card grid ───────────────────────────────────────────────────────────

function SkillGrid({
  items,
  mode,
  installingId,
  executingId,
  onInstall,
  onExecute,
  onDelete,
  onBrowse,
}: {
  items: Skill[];
  mode: "marketplace" | "owned";
  installingId: string | null;
  executingId: string | null;
  onInstall?: (skill: Skill) => void;
  onExecute?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onBrowse?: () => void;
}) {
  if (items.length === 0) {
    if (mode === "owned") {
      return (
        <EmptyState
          preset="no-skills"
          size="lg"
          cta={onBrowse ? { label: "Browse Marketplace", onClick: onBrowse } : undefined}
        />
      );
    }
    return <EmptyState preset="no-marketplace-skills" size="lg" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((skill) => (
        <Card key={skill.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{skill.name}</CardTitle>
              <Badge variant="secondary" className="capitalize">
                {skill.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {skill.installCount} installs
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {skill.rating > 0 ? skill.rating.toFixed(1) : "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {skill.stepsCount} steps
              </span>
            </div>

            {mode === "marketplace" && onInstall && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={installingId === skill.id}
                onClick={() => onInstall(skill)}
              >
                {installingId === skill.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {installingId === skill.id ? "Installing..." : "Install"}
              </Button>
            )}

            {mode === "owned" && (
              <div className="flex gap-2">
                {onExecute && (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    disabled={executingId === skill.id}
                    onClick={() => onExecute(skill)}
                  >
                    {executingId === skill.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Run
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(skill)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"owned" | "marketplace">("marketplace");
  const [marketplaceCategory, setMarketplaceCategory] = useState<string | undefined>(undefined);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    category: "custom",
  });

  const { data: ownedSkills, isLoading: ownedLoading, isError: ownedError } = useSkills();
  const {
    data: marketplaceSkills,
    isLoading: marketplaceLoading,
    isError: marketplaceError,
  } = useMarketplaceSkills(marketplaceCategory);

  const createSkill = useCreateSkill();
  const installSkill = useInstallSkill();
  const deleteSkill = useDeleteSkill();
  const executeSkill = useExecuteSkill();

  const owned: Skill[] = ownedSkills ?? [];
  const marketplace: Skill[] = marketplaceSkills ?? [];
  const isOffline = ownedError && marketplaceError;

  function handleInstall(skill: Skill) {
    setInstallingId(skill.id);
    installSkill.mutate(skill.id, {
      onSettled: () => setInstallingId(null),
    });
  }

  function handleExecute(skill: Skill) {
    setExecutingId(skill.id);
    executeSkill.mutate({ id: skill.id, input: {} }, { onSettled: () => setExecutingId(null) });
  }

  function handleDelete(skill: Skill) {
    deleteSkill.mutate(skill.id);
  }

  function handleCreate() {
    if (!newSkill.name.trim()) return;
    const slug = newSkill.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    createSkill.mutate(
      {
        name: newSkill.name,
        slug,
        description: newSkill.description || undefined,
        category: newSkill.category,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewSkill({ name: "", description: "", category: "custom" });
          setTab("owned");
        },
      },
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Skills" description="Composable automation workflows for your AI agents">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Button>
      </PageHeader>

      {isOffline && (
        <EmptyState
          preset="offline"
          size="lg"
          subtitle="Can't reach the skills service. Check your connection and try again."
        />
      )}

      {!isOffline && (
        <>
          {owned.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>
                <span className="font-medium text-foreground">{owned.length}</span> skill
                {owned.length !== 1 ? "s" : ""} installed
              </span>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as "owned" | "marketplace")}>
            <TabsList>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="owned">
                My Skills
                {owned.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary">
                    {owned.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="marketplace" className="mt-6 space-y-4">
              <div className="flex gap-1 flex-wrap">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={
                      (cat === "all" && !marketplaceCategory) || marketplaceCategory === cat
                        ? "default"
                        : "outline"
                    }
                    className="h-7 text-xs capitalize"
                    onClick={() => setMarketplaceCategory(cat === "all" ? undefined : cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {marketplaceLoading ? (
                <SkillGridSkeleton />
              ) : (
                <SkillGrid
                  items={marketplace}
                  mode="marketplace"
                  installingId={installingId}
                  executingId={null}
                  onInstall={handleInstall}
                />
              )}
            </TabsContent>

            <TabsContent value="owned" className="mt-6">
              {ownedLoading ? (
                <SkillGridSkeleton />
              ) : (
                <SkillGrid
                  items={owned}
                  mode="owned"
                  installingId={null}
                  executingId={executingId}
                  onExecute={handleExecute}
                  onDelete={handleDelete}
                  onBrowse={() => setTab("marketplace")}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Skill Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input
                id="skill-name"
                placeholder="e.g., Auto-reply to DMs"
                value={newSkill.name}
                onChange={(e) => setNewSkill((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-desc">Description</Label>
              <Textarea
                id="skill-desc"
                placeholder="Describe what this skill does..."
                rows={3}
                value={newSkill.description}
                onChange={(e) => setNewSkill((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newSkill.category}
                onValueChange={(v) => setNewSkill((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createSkill.isPending || !newSkill.name.trim()}
            >
              {createSkill.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
