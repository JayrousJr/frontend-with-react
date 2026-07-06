import LoadingPage from "@/components/loading-page"
import { Suspense } from "react"

const LazyBoundary = ({ children }: { children: React.ReactNode }) => {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>
}

export default LazyBoundary
