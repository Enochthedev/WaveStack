"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Knowledge Base" description="RAG-powered context for your AI agents">
        <Button disabled>
          <BookOpen className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </PageHeader>

      <EmptyState
        preset="generic"
        title="Knowledge Base coming soon"
        subtitle="Document indexing and RAG retrieval are being built. Check back soon."
        size="lg"
      />
    </div>
  );
}
