"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAssets } from "@/lib/hooks/use-assets";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Loader2,
  Film,
  ImageIcon,
} from "lucide-react";

type Asset = {
  id: string;
  filename: string;
  mimeType: string;
  duration?: number;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

function formatFileSize(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function AssetCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="h-40 bg-muted" />
      <CardContent className="p-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="h-3 w-24 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { data: assetsData, isLoading, isError } = useAssets({ limit: 50 });
  const assets: Asset[] = assetsData?.data ?? [];

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadOpen(true);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    // TODO: wire to real upload API when available
    toast.info("Upload API not yet implemented");
    setUploading(false);
    setUploadOpen(false);
    setSelectedFile(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    // TODO: wire to real delete API when available
    toast.info("Delete API not yet implemented");
    setDeleteTarget(null);
  }

  function handleDownload(asset: Asset) {
    toast.info(`Preparing download for "${asset.filename}"...`);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Content Library" description="Manage your media assets">
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </PageHeader>

      {/* Drop zone hint */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => setUploadOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setUploadOpen(true)}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop files here, or{" "}
          <span className="text-primary cursor-pointer underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">MP4, MOV, JPG, PNG up to 2 GB</p>
      </div>

      {isError ? (
        <EmptyState preset="offline" subtitle="Could not load content library." />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AssetCardSkeleton key={i} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          preset="generic"
          title="No assets yet"
          subtitle="Upload your first file above to get started."
          size="lg"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const isVideo = asset.mimeType.startsWith("video");
            return (
              <Card key={asset.id} className="overflow-hidden">
                <div
                  className="h-40 bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors relative"
                  onClick={() => setPreviewAsset(asset)}
                >
                  {isVideo ? (
                    <Film className="h-10 w-10 text-muted-foreground/50" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  )}
                  <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {isVideo ? "Video" : "Image"}
                  </span>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1">{asset.filename}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewAsset(asset)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(asset)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(asset)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {asset.mimeType}
                    </Badge>
                    <StatusBadge status={asset.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(asset.sizeBytes)}</span>
                    {asset.duration && <span>{formatDuration(asset.duration)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open: boolean) => {
          if (!uploading) {
            setUploadOpen(open);
            if (!open) setSelectedFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setSelectedFile(f);
              }}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Click to browse or drag a file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, MOV, JPG, PNG up to 2 GB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {selectedFile && (
              <div className="text-xs text-muted-foreground space-y-1 rounded-md border p-3">
                <p>
                  <span className="font-medium">File:</span> {selectedFile.name}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {selectedFile.type}
                </p>
                <p>
                  <span className="font-medium">Size:</span>{" "}
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary animate-pulse rounded-full w-2/3" />
                </div>
                <p className="text-xs text-muted-foreground text-center">Uploading...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadOpen(false);
                setSelectedFile(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewAsset}
        onOpenChange={(open: boolean) => !open && setPreviewAsset(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">{previewAsset?.filename}</DialogTitle>
          </DialogHeader>
          <div className="h-56 bg-muted rounded-lg flex items-center justify-center">
            {previewAsset?.mimeType.startsWith("video") ? (
              <Film className="h-16 w-16 text-muted-foreground/40" />
            ) : (
              <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p>{previewAsset?.mimeType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Size</p>
              <p>{previewAsset && formatFileSize(previewAsset.sizeBytes)}</p>
            </div>
            {previewAsset?.duration && (
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p>{formatDuration(previewAsset.duration)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              {previewAsset && <StatusBadge status={previewAsset.status} />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewAsset(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewAsset) handleDownload(previewAsset);
                setPreviewAsset(null);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.filename}&rdquo; will be permanently deleted and cannot be
              recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
