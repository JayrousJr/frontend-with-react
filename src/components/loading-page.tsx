import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  className?: string
  fullScreen?: boolean
}

export function Loading({
  size = "md",
  className,
  fullScreen = false,
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const spinner = (
    <div
      className={cn(
        "border-gray-00 animate-spin rounded-full border-2 border-t-blue-500",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
const LoadingPage = () => {
  return <Loading fullScreen size="lg" />
}

export default LoadingPage
