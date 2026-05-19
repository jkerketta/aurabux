"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Eye, EyeOff, Plus } from "lucide-react";

interface DashboardContentProps {
  user: User;
  initialBalance: number;
  initialTotalValue: number;
  username: string;
  greeting: string;
}

// Static objects — extracted outside component to avoid recreation on every render
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DashboardContent({
  user: _user,
  initialBalance,
  initialTotalValue,
  username,
  greeting,
}: DashboardContentProps) {
  const [showValues, setShowValues] = useState(true);

  const displayBalance = showValues ? formatCurrency(initialBalance) : "••••••";
  const displayTotalValue = showValues ? formatCurrency(initialTotalValue) : "••••••";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-20"
    >
      {/* Greeting Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          {greeting}, {username || "Trader"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3 mb-8">
        {/* ABX Balance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ABX Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[#00C805]">
              {displayBalance}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">ABX</p>
          </CardContent>
        </Card>

        {/* Total Value Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-black">
              {displayTotalValue}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">ABX</p>
          </CardContent>
        </Card>

        {/* Starting Balance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Starting Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-muted-foreground">
              1,000.00
            </p>
            <p className="mt-1 text-xs text-muted-foreground">ABX</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio Value Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Portfolio Value
              </CardDescription>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowValues(!showValues)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {showValues ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold tracking-tight text-black">
              {displayTotalValue} ABX
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[#00C805] border-[#00C805]">
                +0.00%
              </Badge>
              <span className="text-sm text-muted-foreground">All time</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Holdings Section */}
      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-black">Holdings</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <Plus className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-black">No holdings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start trading to build your portfolio
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
