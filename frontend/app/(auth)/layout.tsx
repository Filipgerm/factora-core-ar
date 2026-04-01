import { AuthExperienceLayout } from "@/components/features/auth/auth-experience-layout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthExperienceLayout>{children}</AuthExperienceLayout>;
}
