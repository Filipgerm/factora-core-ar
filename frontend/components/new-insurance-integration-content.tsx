"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import Image from "next/image";

export interface Insurance {
    id: string;
    name: string;
    fullName: string;
    logo: string;
    headquarters: string;
    est: string;
}

const insuranceCompanies: Insurance[] = [
    {
        id: "atradius",
        name: "Atradius",
        fullName: "Atradius S.A.",
        logo: "/images/insurance/atradius.png",
        headquarters: "Amsterdam, Netherlands",
        est: "2001",
    },
    {
        id: "coface",
        name: "Coface",
        fullName: "Coface S.A.",
        logo: "/images/insurance/coface.png",
        headquarters: "Paris, France",
        est: "1946",
    },
    {
        id: "allianz",
        name: "Allianz",
        fullName: "Allianz Trade",
        logo: "/images/insurance/allianz.png",
        headquarters: "Paris, France",
        est: "1890",
    },
];

interface NewInsuranceIntegrationContentProps {
    onInsuranceSelect?: (insurance: Insurance) => void;
    variant?: "onboarding" | "dashboard";
}

export function NewInsuranceIntegrationContent({
    onInsuranceSelect,
    variant = "dashboard",
}: NewInsuranceIntegrationContentProps) {
    const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredCompanies, setFilteredCompanies] = useState<Insurance[]>(insuranceCompanies);
    const cardsAnimatedRef = useRef(false);

    useEffect(() => {
        animateOnMount(".ins-search", { delay: 0.1 });
    }, [animateOnMount]);

    useEffect(() => {
        if (cardsAnimatedRef.current) return;
        if (!filteredCompanies.length) return;
        animateOnMount(".ins-card", { delay: 0.2, stagger: 0.1 });
        cardsAnimatedRef.current = true;
    }, [filteredCompanies, animateOnMount]);

    useEffect(() => {
        addHoverEffects(".ins-card", 1.02);
    }, [addHoverEffects]);

    useEffect(() => {
        const normalizedSearch = searchTerm.toLowerCase();
        const filtered = insuranceCompanies.filter(
            (ins) =>
                ins.name.toLowerCase().includes(normalizedSearch) ||
                ins.fullName.toLowerCase().includes(normalizedSearch)
        );
        setFilteredCompanies(filtered);
    }, [searchTerm]);

    const handleConnect = (ins: Insurance) => {
        if (onInsuranceSelect) {
            onInsuranceSelect(ins);
        }
    };

    return (
        <div className="space-y-6" ref={containerRef}>
            <div className={variant === "onboarding" ? "p-6" : "p-0"}>
                <div className="max-w-7xl mx-auto">
                    {/* Search Bar */}
                    <div className="ins-search mb-8">
                        <div className="relative max-w-md mx-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search insurance providers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCompanies.map((ins) => (
                            <div
                                key={ins.id}
                                className="ins-card border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer h-[280px]"
                                onClick={() => handleConnect(ins)}
                            >
                                <div className="flex flex-col h-full">
                                    <div className="flex-shrink-0 mb-4 flex justify-center">
                                        <div className="w-[120px] h-[60px] flex items-center justify-center relative">
                                            <Image
                                                src={ins.logo}
                                                alt={`${ins.name} logo`}
                                                fill
                                                sizes="120px"
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-start mb-6">
                                        <h3 className="text-lg font-bold text-card-foreground mb-2 text-center">
                                            {ins.fullName}
                                        </h3>
                                        <div className="flex justify-between text-xs text-muted-foreground mt-auto">
                                            <span>Est. {ins.est}</span>
                                            <span>{ins.headquarters}</span>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0 w-full">
                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConnect(ins);
                                            }}
                                        >
                                            Connect
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredCompanies.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-card-foreground mb-2">
                                No providers found
                            </h3>
                            <p className="text-muted-foreground">
                                Try adjusting your search criteria.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}