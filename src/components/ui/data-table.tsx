import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { useState, useCallback, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  // Server-side pagination. Changing the page size also fires onPageChange(1),
  // so parents backed by URL search params must apply both with the functional
  // setSearchParams(prev => ...) form — plain object calls would clobber each other.
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  // Search
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  searchValue?: string
  // Enum filters
  filters?: FilterConfig[]
  activeFilters?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  onClearFilters?: () => void
  // State
  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchPlaceholder,
  onSearch,
  searchValue = "",
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()
  const [localSearch, setLocalSearch] = useState(searchValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: Math.ceil(total / pageSize),
  })

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearch(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onSearch?.(value), 300)
    },
    [onSearch]
  )

  const totalPages = Math.ceil(total / pageSize)
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0 || localSearch.length > 0

  return (
    <div className="space-y-4">
      {/* Search + Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {onSearch && (
          <div className="relative max-w-sm min-w-50 flex-1">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder ?? t("dataTable.search")}
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
            {localSearch && (
              <button
                type="button"
                aria-label={t("dataTable.clear")}
                onClick={() => handleSearch("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={activeFilters[filter.key] ?? "all"}
            onValueChange={(val) =>
              onFilterChange?.(filter.key, val === "all" ? "" : val)
            }
          >
            <SelectTrigger className="h-9 w-40">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder={filter.label} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dataTable.all_option", { label: filter.label })}
              </SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleSearch("")
              onClearFilters()
            }}
            className="h-9 text-muted-foreground"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t("dataTable.clear")}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          {t("dataTable.results", { count: total })}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                    {t("actions.loading")}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {t("dataTable.no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("dataTable.rows_per_page")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              onPageSizeChange(Number(v))
              onPageChange(1)
            }}
          >
            <SelectTrigger className="h-8 w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {t("usersPage.page_of", { page, total: totalPages || 1 })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
