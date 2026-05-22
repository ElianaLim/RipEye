import { useListDeliveries, useGetDriverStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package, Wallet, MapPin, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { formatPeso } from "@/lib/currency";

export default function History() {
  const { data: deliveries, isLoading: deliveriesLoading } = useListDeliveries({ status: 'delivered' });
  const { data: stats, isLoading: statsLoading } = useGetDriverStats();

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <div className="bg-background px-4 py-6 border-b">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Delivery History</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card shadow-sm border-border/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Completed (Week)</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.weekDeliveries}</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-card shadow-sm border-border/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Earnings (Week)</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-primary mt-1">{formatPeso(stats?.weekEarnings ?? 0)}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 flex-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Completed Deliveries</h2>
        
        <div className="space-y-3">
          {deliveriesLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-border/50">
                <CardContent className="p-4">
                  <div className="flex justify-between mb-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : deliveries?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">No history yet</p>
              <p className="text-sm">Completed deliveries will appear here.</p>
            </div>
          ) : (
            deliveries?.map((delivery) => (
              <Link key={delivery.id} href={`/deliveries/${delivery.id}`} className="block">
                <Card className="overflow-hidden hover:border-primary/50 transition-colors shadow-sm">
                  <CardContent className="p-0">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-mono text-sm font-bold text-foreground mb-1">
                            {delivery.orderNumber}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground font-medium">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {delivery.deliveredAt ? format(new Date(delivery.deliveredAt), 'MMM d, yyyy • h:mm a') : 'Unknown Date'}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shadow-none font-semibold">
                          +{formatPeso(delivery.estimatedEarnings)}
                        </Badge>
                      </div>
                      <div className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-md">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm text-foreground leading-tight line-clamp-1">{delivery.customerName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{delivery.customerAddress}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
