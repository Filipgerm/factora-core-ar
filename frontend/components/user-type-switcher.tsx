"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ShoppingCart, Landmark } from "lucide-react";
import { useMemo } from "react";
import { useUser } from "@/components/user-context";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer", Icon: ShoppingCart },
  { value: "supplier", label: "Supplier", Icon: Building2 },
  {
    value: "financial_institution",
    label: "Financial Institution",
    Icon: Landmark,
  },
] as const;

interface UserTypeSwitcherProps {
  className?: string;
}

export function UserTypeSwitcher({ className }: UserTypeSwitcherProps) {
  const { userType, setUserType } = useUser();

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find((role) => role.value === userType) ?? ROLE_OPTIONS[0],
    [userType]
  );

  return (
    <Select
      value={userType}
      onValueChange={(value) =>
        setUserType(value as (typeof ROLE_OPTIONS)[number]["value"])
      }
    >
      <SelectTrigger
        className={cn(
          "w-full justify-between border border-border bg-muted/40 text-foreground hover:bg-muted/60",
          className
        )}
      >
        <SelectValue>
          <span className="flex items-center gap-2">
            <selectedRole.Icon className="w-4 h-4" />
            {selectedRole.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map(({ value, label, Icon }) => (
          <SelectItem key={value} value={value}>
            <span className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
