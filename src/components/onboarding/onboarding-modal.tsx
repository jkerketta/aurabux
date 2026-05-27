"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Zap,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: BarChart3,
    title: "Welcome to ABX",
    description:
      "You've been given 10,000 ABX to invest in real stocks. No real money — just real competition.",
  },
  {
    icon: Zap,
    title: "Spin Daily, Earn More",
    description:
      "Spin the wheel once a day for ABX bonuses, free stocks, and x2 return powerups. Don't forget to come back.",
  },
  {
    icon: Trophy,
    title: "Climb the Leaderboard",
    description:
      "Your return % is measured on how well you pick stocks — not luck. Compete with friends and climb the ranks.",
  },
];

const TOTAL_STEPS = STEPS.length;

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleDismiss = useCallback(async () => {
    try {
      await fetch("/api/onboarding", { method: "PATCH" });
    } catch {
      // Silently fail — modal still closes
    }
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isFirstStep = currentStep === 0;
  const StepIcon = STEPS[currentStep].icon;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 60 : -60,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-white"
        showCloseButton
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Step content with slide animation */}
          <div className="relative h-[160px] w-full overflow-hidden">
            <AnimatePresence mode="wait" custom={1}>
              <motion.div
                key={currentStep}
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                  <StepIcon className="h-7 w-7 text-neutral-800" />
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="text-lg font-semibold text-black">
                    {STEPS[currentStep].title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-600 max-w-xs">
                    {STEPS[currentStep].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentStep ? "bg-black" : "bg-neutral-300"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="h-10 w-10 border-neutral-200 hover:bg-neutral-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleDismiss}
                className="h-10 px-8 bg-black text-white hover:bg-neutral-800"
              >
                Got it
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-10 w-10 border-neutral-200 hover:bg-neutral-100"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
