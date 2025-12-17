"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";


interface AnimatedDisclosureProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedDisclosure({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className,
}: AnimatedDisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 sm:px-5 sm:py-4",
        "shadow-md shadow-slate-950/40 backdrop-blur",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left"
        )}
      >
        <div>
          <div className="text-sm font-semibold text-slate-50 sm:text-base">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              {subtitle}
            </div>
          )}
        </div>

        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700",
            "bg-slate-900/80 text-slate-300 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ overflow: "hidden" }}
            className="mt-3 sm:mt-4"
          >
            <div className="pb-1 text-xs text-slate-300 sm:text-sm">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
