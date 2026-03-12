"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Play,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  User,
  Clock,
} from "lucide-react";

const ONBOARDING_DEMO_VERSIONS = [
  {
    id: "full",
    name: "Full Onboarding Demo",
    description: "Complete onboarding flow with all steps",
    steps: [
      "Phone Verification",
      "Email Verification",
      "Business Lookup",
      "KYC Verification",
    ],
    icon: <User className="h-8 w-8" />,
    color: "bg-blue-500",
    duration: "~3 minutes",
    startUrl: "/onboarding/phone?demo=true",
  },
  {
    id: "quick",
    name: "Quick Demo",
    description: "Fast-paced demo showing key interactions",
    steps: ["Phone & Email", "Business Selection", "KYC Process"],
    icon: <Clock className="h-8 w-8" />,
    color: "bg-green-500",
    duration: "~90 seconds",
    startUrl: "/onboarding/phone?demo=true&speed=fast",
  },
];

export default function OnboardingDemoSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const handleStartDemo = (demoId: string) => {
    const demo = ONBOARDING_DEMO_VERSIONS.find((d) => d.id === demoId);
    if (demo) {
      setSelectedDemo(demoId);
      // Preserve exclude and other params, merge with demo params
      const params = new URLSearchParams(searchParams.toString());
      params.set("demo", "true");
      if (demo.id === "quick") params.set("speed", "fast");
      const query = params.toString();
      router.push(`/onboarding/phone${query ? `?${query}` : ""}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Onboarding Demo
          </h1>
          <p className="text-lg text-gray-600">
            Experience our onboarding flow with simulated user interactions
          </p>
        </motion.div>

        {/* Demo Options */}
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            {ONBOARDING_DEMO_VERSIONS.map((demo, index) => (
              <motion.div
                key={demo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="group relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
                  <div
                    className={`absolute top-0 left-0 h-1 w-full ${demo.color}`}
                  />

                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <motion.div
                        className={`flex h-16 w-16 items-center justify-center rounded-xl ${demo.color} text-white`}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {demo.icon}
                      </motion.div>

                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {demo.name}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {demo.duration}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-gray-600">{demo.description}</p>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">
                        Demo Steps:
                      </h4>
                      <ul className="space-y-1">
                        {demo.steps.map((step, stepIndex) => (
                          <li
                            key={stepIndex}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => handleStartDemo(demo.id)}
                      disabled={selectedDemo === demo.id}
                      className="w-full bg-gradient-to-r from-brand-grad-start to-brand-grad-end text-white shadow-md transition-all duration-200 hover:from-brand-primary-hover hover:to-brand-grad-start hover:shadow-lg disabled:opacity-50"
                    >
                      {selectedDemo === demo.id ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Starting Demo...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Demo
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-gray-500">
            The demo will automatically progress through each step with
            simulated user interactions
          </p>
          <Button
            variant="outline"
            onClick={() => {
              // Preserve exclude and other params, but strip demo/speed for regular flow
              const params = new URLSearchParams(searchParams.toString());
              params.delete("demo");
              params.delete("speed");
              const query = params.toString();
              router.push(`/onboarding/phone${query ? `?${query}` : ""}`);
            }}
            className="mt-4"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Go to Regular Onboarding
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
