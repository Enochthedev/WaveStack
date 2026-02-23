"use client";

import { useState } from "react";
import { toast } from "sonner";
import { knowledgeDocuments as initialDocs } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Database, Link, Trash2, Loader2 } from "lucide-react";

type KnowledgeDoc = (typeof initialDocs)[number];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    url: "",
    sourceType: "website",
    tags: "",
  });

  const totalChunks     = docs.reduce((sum, doc) => sum + doc.chunkCount, 0);
  const sourcesConnected = new Set(docs.map((doc) => doc.sourceType)).size;

  async function handleAdd() {
    if (!form.title.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    const newDoc: KnowledgeDoc = {
      id: `doc-${Date.now()}`,
      title: form.title,
      sourceType: form.sourceType as KnowledgeDoc["sourceType"],
      status: "indexing",
      chunkCount: 0,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    setDocs((prev) => [newDoc, ...prev]);
    setSaving(false);
    setAddOpen(false);
    setForm({ title: "", url: "", sourceType: "website", tags: "" });
    toast.success(`"${newDoc.title}" added — indexing in progress`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 600));
    setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    toast.success(`"${deleteTarget.title}" removed from knowledge base`);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Knowledge Base" description="RAG-powered context for your AI agents">
        <Button onClick={() => setAddOpen(true)}>
          <BookOpen className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Documents"       value={docs.length}                    icon={BookOpen} />
        <StatCard title="Chunks Indexed"  value={totalChunks.toLocaleString()}   icon={Database} />
        <StatCard title="Sources Connected" value={sourcesConnected}             icon={Link} />
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {docs.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No documents yet. Add a source to get started.
              </div>
            )}
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {doc.sourceType.replace("_", " ")}
                  </Badge>
                  <StatusBadge status={doc.status} />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {doc.chunkCount} chunks
                  </span>
                  <div className="flex items-center gap-1">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(doc.createdAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:text-destructive"
                  onClick={() => setDeleteTarget(doc)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Source Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                placeholder="e.g., Brand Guidelines 2024"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-url">URL (optional)</Label>
              <Input
                id="kb-url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select
                value={form.sourceType}
                onValueChange={(v) => setForm((p) => ({ ...p, sourceType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="notion">Notion</SelectItem>
                  <SelectItem value="google_doc">Google Doc</SelectItem>
                  <SelectItem value="manual">Manual text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-tags">Tags (comma-separated)</Label>
              <Input
                id="kb-tags"
                placeholder="brand, guidelines, faq"
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed from the knowledge base.
              Your agents will no longer have access to this content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
