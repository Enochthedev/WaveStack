"use client";

import { bots } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Bot, MessageSquare, Terminal, RefreshCw } from "lucide-react";

export default function BotsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bots" description="Manage your platform bots" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bots.map((bot) => (
          <Card
            key={bot.id}
            className={`border-l-4 ${
              bot.status === "online" ? "border-l-green-500" : "border-l-gray-400"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {bot.name}
              </CardTitle>
              <StatusBadge status={bot.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{bot.platform}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{bot.servers}</p>
                  <p className="text-xs text-muted-foreground">Servers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{bot.commands}</p>
                  <p className="text-xs text-muted-foreground">Commands</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{bot.messagesHandled}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <Terminal className="h-4 w-4 mr-1" />
                  Configure
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  View Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart All Bots
            </Button>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              View Combined Logs
            </Button>
            <Button variant="outline">
              <Terminal className="h-4 w-4 mr-2" />
              Sync Commands
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
