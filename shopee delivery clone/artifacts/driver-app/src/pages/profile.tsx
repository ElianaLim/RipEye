import { useGetDriverProfile, useGetDriverStats, DriverStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Truck, Star, Phone, MapPin, Settings, LogOut, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetDriverProfile();
  const { data: stats, isLoading: statsLoading } = useGetDriverStats();

  const getStatusConfig = (status?: DriverStatus) => {
    switch(status) {
      case 'online': return { color: "bg-green-500", text: "Online & Ready" };
      case 'busy': return { color: "bg-orange-500", text: "Currently Delivering" };
      case 'offline': return { color: "bg-gray-400", text: "Offline" };
      default: return { color: "bg-gray-400", text: "Unknown" };
    }
  };

  const statusConfig = getStatusConfig(profile?.status);

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-6">
      {/* Profile Header Block */}
      <div className="bg-background pt-12 pb-6 px-4 border-b relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center text-center mt-2">
          {profileLoading ? (
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
          ) : (
            <div className="relative mb-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                <AvatarImage src={profile?.avatarUrl || ""} alt={profile?.name} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {profile?.name?.split(' ').map(n => n[0]).join('') || 'DR'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 rounded-full p-1 bg-background">
                <div className={cn("w-4 h-4 rounded-full border-2 border-background", statusConfig.color)} />
              </div>
            </div>
          )}
          
          {profileLoading ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">{profile?.name}</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                ID: DRV-{profile?.id.toString().padStart(4, '0')}
                <span className="w-1 h-1 bg-muted-foreground/40 rounded-full mx-1" />
                <span className={cn("font-semibold", 
                  profile?.status === 'online' ? 'text-green-600' : 
                  profile?.status === 'busy' ? 'text-orange-600' : 'text-gray-500'
                )}>{statusConfig.text}</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center justify-center min-h-[100px]">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium text-muted-foreground">Rating</span>
              </div>
              {profileLoading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{profile?.rating.toFixed(1)}</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center justify-center min-h-[100px]">
              <div className="text-sm font-medium text-muted-foreground mb-1">Today</div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{stats?.todayDeliveries}</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center justify-center min-h-[100px]">
              <div className="text-sm font-medium text-muted-foreground mb-1">Lifetime</div>
              {profileLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{profile?.totalDeliveries}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Info */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 px-4 pt-4 border-b">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" /> Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {profileLoading ? (
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                  <p className="font-semibold text-foreground">{profile?.vehicleType}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">License Plate</p>
                  <Badge variant="outline" className="font-mono text-sm font-bold bg-muted/30 border-muted-foreground/20 px-2 py-0.5">
                    {profile?.vehiclePlate}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Menu */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y">
              <li>
                <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Account Verification</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </li>
              <li>
                <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted text-foreground">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Service Areas</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </li>
              <li>
                <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted text-foreground">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Driver Support</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full font-bold shadow-sm" size="lg">
          <LogOut className="w-4 h-4 mr-2" />
          Go Offline & Sign Out
        </Button>
      </div>
    </div>
  );
}
