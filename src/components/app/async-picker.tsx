import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type PickerOption = {
  value: string
  label: string
  hint?: string
}

/**
 * Searchable single-select backed by a server search (debounced).
 * `selected` is kept by the parent so the label survives re-searches.
 */
export function AsyncPicker({
  selected,
  onChange,
  search,
  placeholder,
  disabled,
  clearable = true,
  id,
  invalid,
}: {
  selected: PickerOption | null
  onChange: (option: PickerOption | null) => void
  search: (query: string) => Promise<PickerOption[]>
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  id?: string
  invalid?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<PickerOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const handle = setTimeout(() => {
      setLoading(true)
      search(query)
        .then((o) => !cancelled && setOptions(o))
        .catch(() => !cancelled && setOptions([]))
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [open, query, search])

  return (
    <div className="flex w-full min-w-0 items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className="w-full min-w-0 justify-between font-normal"
          >
            <span
              className={cn("truncate", !selected && "text-muted-foreground")}
            >
              {selected?.label ?? placeholder ?? t("picker.select", "Select…")}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) min-w-72 p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={t("picker.search", "Search…")}
            />
            <CommandList>
              {loading ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {t("picker.no_results", "No results")}
                  </CommandEmpty>
                  <CommandGroup>
                    {options.map((o) => (
                      <CommandItem
                        key={o.value}
                        value={o.value}
                        onSelect={() => {
                          onChange(o)
                          setOpen(false)
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4",
                            selected?.value === o.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="min-w-0">
                          <div className="truncate">{o.label}</div>
                          {o.hint && (
                            <div className="truncate text-xs text-muted-foreground">
                              {o.hint}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {clearable && selected && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("picker.clear", "Clear")}
          onClick={() => onChange(null)}
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}
