"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Compass, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"

interface WelcomeToZineMapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WelcomeToZineMapModal({ open, onOpenChange }: WelcomeToZineMapModalProps) {
  const router = useRouter()
  const [contributorCount, setContributorCount] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return

    let mounted = true

    const loadContributorCount = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })

      if (!mounted || error || typeof count !== "number") return
      setContributorCount(count)
    }

    loadContributorCount()

    return () => {
      mounted = false
    }
  }, [open])

  const contributorText = useMemo(() => {
    if (typeof contributorCount !== "number") return ""
    return `${new Intl.NumberFormat("en-US").format(contributorCount)}`
  }, [contributorCount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-stone-200 p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-rose-50 via-white to-stone-50 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-gloria text-3xl text-stone-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              <span>Welcome to ZineMap!</span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-5 space-y-4 text-[15px] leading-7 text-stone-700 font-serif">
            <p>
              It&apos;s not always easy to find your way into the zine world. Here&apos;s a map :)
            </p>
            <p>
              Find{" "}
              <Link href="/stores" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                shops
              </Link>
              {" "}that stock zines,{" "}
              <Link href="/libraries" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                libraries
              </Link>
              {" "}with zine collections,{" "}
              <Link href="/events" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                zine fests, swaps and workshops
              </Link>
              , and connect with{" "}
              <Link href="/zinesters" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                zinesters
              </Link>
              {" "}around the world!
            </p>
            <p>
              <Link href="/login?mode=signup" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                Sign up
              </Link>{" "}
              to save pins,{" "}
              <Link href="/zines" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                upload your zines
              </Link>
              ,{" "}
              <Link href="/login?mode=signup" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-700">
                create a zinester profile
              </Link>
              , and join a growing community of{" "}
              <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono font-bold text-rose-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
                {contributorText}
              </span>{" "}
              contributors mapping the global zine scene together.
            </p>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-stone-300 text-stone-700 hover:bg-stone-100"
              onClick={() => onOpenChange(false)}
            >
              <Compass className="mr-2 h-4 w-4" />
              Explore the map
            </Button>
            <Button
              className="bg-rose-500 text-white hover:bg-rose-600"
              onClick={() => {
                onOpenChange(false)
                router.push("/login?mode=signup")
              }}
            >
              Sign up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
