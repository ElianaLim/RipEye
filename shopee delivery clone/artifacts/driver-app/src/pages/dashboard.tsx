import { useGetDriverStats, useGetRecentActivity, useListDeliveries } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Package, Clock, ArrowRight, Wallet, CheckCircle2, Truck } from "lucide-react";
import { format } from "date-fns";
import { ApiErrorBanner } from "@/components/api-error-banner";
import { formatPeso } from "@/lib/currency";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useGetDriverStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const {
    data: deliveries,
    isLoading: deliveriesLoading,
    isError: deliveriesError,
  } = useListDeliveries({ status: "in_transit" });

  const apiUnreachable = statsError || deliveriesError;
  const activeDelivery = deliveries?.[0];

  return (
    <div className="px-4 py-5 space-y-6">
      {apiUnreachable && <ApiErrorBanner />}

      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">
            Shopee Driver
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Overview
          </h1>
          <p className="text-sm text-muted-foreground">Today&apos;s summary</p>
        </div>
        <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/25">
          <Truck className="w-5 h-5" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary to-primary/85 text-primary-foreground border-0 shadow-lg shadow-primary/20 rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between min-h-[120px]">
            <Wallet className="w-5 h-5 opacity-90" />
            <div>
              <p className="text-xs font-medium opacity-90">Earnings today</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-24 bg-white/20 mt-2" />
              ) : (
                <p className="text-2xl font-bold mt-1 tracking-tight">
                  {formatPeso(stats?.todayEarnings ?? 0)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-rows-2 gap-3">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-3.5 flex items-center justify-between h-full">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Completed</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-10 mt-1" />
                ) : (
                  <p className="text-xl font-bold mt-0.5">{stats?.completedToday}</p>
                )}
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-3.5 flex items-center justify-between h-full">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Pending</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-10 mt-1" />
                ) : (
                  <p className="text-xl font-bold mt-0.5">{stats?.pendingCount}</p>
                )}
              </div>
              <Package className="w-6 h-6 text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Current order</h2>
          {activeDelivery && (
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 rounded-full">
              In transit
            </Badge>
          )}
        </div>

        {deliveriesLoading ? (
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : activeDelivery ? (
          <Card className="rounded-2xl border-primary/25 shadow-md overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-base">{activeDelivery.orderNumber}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {activeDelivery.customerAddress}
                  </p>
                </div>
                <p className="text-sm font-bold text-primary shrink-0">
                  {formatPeso(activeDelivery.estimatedEarnings)}
                </p>
              </div>
              <Link href={`/deliveries/${activeDelivery.id}`} className="block">
                <Button className="w-full h-12 rounded-xl text-base font-semibold shadow-sm">
                  View delivery
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-dashed bg-muted/30">
            <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Package className="w-10 h-10 opacity-40" />
              <p className="text-sm">No active delivery right now.</p>
              <Link href="/deliveries">
                <Button variant="outline" size="sm" className="rounded-full">
                  Find orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Recent activity</h2>
        {activityLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : activity?.length ? (
          <div className="space-y-2">
            {activity.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border/60 rounded-xl p-3.5 flex gap-3 items-center shadow-sm"
              >
                <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.action} · {item.orderNumber}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(item.timestamp), "h:mm a")} · {item.customerName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
        )}
      </section>
    </div>
  );
}
