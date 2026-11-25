import * as React from "react"

/**
 * Element that nested base-ui popups (e.g. Combobox) should portal into.
 *
 * Radix modal overlays (Dialog, Sheet) trap focus, disable pointer events on
 * everything outside their content, and close on outside pointer-down. A
 * base-ui popup portalled to <body> is "outside" — so mouse clicks on its
 * items are swallowed or close the dialog, and its search input loses focus.
 * Overlays provide their content element here so popups render inside it.
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(
  null
)

export function usePortalContainer() {
  return React.useContext(PortalContainerContext)
}

/** Stores the overlay node in state (so consumers re-render) and forwards it to `ref`. */
export function usePortalContainerRef<T extends HTMLElement>(
  ref: React.Ref<T> | undefined
) {
  const [node, setNode] = React.useState<T | null>(null)
  React.useImperativeHandle(ref, () => node as T, [node])
  return [node, setNode] as const
}
