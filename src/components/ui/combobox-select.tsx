import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { ChevronDownIcon, SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export interface ComboboxSelectOption {
  value: string
  label: string
  /** Rendered before the label in the list and in the default trigger. */
  icon?: React.ReactNode
  disabled?: boolean
}

export interface ComboboxSelectProps {
  options: ComboboxSelectOption[]
  value: string | null | undefined
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Show the search input inside the popup. Defaults to true. */
  searchable?: boolean
  /** Optional leading icon rendered inside the trigger. */
  icon?: React.ReactNode
  disabled?: boolean
  size?: "sm" | "default"
  className?: string
  contentClassName?: string
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  id?: string
  name?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
  /**
   * Custom trigger element (e.g. an icon `<Button>` or `<SidebarMenuButton>`).
   * Its children are rendered as-is; open/close, ARIA and keyboard props are
   * merged onto it. When omitted, a select-styled button is rendered.
   */
  trigger?: React.ReactElement
  /** Extra content pinned below the list (e.g. an "Add new" action). */
  footer?: React.ReactNode
  /** Extra classes for each item (e.g. bigger padding). */
  itemClassName?: string
}

/**
 * Select-style combobox: a button trigger that opens a popup with an optional
 * search input and a filterable list. Drop-in replacement for `<Select>`.
 *
 * Mouse/keyboard behavior:
 * - Hover and keyboard share ONE highlight (`data-highlighted`), so there is
 *   never a "hovered" item fighting a "keyboard-active" item. Items must not
 *   use `hover:` styles for this reason.
 * - Highlight is dropped when the pointer leaves the list (`keepHighlight`
 *   false), so Enter never selects an item the user is no longer pointing at.
 * - Selecting an already-selected item does not fire `onValueChange` again,
 *   and deselection (null) is ignored — a select always holds a value.
 */
function ComboboxSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  searchable = true,
  icon,
  disabled,
  size = "default",
  className,
  contentClassName,
  side = "bottom",
  align = "start",
  id,
  name,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  trigger,
  footer,
  itemClassName,
}: ComboboxSelectProps) {
  const { t } = useTranslation()
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  return (
    <Combobox<ComboboxSelectOption>
      items={options}
      value={selected}
      onValueChange={(next) => {
        if (next && next.value !== value) onValueChange(next.value)
      }}
      itemToStringLabel={(o) => o.label}
      itemToStringValue={(o) => o.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      highlightItemOnHover
      disabled={disabled}
      name={name}
    >
      {trigger ? (
        <ComboboxPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          render={trigger}
        />
      ) : (
        <ComboboxPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          data-slot="combobox-select-trigger"
          data-size={size}
          data-placeholder={selected ? undefined : ""}
          className={cn(
            "flex w-fit cursor-pointer items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {icon}
            {selected?.icon}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </ComboboxPrimitive.Trigger>
      )}

      <ComboboxContent
        side={side}
        align={align}
        className={cn("min-w-(--anchor-width)", contentClassName)}
      >
        {searchable && (
          <div className="flex items-center gap-2 border-b px-2.5">
            <SearchIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
            <ComboboxPrimitive.Input
              placeholder={searchPlaceholder ?? t("dataTable.search")}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
        <ComboboxEmpty>{emptyText ?? t("dataTable.no_results")}</ComboboxEmpty>
        <ComboboxList>
          {(option: ComboboxSelectOption) => (
            <ComboboxItem
              key={option.value}
              value={option}
              disabled={option.disabled}
              className={cn("cursor-pointer", itemClassName)}
            >
              {option.icon}
              <span className="truncate">{option.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
        {footer && <div className="border-t p-1">{footer}</div>}
      </ComboboxContent>
    </Combobox>
  )
}

export { ComboboxSelect }
