"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Sensitive } from "@/lib/streamer-mode";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  description,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold">
            <Sensitive>{value}</Sensitive>
          </p>
          {change && (
            <span
              className={cn(
                "flex items-center text-xs font-medium",
                trend === "up"      && "text-green-500",
                trend === "down"    && "text-red-500",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up"   && <TrendingUp   className="mr-0.5 h-3 w-3" />}
              {trend === "down" && <TrendingDown  className="mr-0.5 h-3 w-3" />}
              <Sensitive>{change}</Sensitive>
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
