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
  /** Persist key for remembering open state (e.g., `${projectId}:${itemId}`) */
  persistKey?: string
}

interface NestedIngredientsLayerProps {
  materials: RecipeTreeItem[]
  depth: number
  maxDepth: number
  collapseAllSignalForLayer: number
}

function NestedIngredientsLayer({ materials, depth, maxDepth, collapseAllSignalForLayer }: NestedIngredientsLayerProps) {
  const [states, setStates] = useState<Record<number, { open: boolean; loading: boolean; error: string | null; children: RecipeTreeItem[] | null }>>({})

  useEffect(() => {
    // Collapse all in this layer
    setStates((prev) => {
      const next: typeof prev = {}
      for (const [k, v] of Object.entries(prev)) {
        next[Number(k)] = { ...v, open: false }
      }
      return next
    })
  }, [collapseAllSignalForLayer])

  const handleToggle = async (m: RecipeTreeItem) => {
    const canExpand = depth < maxDepth
    if (!canExpand) return
    const current = states[m.item_id] || { open: false, loading: false, error: null, children: null }
    const nextOpen = !current.open
    setStates((prev) => ({ ...prev, [m.item_id]: { ...current, open: nextOpen } }))
    if (nextOpen && current.children === null && !current.loading) {
      setStates((prev) => ({ ...prev, [m.item_id]: { ...current, open: true, loading: true, error: null } }))
      try {
        const resp = await apiService.getItemRecipeTree(m.item_id, m.amount, true)
        const mats = resp.base_materials || []
        setStates((prev) => ({ ...prev, [m.item_id]: { open: true, loading: false, error: null, children: mats } }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load sub-ingredients'
        if (typeof msg === 'string' && msg.includes('404')) {
          setStates((prev) => ({ ...prev, [m.item_id]: { open: true, loading: false, error: null, children: [] } }))
        } else {
          setStates((prev) => ({ ...prev, [m.item_id]: { open: true, loading: false, error: msg, children: null } }))
        }
      }
    }
  }

  return (
    <div className="space-y-1">
      {materials.map((m) => {
        const state = states[m.item_id]
        const isOpen = !!state?.open
        const isLoading = !!state?.loading
        const err = state?.error || null
        const children = state?.children
        const canExpand = depth < maxDepth
        return (
          <div key={`${depth}-${m.item_id}-${m.amount}`} className="rounded border bg-background">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleToggle(m)}
                  title={canExpand ? 'View sub-ingredients' : 'Max depth reached'}
                  disabled={!canExpand}
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'} ${canExpand ? '' : 'opacity-30'}`} />
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
                  children && children.length > 0 ? (
                    <div className="mt-1">
                      <NestedIngredientsLayer
                        materials={children}
                        depth={depth + 1}
                        maxDepth={maxDepth}
                        collapseAllSignalForLayer={collapseAllSignalForLayer}
                      />
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
  )
}

export function ProjectItemIngredients({ itemId, itemName, collapseAllSignal, persistKey }: ProjectItemIngredientsProps) {
  const [open, setOpen] = useState(() => {
    if (!persistKey) return false
    try {
      return localStorage.getItem(`ingredients-open:${persistKey}`) === '1'
    } catch {
      return false
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tree, setTree] = useState<RecipeTreeResponse | null>(null)
  // Cache collapse signal to avoid re-render toggling open state due to parent rerenders
  const [lastCollapseSignal, setLastCollapseSignal] = useState<number | undefined>(() => collapseAllSignal)

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
    console.debug('[Ingredients] toggleOpen', { itemId, next, persistKey })
    if (persistKey) {
      try { localStorage.setItem(`ingredients-open:${persistKey}`, next ? '1' : '0') } catch {}
    }
    if (next && !tree && !loading) {
      await loadTree()
    }
  }

  const retry = async () => {
    setTree(null)
    await loadTree()
  }

  // (Removed inline IngredientsLayer to avoid remounts on parent rerenders)

  // Close the top-level dropdown when a global collapse is triggered.
  useEffect(() => {
    if (collapseAllSignal === undefined) return
    if (lastCollapseSignal !== collapseAllSignal) {
      console.debug('[Ingredients] collapseAllSignal changed -> closing', { itemId, collapseAllSignal, lastCollapseSignal })
      setOpen(false)
      if (persistKey) {
        try { localStorage.setItem(`ingredients-open:${persistKey}`, '0') } catch {}
      }
      setLastCollapseSignal(collapseAllSignal)
    }
  }, [collapseAllSignal, lastCollapseSignal])

  // Persist on open state change (user-driven, not collapse-all)
  useEffect(() => {
    if (!persistKey) return
    try {
      localStorage.setItem(`ingredients-open:${persistKey}`, open ? '1' : '0')
      console.debug('[Ingredients] persist state', { itemId, open, persistKey })
    } catch {}
  }, [open, persistKey])

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
          {!loading && !error && tree && open && (
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
                <NestedIngredientsLayer materials={tree.base_materials} depth={1} maxDepth={5} collapseAllSignalForLayer={collapseAllSignal ?? 0} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
