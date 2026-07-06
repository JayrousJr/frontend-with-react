"use client"

import * as React from "react"
import type { HTMLMotionProps, Variants } from "motion/react"
import { motion } from "motion/react"
import { Link } from "react-router"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface GalleryGridCellProps extends HTMLMotionProps<"div"> {
  index: number
}
const SPRING_TRANSITION_CONFIG = {
  type: "spring" as const,
  stiffness: 100,
  damping: 16,
  mass: 0.75,
  restDelta: 0.005,
}
const filterVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
  },
}
const areaClasses = [
  "col-start-2 col-end-3 row-start-1 row-end-3", // .div1
  "col-start-1 col-end-2 row-start-2 row-end-4", // .div2
  "col-start-1 col-end-2 row-start-4 row-end-6", // .div3
  "col-start-2 col-end-3 row-start-3 row-end-5", // .div4
]

export const ContainerStagger = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ transition, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView={"visible"}
      viewport={{ once: true }}
      transition={{
        staggerChildren: transition?.staggerChildren ?? 0.2,
        delayChildren: transition?.delayChildren ?? 0.2,
        duration: 0.3,
        ...transition,
      }}
      {...props}
    />
  )
})
ContainerStagger.displayName = "ContainerStagger"

export const ContainerAnimated = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ transition, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={filterVariants}
      transition={{
        ...SPRING_TRANSITION_CONFIG,
        duration: 0.3,
        ...transition,
      }}
      {...props}
    />
  )
})
ContainerAnimated.displayName = "ContainerAnimated"

export const GalleryGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-2 grid-rows-[50px_150px_50px_150px_50px] gap-4",
        className
      )}
      {...props}
    />
  )
})
GalleryGrid.displayName = "ContainerSticky"

export const GalleryGridCell = React.forwardRef<
  HTMLDivElement,
  GalleryGridCellProps
>(({ className, transition, index, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.3,
        delay: index * 0.2,
        delayChildren: transition?.delayChildren ?? 0.2,
      }}
      className={cn(
        "relative overflow-hidden rounded-xl shadow-xl",
        areaClasses[index],
        className
      )}
      {...props}
    />
  )
})
GalleryGridCell.displayName = "GalleryGridCell"

const tileGradients = [
  "from-violet-500/40 to-fuchsia-500/10",
  "from-blue-500/40 to-cyan-500/10",
  "from-teal-500/40 to-emerald-500/10",
  "from-amber-500/40 to-orange-500/10",
]

interface CtaAction {
  label: string
  href: string
}

interface CtaSectionWithGalleryProps {
  title: string
  subtitle: string
  primaryAction?: CtaAction
  secondaryAction?: CtaAction
  className?: string
}

export default function CtaSectionWithGallery({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  className,
}: CtaSectionWithGalleryProps) {
  return (
    <section
      className={cn(
        "mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 px-4 py-20 md:grid-cols-2",
        className
      )}
    >
      <ContainerStagger className="flex flex-col items-start gap-6">
        <ContainerAnimated>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title}
          </h2>
        </ContainerAnimated>
        <ContainerAnimated>
          <p className="max-w-md text-base text-muted-foreground">{subtitle}</p>
        </ContainerAnimated>
        {(primaryAction || secondaryAction) && (
          <ContainerAnimated className="flex flex-wrap gap-3">
            {primaryAction && (
              <Button asChild>
                <Link to={primaryAction.href}>{primaryAction.label}</Link>
              </Button>
            )}
            {secondaryAction && (
              <Button asChild variant="outline">
                <Link to={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            )}
          </ContainerAnimated>
        )}
      </ContainerStagger>

      <GalleryGrid className="h-105">
        {tileGradients.map((gradient, index) => (
          <GalleryGridCell key={gradient} index={index}>
            <div
              className={cn(
                "h-full w-full bg-linear-to-br",
                gradient,
                "bg-muted"
              )}
            />
          </GalleryGridCell>
        ))}
      </GalleryGrid>
    </section>
  )
}
