import { DemoLoginBanner } from "@/components/features/auth/demo-login-banner";
import { LoginForm } from "@/components/features/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <DemoLoginBanner />
      <LoginForm />
    </div>
  );
}
