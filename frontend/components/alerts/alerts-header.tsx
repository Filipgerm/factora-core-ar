interface AlertsHeaderProps {
  totalAlerts: number;
  customersAffected: number;
}

export function AlertsHeader({
  totalAlerts,
  customersAffected,
}: AlertsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Alerts
        </h1>
        <p className="text-gray-600">
          {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""} across{" "}
          {customersAffected} customer{customersAffected !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

