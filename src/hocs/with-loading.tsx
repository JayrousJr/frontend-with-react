import type { ComponentType } from "react"

type WithLoadingProps = {
  loading: boolean
}

/**
 * Renders a skeleton/fallback while loading is true, then renders the
 * component when loading is false.
 *
 * The skeleton and component share the same layout space — no layout shift.
 *
 * @example
 * const UserCardWithLoading = withLoading(UserCardSkeleton)(UserCard)
 * <UserCardWithLoading loading={isLoading} user={user} />
 */
export function withLoading<TProps extends object>(Skeleton: ComponentType) {
  return function (Component: ComponentType<TProps>) {
    const WithLoading = ({ loading, ...props }: TProps & WithLoadingProps) => {
      if (loading) return <Skeleton />

      return <Component {...(props as TProps)} />
    }

    WithLoading.displayName = `withLoading(${Component.displayName ?? Component.name})`

    return WithLoading
  }
}
