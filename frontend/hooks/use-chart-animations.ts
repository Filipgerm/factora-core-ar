"use client";

import { useEffect, useRef, useCallback } from "react";

// Lazy-load gsap and cache the promise
let gsapPromise: Promise<typeof import("gsap")["gsap"]> | null = null;

const getGsap = async () => {
  if (!gsapPromise) {
    gsapPromise = import("gsap").then((module) => module.gsap);
  }
  return gsapPromise;
};

export function useChartAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  const animateOnMount = useCallback(
    async (
      selector: string,
      options?: {
        from?: Record<string, any>;
        delay?: number;
        stagger?: number;
        [key: string]: any;
      }
    ) => {
      if (!containerRef.current) return;

      const elements = containerRef.current.querySelectorAll(selector);
      if (elements.length === 0) return;

      const gsap = await getGsap();
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          y: 20,
          scale: 0.95,
          ...options?.from,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
          stagger: 0.05,
          ...options,
        }
      );
    },
    []
  );

  const animateBars = useCallback(
    async (selector: string, delay: number = 0) => {
      if (!containerRef.current) return;

      const bars = containerRef.current.querySelectorAll(selector);
      if (bars.length === 0) return;

      const gsap = await getGsap();
      gsap.fromTo(
        bars,
        {
          height: 0,
          opacity: 0,
        },
        {
          height: "var(--final-height)",
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.05,
          delay,
        }
      );
    },
    []
  );

  const animateDonut = useCallback(
    async (selector: string, delay: number = 0) => {
      if (!containerRef.current) return;

      const donut = containerRef.current.querySelector(selector);
      if (!donut) return;

      const gsap = await getGsap();
      gsap.fromTo(
        donut,
        {
          strokeDashoffset: 100,
        },
        {
          strokeDashoffset: "var(--final-offset)",
          duration: 0.8,
          ease: "power2.out",
          delay,
        }
      );
    },
    []
  );

  const animateGauge = useCallback(
    async (selector: string, delay: number = 0) => {
      if (!containerRef.current) return;

      const gauge = containerRef.current.querySelector(selector);
      if (!gauge) return;

      const gsap = await getGsap();
      gsap.fromTo(
        gauge,
        {
          strokeDashoffset: "var(--circumference)",
        },
        {
          strokeDashoffset: "var(--final-offset)",
          duration: 0.9,
          ease: "power2.out",
          delay,
        }
      );
    },
    []
  );

  const addHoverEffects = useCallback(
    async (selector: string, hoverScale: number = 1.02) => {
      if (!containerRef.current) return;

      const elements = containerRef.current.querySelectorAll(selector);
      if (elements.length === 0) return;

      const gsap = await getGsap();
      elements.forEach((element) => {
        const handleMouseEnter = () => {
          gsap.to(element, {
            scale: hoverScale,
            y: -2,
            duration: 0.3,
            ease: "power2.out",
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
          });
        };

        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);

        // Cleanup function
        return () => {
          element.removeEventListener("mouseenter", handleMouseEnter);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      });
    },
    []
  );

  const addLegendHoverEffects = useCallback(async () => {
    if (!containerRef.current) return;

    const legendItems =
      containerRef.current.querySelectorAll("[data-legend-item]");
    const chartElements = containerRef.current.querySelectorAll(
      "[data-chart-element]"
    );
    if (legendItems.length === 0 || chartElements.length === 0) return;

    const gsap = await getGsap();
    legendItems.forEach((legendItem, index) => {
      const handleMouseEnter = () => {
        // Fade out other elements
        chartElements.forEach((element, elementIndex) => {
          if (elementIndex !== index) {
            gsap.to(element, {
              opacity: 0.3,
              duration: 0.3,
            });
          } else {
            gsap.to(element, {
              opacity: 1,
              scale: 1.1,
              duration: 0.3,
              ease: "power2.out",
            });
          }
        });

        // Highlight legend item
        gsap.to(legendItem, {
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out",
        });
      };

      const handleMouseLeave = () => {
        // Reset all elements
        chartElements.forEach((element) => {
          gsap.to(element, {
            opacity: 1,
            scale: 1,
            duration: 0.3,
          });
        });

        // Reset legend item
        gsap.to(legendItem, {
          scale: 1,
          duration: 0.3,
        });
      };

      legendItem.addEventListener("mouseenter", handleMouseEnter);
      legendItem.addEventListener("mouseleave", handleMouseLeave);
    });
  }, []);

  const animateTableRows = useCallback(
    async (selector: string, delay: number = 0) => {
      if (!containerRef.current) return;

      const rows = containerRef.current.querySelectorAll(selector);
      if (rows.length === 0) return;

      const gsap = await getGsap();
      gsap.fromTo(
        rows,
        {
          opacity: 0,
          x: -20,
          rotationY: -15,
        },
        {
          opacity: 1,
          x: 0,
          rotationY: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
          delay,
        }
      );
    },
    []
  );

  const animateSlideInLeft = useCallback(
    async (selector: string, delay: number = 0) => {
      if (!containerRef.current) return;

      const elements = containerRef.current.querySelectorAll(selector);
      if (elements.length === 0) return;

      const gsap = await getGsap();
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          x: -100,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.08,
          delay,
        }
      );
    },
    []
  );

  const animateSlideInRight = useCallback(
    async (selector: string, delay: number = 0) => {
      if (!containerRef.current) return;

      const elements = containerRef.current.querySelectorAll(selector);
      if (elements.length === 0) return;

      const gsap = await getGsap();
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          x: 100,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.08,
          delay,
        }
      );
    },
    []
  );

  return {
    containerRef,
    animateOnMount,
    animateBars,
    animateDonut,
    animateGauge,
    addHoverEffects,
    addLegendHoverEffects,
    animateTableRows,
    animateSlideInLeft,
    animateSlideInRight,
  };
}

export function useChartHover() {
  const createTooltip = async (content: string, x: number, y: number) => {
    const existingTooltip = document.querySelector("[data-chart-tooltip]");
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement("div");
    tooltip.setAttribute("data-chart-tooltip", "true");
    tooltip.innerHTML = content;
    tooltip.style.cssText = `
      position: fixed;
      top: ${y - 40}px;
      left: ${x + 10}px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transform: translateY(10px);
    `;

    document.body.appendChild(tooltip);

    const gsap = await getGsap();
    gsap.to(tooltip, {
      opacity: 1,
      y: 0,
      duration: 0.2,
      ease: "power2.out",
    });

    return tooltip;
  };

  const removeTooltip = async () => {
    const tooltip = document.querySelector("[data-chart-tooltip]");
    if (tooltip) {
      const gsap = await getGsap();
      gsap.to(tooltip, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => tooltip.remove(),
      });
    }
  };

  return {
    createTooltip,
    removeTooltip,
  };
}
