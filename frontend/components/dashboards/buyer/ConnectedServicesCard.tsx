import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBankLogo,
  getERPLogo,
  getPlatformLogo,
} from "@/lib/utils/buyer-dashboard";
import type { ConnectedServices } from "@/lib/types/buyer-dashboard";
import { Building } from "lucide-react";

type ConnectedServicesCardProps = {
  connectedServices: ConnectedServices;
  loading?: boolean;
};

const ServiceSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((key) => (
      <div key={key} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded bg-muted animate-pulse" />
        <div className="h-4 w-28 bg-muted animate-pulse rounded" />
      </div>
    ))}
  </div>
);

const ServiceItem = ({
  logo,
  name,
  alt,
}: {
  logo: string | null;
  name?: string;
  alt: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 rounded overflow-hidden bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
      {logo ? (
        <img
          src={logo}
          alt={alt}
          className="w-[36px] h-[36px] object-contain"
        />
      ) : (
        <div className="w-[36px] h-[36px]" />
      )}
    </div>
    <span className="text-xs font-medium text-gray-900 truncate">{name}</span>
  </div>
);

export function ConnectedServicesCard({
  connectedServices,
  loading = false,
}: ConnectedServicesCardProps) {
  return (
    <Card className="bd-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Connected Services
        </CardTitle>
        <Building className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <ServiceSkeleton />
        ) : (
          <div className="space-y-3">
            {connectedServices.bank && (
              <ServiceItem
                logo={getBankLogo(connectedServices.bankName)}
                name={connectedServices.bankName}
                alt={connectedServices.bankName || "Bank"}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
