// Type declaration for next/navigation - fixes IDE resolution to next/navigation.js
declare module "next/navigation" {
  interface AppRouterInstance {
    push(href: string): void
    replace(href: string): void
    back(): void
    forward(): void
    refresh(): void
    prefetch(href: string): void
  }
  export function useRouter(): AppRouterInstance
  export function usePathname(): string
  export function useSearchParams(): URLSearchParams
  export function useParams(): Record<string, string | string[]>
}
