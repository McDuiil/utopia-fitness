import React, { ReactNode, useRef } from "react";
import { cn } from "@/src/lib/utils";
import { motion, HTMLMotionProps } from "motion/react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: 'strong' | 'medium' | 'weak';
}

export default function GlassCard({ children, className, delay = 0, variant = 'strong', ...props }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty("--x", `${x}%`);
    cardRef.current.style.setProperty("--y", `${y}%`);
  };

  const variantClass = {
    strong: 'glass-strong',
    medium: 'glass-medium',
    weak: 'glass-weak'
  }[variant];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "glass-card group",
        variantClass,
        "p-6", // Default safe padding
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
