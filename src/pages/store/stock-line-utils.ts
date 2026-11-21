import type { PickerOption } from "@/components/app/async-picker"

export type QtyLine = {
  key: number
  product: PickerOption | null
  /** "<locationUniqueId>|<batch>" */
  source: string
  quantity: string
}

let seq = 0
export const newQtyLine = (): QtyLine => ({
  key: ++seq,
  product: null,
  source: "",
  quantity: "1",
})

export const splitSource = (source: string) => {
  const [locationUniqueId, batch] = source.split("|")
  return { locationUniqueId, batchNumber: batch || null }
}
