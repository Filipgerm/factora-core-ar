import { Activity, Building2, Megaphone, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Alert } from "@/lib/alerts-data";
import {
  formatAlertDate,
  getImpactBadgeConfig,
} from "@/lib/utils/alerts";

interface AlertExpandedDetailsProps {
  alert: Alert;
}

export function AlertExpandedDetails({ alert }: AlertExpandedDetailsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
      {/* Economic Behavior Section */}
      {alert.economicBehavior && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Economic Behavior</h4>
          </div>
          <p className="text-sm text-gray-700">
            {alert.economicBehavior.summary}
          </p>
          <div className="space-y-2">
            {alert.economicBehavior.events.map((event, idx) => {
              const impactConfig = getImpactBadgeConfig(event.impact);
              return (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-gray-200 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {event.description}
                      </span>
                      <Badge variant="secondary" className={impactConfig.className}>
                        {impactConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatAlertDate(event.date)}
                      </span>
                      {event.amount && <span>{event.amount}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Company Updates Section */}
      {alert.companyUpdates && alert.companyUpdates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Company Updates</h4>
          </div>
          <div className="space-y-2">
            {alert.companyUpdates.map((update, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {update.description}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatAlertDate(update.date)}
                  </span>
                </div>
                {update.details && (
                  <p className="text-xs text-gray-600 mt-1">{update.details}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registry Announcements Section */}
      {alert.registryAnnouncements &&
        alert.registryAnnouncements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-gray-900">
                Registry Announcements
              </h4>
            </div>
            <div className="space-y-2">
              {alert.registryAnnouncements.map((announcement, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {announcement.description}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatAlertDate(announcement.date)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {announcement.registry}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

