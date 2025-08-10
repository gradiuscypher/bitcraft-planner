import { useState, useEffect } from 'react'
import { ChevronDown, Package, RefreshCw } from 'lucide-react'
import { apiService, type RecipeTreeResponse, type RecipeTreeItem } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProjectItemIngredientsProps {
  itemId: number
  itemName: string
  /** When this number changes, collapse all nested toggles */
  collapseAllSignal?: number
}

export function ProjectItemIngredients({ itemId, itemName, collapseAllSignal }: ProjectItemIngredientsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tree, setTree] = useState<RecipeTreeResponse | null>(null)
  const [subStates, setSubStates] = useState<Record<number, { open: boolean; loading: boolean; error: string | null; materials: RecipeTreeItem[] | null }>>({})

  const loadTree = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await apiService.getItemRecipeTree(itemId, 1, true)
      setTree(resp)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load ingredients'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const toggleOpen = async () => {
    const next = !open
    setOpen(next)
    if (next && !tree && !loading) {
      await loadTree()
    }
  }

  const retry = async () => {
    setTree(null)
    await loadTree()
  }

  const toggleSub = async (subItemId: number, subAmount: number) => {
    const current = subStates[subItemId] || { open: false, loading: false, error: null, materials: null }
    const nextOpen = !current.open
    setSubStates((prev) => ({ ...prev, [subItemId]: { ...current, open: nextOpen } }))
    if (nextOpen && current.materials === null && !current.loading) {
      setSubStates((prev) => ({ ...prev, [subItemId]: { ...current, open: true, loading: true, error: null } }))
      try {
        const resp = await apiService.getItemRecipeTree(subItemId, subAmount, true)
        const mats = resp.base_materials || []
        setSubStates((prev) => ({ ...prev, [subItemId]: { open: true, loading: false, error: null, materials: mats } }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load sub-ingredients'
        // Treat 404 as "no sub-ingredients"
        if (typeof msg === 'string' && msg.includes('404')) {
          setSubStates((prev) => ({ ...prev, [subItemId]: { open: true, loading: false, error: null, materials: [] } }))
        } else {
          setSubStates((prev) => ({ ...prev, [subItemId]: { open: true, loading: false, error: msg, materials: null } }))
        }
      }
    }
  }

  // Respond to external collapse-all signal by closing all nested toggles
  // without changing the top-level visibility
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (collapseAllSignal === undefined) return
    // Close top-level dropdown
    setOpen(false)
    setSubStates((prev) => {
      const next: typeof prev = {}
      for (const [k, v] of Object.entries(prev)) {
        next[Number(k)] = { ...v, open: false }
      }
      return next
    })
  }, [collapseAllSignal])

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleOpen}
        className="h-7 text-xs px-2 py-1 flex items-center gap-1"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        {open ? 'Hide Ingredients' : 'View Ingredients'}
      </Button>

      {open && (
        <div className="mt-2 border rounded-md p-2 bg-muted/30">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2" />
              Loading ingredients…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between text-sm text-destructive">
              <span>{error}</span>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={retry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </div>
          )}
          {!loading && !error && tree && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Base materials for <strong className="ml-1">{itemName}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {tree.base_materials.length} materials
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {tree.steps.length} steps
                  </Badge>
                </div>
              </div>
              {tree.base_materials.length === 0 ? (
                <div className="text-sm text-muted-foreground">No base materials. This item may not have a craftable recipe.</div>
              ) : (
                <div className="space-y-1">
                  {tree.base_materials.map((m) => {
                    const sub = subStates[m.item_id]
                    const isOpen = sub?.open
                    const isLoading = sub?.loading
                    const err = sub?.error
                    const materials = sub?.materials
                    return (
                      <div key={`${m.item_id}-${m.amount}`} className="rounded border bg-background">
                        <div className="flex items-center justify-between px-2 py-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleSub(m.item_id, m.amount)}
                              title="View sub-ingredients"
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                            </Button>
                            <a
                              href={`/item/${m.item_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 text-sm font-medium truncate text-foreground hover:underline"
                              title={m.item_name}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {m.item_name}
                            </a>
                          </div>
                          <Badge className="ml-2">×{m.amount}</Badge>
                        </div>
                        {isOpen && (
                          <div className="px-2 pb-2">
                            {isLoading && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2" />
                                Loading…
                              </div>
                            )}
                            {err && (
                              <div className="text-xs text-destructive">{err}</div>
                            )}
                            {!isLoading && !err && (
                              materials && materials.length > 0 ? (
                                <div className="space-y-1 mt-1">
                                  {materials.map((sm) => (
                                    <div key={`${sm.item_id}-${sm.amount}`} className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1">
                                      <a
                                        href={`/item/${sm.item_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="min-w-0 text-sm truncate text-foreground hover:underline"
                                        title={sm.item_name}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {sm.item_name}
                                      </a>
                                      <Badge className="ml-2" variant="secondary">×{sm.amount}</Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground mt-1">No sub-ingredients</div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
