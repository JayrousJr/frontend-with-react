// Adds DOM matchers (toBeInTheDocument, toHaveAttribute, …) to Vitest's
// expect. Safe under the default node environment too — it only extends
// matchers, so pure-logic tests are unaffected.
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// testing-library only auto-cleans between tests when test globals are
// enabled; this project keeps globals off, so unmount rendered trees
// explicitly or every render leaks into the next test.
afterEach(cleanup)
