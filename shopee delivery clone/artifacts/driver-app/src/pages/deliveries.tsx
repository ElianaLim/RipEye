import { useState } from "react";
import { useListDeliveries, DeliveryStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiErrorBanner } from "@/components/api-error-banner";
import { formatPeso } from "@/lib/currency";

export default function Deliveries() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const statusFilter = activeTab === "all" ? undefined : activeTab;
  const { data: deliveries, isLoading, isError } = useListDeliveries(
    statusFilter ? { status: statusFilter as DeliveryStatus } : {},
  );

  const filteredDeliveries = deliveries?.filter(d => 
    d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customerAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50";
      case 'picked_up': return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50";
      case 'in_transit': return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900/50";
      case 'delivered': return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50";
      case 'failed': return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="flex flex-col min-h-full">
      {isError && <ApiErrorBanner />}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Orders</p>
            <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by order, name, or address..." 
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 overflow-x-auto no-scrollbar pb-2">
            <TabsList className="h-9 inline-flex w-max bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-sm px-4 text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-sm px-4 text-xs">Pending</TabsTrigger>
              <TabsTrigger value="picked_up" className="rounded-sm px-4 text-xs">Picked Up</TabsTrigger>
              <TabsTrigger value="in_transit" className="rounded-sm px-4 text-xs">In Transit</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/50">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredDeliveries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground">No deliveries found</p>
            <p className="text-sm">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          filteredDeliveries?.map((delivery) => (
            <Link key={delivery.id} href={`/deliveries/${delivery.id}`} className="block">
              <Card className="overflow-hidden rounded-2xl hover:border-primary/40 hover:shadow-md transition-all shadow-sm border-border/60">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-border/50 bg-muted/10">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-sm font-semibold text-foreground break-all min-w-0 flex-1">
                        {delivery.orderNumber}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize border text-[10px] px-2 py-0 h-5 shrink-0",
                          getStatusColor(delivery.status),
                        )}
                      >
                        {getStatusText(delivery.status)}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-foreground line-clamp-1">{delivery.customerName}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{delivery.customerAddress}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-background flex justify-between items-center text-xs">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        {delivery.items.length} items
                      </span>
                      <span className="font-semibold text-primary">
                        {formatPeso(delivery.estimatedEarnings)}
                      </span>
                    </div>
                    
                    {(delivery.pickupDamageFlag === 'severe' ||
                      delivery.deliveryDamageFlag === 'severe' ||
                      delivery.pickupDamageFlag === 'minor' ||
                      delivery.deliveryDamageFlag === 'minor') && (
                      <span
                        className={cn(
                          "flex items-center gap-1 font-medium",
                          delivery.pickupDamageFlag === 'severe' ||
                            delivery.deliveryDamageFlag === 'severe'
                            ? "text-red-600"
                            : "text-amber-700",
                        )}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        {delivery.pickupDamageFlag === 'severe' ||
                        delivery.deliveryDamageFlag === 'severe'
                          ? "Severe damage"
                          : "Minor damage"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
