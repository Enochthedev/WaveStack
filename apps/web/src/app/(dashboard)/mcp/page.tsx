"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Plug } from "lucide-react";

export default function McpPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="MCP Tools" description="Model Context Protocol server management">
        <Button disabled>
          <Plug className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </PageHeader>

      <EmptyState
        preset="generic"
        title="MCP management coming soon"
        subtitle="Connect and manage MCP servers from the Integrations marketplace instead."
        size="lg"
      />
    </div>
  );
}
