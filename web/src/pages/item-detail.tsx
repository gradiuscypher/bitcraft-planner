import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeft, 
  Package, 
  Building, 
  Truck, 
  Search, 
  ExternalLink,
  Clock,
  Zap,
  Trophy,
  User,
  ChefHat,
  Wrench,
  Target
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { apiService, type ItemDetail, type BuildingDetail, type CargoDetail } from '@/lib/api'

type ItemDetailData = ItemDetail | BuildingDetail | CargoDetail

interface RecipeData {
  id: number
  name: string
  time_requirement: number
  stamina_requirement: number
  tool_durability_lost: number
  building_requirement?: {
    building_id: number
    building_name: string
    tier: number
  }
  level_requirements?: Array<{
    skill_name: string
    level: number
  }>
  tool_requirements?: Array<{
    tool_id: number
    tool_name: string
    tier: number
  }>
  consumed_items?: Array<{
    id: number
    name: string
    count: number
  }>
  experience_per_progress?: Array<{
    skill_name: string
    experience_per_level: number
  }>
  crafted_items?: Array<{
    id: number
    name: string
    count: number
  }>
  actions_required: number
  tool_mesh_index: number
  is_passive: boolean
}

interface ItemWithRecipe {
  id: number
  name: string
  recipe?: RecipeData
  [key: string]: unknown
}

export function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [item, setItem] = useState<ItemWithRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Determine type from the URL path
  const type = location.pathname.split('/')[1] // 'item', 'building', or 'cargo'

  const getItemDescription = (item: ItemWithRecipe): string => {
    const itemWithDescription = item as Record<string, unknown>
    return typeof itemWithDescription.description === 'string' 
      ? itemWithDescription.description 
      : getItemTypeDescription(type || null)
  }

  useEffect(() => {
    if (!type || !id) {
      navigate('/')
      return
    }

    const fetchItemDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const numericId = parseInt(id, 10)
        if (isNaN(numericId)) {
          throw new Error('Invalid item ID')
        }

        let itemData: ItemDetailData
        
        switch (type) {
          case 'item':
            itemData = await apiService.getItem(numericId)
            break
          case 'building':
            itemData = await apiService.getBuilding(numericId)
            break
          case 'cargo':
            itemData = await apiService.getCargo(numericId)
            break
          default:
            throw new Error('Invalid item type')
        }

        setItem(itemData as ItemWithRecipe)
      } catch (err) {
        setError('Failed to load item details. Please try again.')
        console.error('Item detail fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItemDetails()
  }, [type, id, navigate])

  const getItemIcon = (itemType: string | null) => {
    switch (itemType) {
      case 'item':
        return <Package className="h-6 w-6" />
      case 'building':
        return <Building className="h-6 w-6" />
      case 'cargo':
        return <Truck className="h-6 w-6" />
      default:
        return <Search className="h-6 w-6" />
    }
  }

  const getItemTypeColor = (itemType: string | null) => {
    switch (itemType) {
      case 'item':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'building':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cargo':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getItemTypeDescription = (itemType: string | null) => {
    switch (itemType) {
      case 'item':
        return 'This is a craftable item in Bitcraft. Items can be used for crafting, trading, or consumed for various effects.'
      case 'building':
        return 'This is a building structure in Bitcraft. Buildings provide crafting stations, storage, and various utilities for players.'
      case 'cargo':
        return 'This is a cargo resource in Bitcraft. Cargo can be transported and used in various crafting recipes and building projects.'
      default:
        return 'This is a game asset in Bitcraft with various uses and properties.'
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) return `${minutes}m`
    return `${minutes}m ${remainingSeconds}s`
  }

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 2:
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
      case 3:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
      case 4:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
      case 5:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Search className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading item details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-4 p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive">{error || 'Item not found'}</p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/')}>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="text-primary">
              {getItemIcon(type || null)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{item.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={getItemTypeColor(type || null)}>
                  {type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {item.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Overview
                </CardTitle>
                <CardDescription>
                  {getItemDescription(item)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Basic Information</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className={getItemTypeColor(type || null)}>
                        {type}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-xs text-foreground">{item.id}</span>
                    </div>
                  </div>
                </div>

                {/* Recipe Information - moved to main content area */}
                {item.recipe && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        Recipe Information
                      </h3>
                      <div className="space-y-4">
                        {/* Recipe Overview */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Time: {formatTime(item.recipe.time_requirement)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Stamina: {item.recipe.stamina_requirement}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Actions: {item.recipe.actions_required}</span>
                          </div>
                        </div>

                        {/* Building Requirement */}
                        {item.recipe.building_requirement && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Building Required
                            </h4>
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-auto text-sm hover:text-primary"
                                onClick={() => navigate(`/building/${item.recipe!.building_requirement!.building_id}`)}
                              >
                                {item.recipe.building_requirement.building_name}
                              </Button>
                              <Badge variant="outline" className={getTierColor(item.recipe.building_requirement.tier)}>
                                Tier {item.recipe.building_requirement.tier}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Level Requirements */}
                        {item.recipe.level_requirements && item.recipe.level_requirements.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Level Requirements
                            </h4>
                            <div className="space-y-1">
                              {item.recipe.level_requirements.map((req, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm">{req.skill_name}</span>
                                  <Badge variant="outline">Level {req.level}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tool Requirements */}
                        {item.recipe.tool_requirements && item.recipe.tool_requirements.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Tool Requirements
                            </h4>
                            <div className="space-y-1">
                              {item.recipe.tool_requirements.map((req, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto text-sm hover:text-primary"
                                    onClick={() => navigate(`/item/${req.tool_id}`)}
                                  >
                                    {req.tool_name}
                                  </Button>
                                  <Badge variant="outline" className={getTierColor(req.tier)}>
                                    Tier {req.tier}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Materials Required */}
                        {item.recipe.consumed_items && item.recipe.consumed_items.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Materials Required
                            </h4>
                            <div className="space-y-1">
                              {item.recipe.consumed_items.map((material, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto text-sm hover:text-primary"
                                    onClick={() => navigate(`/item/${material.id}`)}
                                  >
                                    {material.name}
                                  </Button>
                                  <Badge variant="outline">×{material.count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Experience Gained */}
                        {item.recipe.experience_per_progress && item.recipe.experience_per_progress.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Trophy className="h-4 w-4" />
                              Experience Gained
                            </h4>
                            <div className="space-y-1">
                              {item.recipe.experience_per_progress.map((exp, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm">{exp.skill_name}</span>
                                  <Badge variant="outline">+{exp.experience_per_level} XP</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}


              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(item.name)}`)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Similar
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(type || '')}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All {type}s
                </Button>
              </CardContent>
            </Card>

            {/* Additional Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {Object.entries(item)
                    .filter(([key]) => key !== 'id' && key !== 'name' && key !== 'description' && key !== 'recipe')
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-mono text-xs text-foreground break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 