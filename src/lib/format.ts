import i18n from "@/config/i18n"
/**
 * Format a date to a readable string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A"

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) return "Invalid Date"

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format a date to a long format (e.g., "January 15, 2024")
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "N/A"

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) return "Invalid Date"

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Format a date with time (e.g., "Jan 15, 2024, 3:30 PM")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "N/A"

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) return "Invalid Date"

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Format a date relative to now — past dates read "2 hours ago", future
 * dates (e.g. an expiry) read "in 2 hours".
 */
export function formatRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) return "N/A"

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) return "Invalid Date"

  const now = new Date()
  const diffInMs = now.getTime() - d.getTime()
  const isFuture = diffInMs < 0
  const absMs = Math.abs(diffInMs)

  const diffInSeconds = Math.floor(absMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  const key = (unit: string) => (isFuture ? `time.in_${unit}` : `time.${unit}`)

  if (diffInSeconds < 60) {
    return i18n.t(isFuture ? "time.soon" : "time.justNow")
  } else if (diffInMinutes < 60) {
    return i18n.t(key("minute"), { count: diffInMinutes })
  } else if (diffInHours < 24) {
    return i18n.t(key("hour"), { count: diffInHours })
  } else if (diffInDays < 30) {
    return i18n.t(key("day"), { count: diffInDays })
  } else if (diffInMonths < 12) {
    return i18n.t(key("month"), { count: diffInMonths })
  } else {
    return i18n.t(key("year"), { count: diffInYears })
  }
}

/**
 * Format date to time only (e.g., "3:30 PM")
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "N/A"

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) return "Invalid Time"

  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

// CURRENCY FORMATTING

/**
 * Format number as Tanzanian Shillings (TZS)
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: "TZS" | "USD" | "EUR" = "TZS"
): string {
  if (amount === null || amount === undefined) return "TZS 0"

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount

  if (isNaN(numAmount)) return "TZS 0"

  const currencySymbols = {
    TZS: "TZS",
    USD: "$",
    EUR: "€",
  }

  const formatted = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return `${currencySymbols[currency]} ${formatted}`
}

/**
 * Format currency with full precision (always 2 decimal places)
 */
export function formatCurrencyPrecise(
  amount: number | string | null | undefined,
  currency: "TZS" | "USD" | "EUR" = "TZS"
): string {
  if (amount === null || amount === undefined) return "TZS 0.00"

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount

  if (isNaN(numAmount)) return "TZS 0.00"

  const currencySymbols = {
    TZS: "TZS",
    USD: "$",
    EUR: "€",
  }

  const formatted = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return `${currencySymbols[currency]} ${formatted}`
}

/**
 * Format currency in compact form (e.g., "1.2K", "3.5M")
 */
export function formatCurrencyCompact(
  amount: number | string | null | undefined,
  currency: "TZS" | "USD" | "EUR" = "TZS"
): string {
  if (amount === null || amount === undefined) return "TZS 0"

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount

  if (isNaN(numAmount)) return "TZS 0"

  const currencySymbols = {
    TZS: "TZS",
    USD: "$",
    EUR: "€",
  }

  const absAmount = Math.abs(numAmount)

  let formatted: string
  if (absAmount >= 1000000000) {
    formatted = (numAmount / 1000000000).toFixed(1) + "B"
  } else if (absAmount >= 1000000) {
    formatted = (numAmount / 1000000).toFixed(1) + "M"
  } else if (absAmount >= 1000) {
    formatted = (numAmount / 1000).toFixed(1) + "K"
  } else {
    formatted = numAmount.toFixed(0)
  }

  return `${currencySymbols[currency]} ${formatted}`
}

// NUMBER FORMATTING

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "0"

  const numValue = typeof num === "string" ? parseFloat(num) : num

  if (isNaN(numValue)) return "0"

  return numValue.toLocaleString("en-US")
}

/**
 * Format number as percentage
 */
export function formatPercentage(
  num: number | null | undefined,
  decimals: number = 1
): string {
  if (num === null || num === undefined) return "0%"

  if (isNaN(num)) return "0%"

  return `${num.toFixed(decimals)}%`
}

/**
 * Format number in compact form (e.g., "1.2K", "3.5M")
 */
export function formatNumberCompact(
  num: number | string | null | undefined
): string {
  if (num === null || num === undefined) return "0"

  const numValue = typeof num === "string" ? parseFloat(num) : num

  if (isNaN(numValue)) return "0"

  const absNum = Math.abs(numValue)

  if (absNum >= 1000000000) {
    return (numValue / 1000000000).toFixed(1) + "B"
  } else if (absNum >= 1000000) {
    return (numValue / 1000000).toFixed(1) + "M"
  } else if (absNum >= 1000) {
    return (numValue / 1000).toFixed(1) + "K"
  } else {
    return numValue.toString()
  }
}

// TEXT FORMATTING

/**
 * Truncate text to specified length with ellipsis
 */
export function truncate(
  text: string | null | undefined,
  length: number = 50
): string {
  if (!text) return ""

  if (text.length <= length) return text

  return text.substring(0, length) + "..."
}

/**
 * Capitalize first letter of each word
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return ""

  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Convert text to title case
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return ""

  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Convert snake_case or kebab-case to Sentence case
 */
export function toSentenceCase(text: string | null | undefined): string {
  if (!text) return ""

  return text
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase()
    )
    .join(" ")
}

/**
 * Get initials from name (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "NA"

  const parts = name.trim().split(" ")

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// PHONE NUMBER FORMATTING

/**
 * Format phone number (Tanzania format: +255 XXX XXX XXX)
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "N/A"

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")

  // Check if it's a Tanzanian number
  if (digits.startsWith("255")) {
    // Format as +255 XXX XXX XXX
    return `+${digits.substring(0, 3)} ${digits.substring(
      3,
      6
    )} ${digits.substring(6, 9)} ${digits.substring(9)}`
  } else if (digits.startsWith("0") && digits.length === 10) {
    // Convert 0XXX to +255XXX and format
    const formatted = "255" + digits.substring(1)
    return `+${formatted.substring(0, 3)} ${formatted.substring(
      3,
      6
    )} ${formatted.substring(6, 9)} ${formatted.substring(9)}`
  }

  // Return as-is if format is unknown
  return phone
}

// FILE SIZE FORMATTING

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

// RATING FORMATTING

/**
 * Format rating with stars (e.g., "4.5 ⭐")
 */
export function formatRating(
  rating: number | null | undefined,
  maxRating: number = 5
): string {
  if (rating === null || rating === undefined) return "No rating"

  const stars = "⭐".repeat(Math.min(Math.round(rating), maxRating))
  return `${rating} ${stars}`
}

/**
 * Format rating as percentage
 */
export function formatRatingPercentage(
  rating: number | null | undefined,
  maxRating: number = 5
): string {
  if (rating === null || rating === undefined) return "0%"

  const percentage = (rating / maxRating) * 100
  return `${percentage.toFixed(0)}%`
}

// STATUS FORMATTING

/**
 * Format verification status to readable text
 */
export function formatVerificationStatus(
  status: "PENDING" | "APPROVED" | "REJECTED" | null | undefined
): string {
  if (!status) return "Unknown"

  const statusMap = {
    PENDING: "Pending Verification",
    APPROVED: "Verified",
    REJECTED: "Rejected",
  }

  return statusMap[status] || status
}

/**
 * Format payment status to readable text
 */
export function formatPaymentStatus(
  status: "PENDING" | "SUCCESS" | "FAILED" | null | undefined
): string {
  if (!status) return "Unknown"

  const statusMap = {
    PENDING: "Pending",
    SUCCESS: "Successful",
    FAILED: "Failed",
  }

  return statusMap[status] || status
}

/**
 * Format order status to readable text
 */
export function formatOrderStatus(
  status:
    | "PENDING"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | null
    | undefined
): string {
  if (!status) return "Unknown"

  const statusMap = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  }

  return statusMap[status] || status
}

// ADDRESS FORMATTING

/**
 * Format full address from components
 */
export function formatAddress(
  street?: string | null,
  city?: string | null,
  region?: string | null,
  country?: string | null
): string {
  const parts = [street, city, region, country].filter(Boolean)

  if (parts.length === 0) return "No address provided"

  return parts.join(", ")
}

// EXPIRY/DURATION FORMATTING

/**
 * Get days remaining until a date
 */
export function getDaysRemaining(
  date: string | Date | null | undefined
): number {
  if (!date) return 0

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) return 0

  const now = new Date()
  const diffInMs = d.getTime() - now.getTime()
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))

  return diffInDays
}

/**
 * Format expiry status (e.g., "Expires in 5 days", "Expired 2 days ago")
 */
export function formatExpiry(date: string | Date | null | undefined): string {
  const daysRemaining = getDaysRemaining(date)

  if (daysRemaining > 0) {
    return `Expires in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
  } else if (daysRemaining === 0) {
    return "Expires today"
  } else {
    const daysAgo = Math.abs(daysRemaining)
    return `Expired ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`
  }
}

import { API_URL } from "./api-url"

export function resolveImageUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${API_URL}/files/download/${url.replace(/^\//, "")}`
}

export function buildImageUrl(uri: string | null | undefined): string | null {
  if (!uri) return null
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri
  return `${API_URL}/files/download/${uri.replace(/^\//, "")}`
}
