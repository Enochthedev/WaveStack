"use client";

import { useState } from "react";
import { toast } from "sonner";
import { skills as initialSkills } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
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
import { Download, Star, Layers, CheckCircle2, Loader2, Plus } from "lucide-react";

type Skill = (typeof initialSkills)[number];

const categories = ["all", "content", "growth", "analytics", "custom"] as const;

function SkillGrid({
  items,
  installed,
  installing,
  onInstall,
}: {
  items: Skill[];
  installed: Set<string>;
  installing: string | null;
  onInstall: (skill: Skill) => void;
}) {
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
            <p className="text-sm text-muted-foreground line-clamp-2">
              {skill.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {skill.installCount} installs
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {skill.rating} stars
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {skill.stepsCount} steps
              </span>
            </div>
            {installed.has(skill.id) ? (
              <Button variant="outline" size="sm" className="w-full" disabled>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Installed
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={installing === skill.id}
                onClick={() => onInstall(skill)}
              >
                {installing === skill.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {installing === skill.id ? "Installing..." : "Install"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function SkillsPage() {
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [skills, setSkills] = useState<Skill[]>(initialSkills);

  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    category: "custom",
  });

  async function handleInstall(skill: Skill) {
    setInstalling(skill.id);
    await new Promise((r) => setTimeout(r, 1200));
    setInstalled((prev) => new Set([...prev, skill.id]));
    setInstalling(null);
    toast.success(`"${skill.name}" installed successfully`);
  }

  async function handleCreate() {
    if (!newSkill.name.trim()) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 900));
    const created: Skill = {
      id: `custom-${Date.now()}`,
      name: newSkill.name,
      slug: newSkill.name.toLowerCase().replace(/\s+/g, "-"),
      description: newSkill.description || "Custom skill",
      category: newSkill.category as Skill["category"],
      installCount: 0,
      rating: 0,
      isPublic: false,
      stepsCount: 1,
    };
    setSkills((prev) => [created, ...prev]);
    setInstalled((prev) => new Set([...prev, created.id]));
    setCreating(false);
    setCreateOpen(false);
    setNewSkill({ name: "", description: "", category: "custom" });
    toast.success(`"${created.name}" created and installed`);
  }

  const skillProps = { installed, installing, onInstall: handleInstall };

  return (
    <div className="space-y-8">
      <PageHeader title="Skills" description="Composable automation workflows">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Button>
      </PageHeader>

      {installed.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>
            <span className="font-medium text-foreground">{installed.size}</span>{" "}
            skill{installed.size !== 1 ? "s" : ""} installed
          </span>
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <SkillGrid items={skills} {...skillProps} />
        </TabsContent>

        {categories
          .filter((cat) => cat !== "all")
          .map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-6">
              <SkillGrid items={skills.filter((s) => s.category === cat)} {...skillProps} />
            </TabsContent>
          ))}
      </Tabs>

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
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newSkill.name.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
