"use client"

import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import type { LucideIcon } from "lucide-react"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  span?: "default" | "wide" | "tall"
}

interface FeatureSectionProps {
  title?: string
  subtitle?: string
  features: Feature[]
  className?: string
}

const spanClasses = {
  default: "col-span-1 row-span-1",
  wide: "col-span-1 md:col-span-2 row-span-1",
  tall: "col-span-1 row-span-1 md:row-span-2",
}

export function Component({
  title = "Everything you need",
  subtitle = "Powerful features to help you build, ship, and scale — without the complexity.",
  features,
  className,
}: FeatureSectionProps) {
  return (
    <section className={cn("mx-auto w-full max-w-5xl px-4 py-20", className)}>
      {/* Header */}
      <motion.div
        className="mb-14 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto max-w-lg text-base text-muted-foreground md:text-lg">
          {subtitle}
        </p>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((feature, i) => {
          const Icon = feature.icon
          const span = feature.span || "default"

          return (
            <motion.div
              key={feature.title}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/50",
                spanClasses[span],
                span === "tall" && "min-h-[280px]"
              )}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1 + i * 0.07,
                ease: [0.32, 0.72, 0, 1],
              }}
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative z-10">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
                  <Icon className="size-5 text-foreground" />
                </div>

                <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>

              {/* Bottom accent line on hover */}
              <div className="relative z-10 mt-4">
                <div className="h-px w-0 bg-foreground/10 transition-all duration-500 group-hover:w-full" />
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
