import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { apiService, type RecipeTreeResponse } from '@/lib/api'
import { projectsService } from '@/lib/projects-service'
import { useAuth } from '@/hooks/use-auth'
import type { ProjectWithItems } from '@/types/projects'

interface RecipeTreeFlowProps {
  itemId: number
  itemName: string
  onAddToProject?: () => void
}

export function RecipeTreeFlow({ itemId, itemName, onAddToProject }: RecipeTreeFlowProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recipeTree, setRecipeTree] = useState<RecipeTreeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(1)
  const [projects, setProjects] = useState<ProjectWithItems[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [addingToProject, setAddingToProject] = useState(false)
  const [itemTiers, setItemTiers] = useState<Record<number, number>>({})

  const loadRecipeTree = async () => {
    if (!itemId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const tree = await apiService.getItemRecipeTree(itemId, amount, false)
      setRecipeTree(tree)
      // Preload tiers for base materials
      try {
        const uniqueIds = Array.from(new Set(tree.base_materials.map((m) => m.item_id)))
        const results = await Promise.allSettled(uniqueIds.map((id) => apiService.getItem(id)))
        const nextMap: Record<number, number> = {}
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const tier = (res.value as any).tier as number | undefined
            if (typeof tier === 'number') {
              nextMap[uniqueIds[idx]] = tier
            }
          }
        })
        setItemTiers((prev) => ({ ...prev, ...nextMap }))
      } catch (tierErr) {
        // Ignore tier preload errors
        console.warn('Failed to preload item tiers for base materials', tierErr)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recipe tree. This item may not have a craftable recipe.'
      setError(errorMessage)
      console.error('Error loading recipe tree:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    if (!user) return
    
    try {
      const userProjects = await projectsService.getUserProjects()
      setProjects(userProjects)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  const handleAddBaseIngredientsToProject = async () => {
    if (!recipeTree || !selectedProject || !recipeTree.base_materials.length) return
    
    setAddingToProject(true)
    try {
      // Add each base material to the selected project
      for (const material of recipeTree.base_materials) {
        await projectsService.addItemToProject(
          selectedProject,
          material.item_id,
          material.amount,
          'item'
        )
      }
      
      // Callback to refresh parent component if provided
      if (onAddToProject) {
        onAddToProject()
      }
      
      alert(`Successfully added ${recipeTree.base_materials.length} base ingredients to project!`)
    } catch (err) {
      console.error('Failed to add ingredients to project:', err)
      alert('Failed to add some ingredients to project. Please try again.')
    } finally {
      setAddingToProject(false)
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Base Materials Calculator
        </CardTitle>
        <CardDescription>
          Calculate all base materials needed to craft {itemName} and add them to your projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount input and load button */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="amount">Amount to craft</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
          </div>
          <Button onClick={loadRecipeTree} disabled={loading}>
            {loading ? 'Calculating materials...' : 'Calculate Materials'}
          </Button>
        </div>

        {/* Project selection - show after materials are calculated */}
        {recipeTree && user && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium flex items-center gap-2 text-blue-900 dark:text-blue-100 mb-3">
              <Plus className="h-4 w-4" />
              Add All Materials to Project
            </h4>
            
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="project-select" className="text-blue-700 dark:text-blue-300">Select Project</Label>
                <select
                  id="project-select"
                  className="w-full p-2 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900"
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : null)}
                  onFocus={loadProjects}
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleAddBaseIngredientsToProject}
                disabled={!selectedProject || addingToProject}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addingToProject ? 'Adding...' : `Add ${recipeTree.base_materials.length} Materials`}
              </Button>
            </div>
            
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              This will add all base materials with their quantities to your selected project.
            </p>
          </div>
        )}

        {loading && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Calculating base materials...
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  Complex recipes may take up to 2 minutes to calculate
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {recipeTree && (
          <div className="space-y-6">
            <Separator />
            
            {/* Recipe summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Required Base Materials</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {recipeTree.base_materials.length} materials
                  </Badge>
                  <Badge variant="secondary">
                    {recipeTree.steps.length} crafting steps
                  </Badge>
                </div>
              </div>
              
              {/* Summary info */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>To craft <strong>{amount}×{recipeTree.item_name}</strong>, you need these base materials:</span>
                </div>
              </div>
            </div>

            {/* Base materials grid */}
                {recipeTree.base_materials.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {recipeTree.base_materials.map((material) => (
                    <div 
                      key={`${material.item_id}-${material.amount}`}
                      className="p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 transition-colors cursor-pointer hover:border-green-300 dark:hover:border-green-700"
                      onClick={() => navigate(`/item/${material.item_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <div className="min-w-0">
                                <span className="font-medium text-sm text-green-900 dark:text-green-100 block truncate flex items-center gap-2">
                                  <span className="truncate">{material.item_name}</span>
                                  {/* Show tier if known */}
                                  {itemTiers[material.item_id] ? (
                                    <span className="flex-shrink-0">
                                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-[10px] h-5 px-1.5">
                                        T{itemTiers[material.item_id]}
                                      </Badge>
                                    </span>
                                  ) : null}
                                </span>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Click for details
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-600 text-white text-xs px-2 py-1 ml-2 flex-shrink-0">
                          ×{material.amount.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}