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

  ChefHat,
  Wrench,
  Target
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AddToProject } from "@/components/add-to-project"
import { apiService, type ItemDetail, type BuildingDetail, type CargoDetail, type Recipe } from '@/lib/api'

type ItemDetailData = ItemDetail | BuildingDetail | CargoDetail

interface ConsumedItemWithName {
  item_id: number
  amount: number
  recipe_id: number
  name: string
}

export function ItemDetail() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [item, setItem] = useState<ItemDetailData | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [consumedItemsWithNames, setConsumedItemsWithNames] = useState<ConsumedItemWithName[]>([])
  const [buildingTypeNames, setBuildingTypeNames] = useState<{[key: number]: string}>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Determine type from the URL path
  const type = location.pathname.split('/')[1] // 'item', 'building', or 'cargo'

  const getItemDescription = (item: ItemDetailData): string => {
    const itemWithDescription = item as Record<string, unknown>
    return typeof itemWithDescription.description === 'string' 
      ? itemWithDescription.description 
      : getItemTypeDescription(type || null)
  }

  useEffect(() => {
    if (!type || !itemId) {
      setError('Invalid item parameters')
      setLoading(false)
      return
    }

    const fetchItemDetails = async () => {
      setLoading(true)
      setError(null)
      
      // Clear previous recipe data when navigating to a new item
      setRecipes([])
      setConsumedItemsWithNames([])
      setBuildingTypeNames({})

      try {
        const numericId = parseInt(itemId, 10)
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

        setItem(itemData)

        // Only fetch recipes for items (not buildings or cargo)
        if (type === 'item') {
          try {
            const itemRecipes = await apiService.getItemRecipe(numericId)
            setRecipes(itemRecipes)

            // Fetch names for all consumed items across all recipes
            const allConsumedItems = itemRecipes.flatMap(recipe => recipe.consumed_items)
            const consumedItemsWithNames: ConsumedItemWithName[] = []

            for (const consumedItem of allConsumedItems) {
              try {
                const itemDetails = await apiService.getItem(consumedItem.item_id)
                consumedItemsWithNames.push({
                  ...consumedItem,
                  name: itemDetails.name
                })
              } catch (itemError) {
                console.error(`Failed to fetch name for item ${consumedItem.item_id}:`, itemError)
                // Add with placeholder name if item fetch fails
                consumedItemsWithNames.push({
                  ...consumedItem,
                  name: `Item ${consumedItem.item_id}`
                })
              }
            }

            setConsumedItemsWithNames(consumedItemsWithNames)

            // Fetch building type names for all recipes
            const buildingTypeIds = new Set(
              itemRecipes
                .filter(recipe => recipe.building_type_requirement > 0)
                .map(recipe => recipe.building_type_requirement)
            )

            const buildingTypeNamesMap: {[key: number]: string} = {}
            for (const typeId of buildingTypeIds) {
              try {
                const buildingType = await apiService.getBuildingType(typeId)
                buildingTypeNamesMap[typeId] = buildingType.name
              } catch (buildingTypeError) {
                console.error(`Failed to fetch building type ${typeId}:`, buildingTypeError)
                buildingTypeNamesMap[typeId] = `Building Type ${typeId}`
              }
            }

            setBuildingTypeNames(buildingTypeNamesMap)
          } catch (recipeError) {
            console.error('Failed to fetch recipe data:', recipeError)
            // Don't set error state for recipe failures, just log them
          }
        }
      } catch (err) {
        setError('Failed to load item details. Please try again.')
        console.error('Item detail fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItemDetails()
  }, [type, itemId, navigate])

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
                  <div className="grid gap-2 text-sm text-foreground">
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

                {/* Recipe Information */}
                {recipes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        Recipe Information
                      </h3>
                      <div className="space-y-6">
                        {recipes.map((recipe, recipeIndex) => (
                          <div key={recipe.id} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-foreground">Recipe #{recipe.id}</h4>
                              <Badge variant="outline">Recipe {recipeIndex + 1}</Badge>
                            </div>
                            
                            {/* Recipe Overview */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Time: {recipe.time_requirement}s</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Stamina: {recipe.stamina_requirement}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Actions: {recipe.actions_required}</span>
                              </div>
                            </div>

                            {/* Building Requirements */}
                            {(recipe.building_tier_requirement > 0 || recipe.building_type_requirement > 0) && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  Building Requirements
                                </h5>
                                <div className="space-y-1">
                                  {recipe.building_type_requirement > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-foreground">Building Type</span>
                                      <Badge variant="outline">
                                        {buildingTypeNames[recipe.building_type_requirement] || recipe.building_type_requirement}
                                      </Badge>
                                    </div>
                                  )}
                                  {recipe.building_tier_requirement > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-foreground">Building Tier</span>
                                      <Badge variant="outline">Tier {recipe.building_tier_requirement}</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tool Requirements */}
                            {(recipe.tool_tier_requirement || recipe.tool_type_requirement) && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Tool Requirements
                                </h5>
                                <div className="space-y-1">
                                  {recipe.tool_type_requirement && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-foreground">Tool Type</span>
                                      <Badge variant="outline">{recipe.tool_type_requirement}</Badge>
                                    </div>
                                  )}
                                  {recipe.tool_tier_requirement && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-foreground">Tool Tier</span>
                                      <Badge variant="outline">Tier {recipe.tool_tier_requirement}</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Materials Required */}
                            {recipe.consumed_items.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Materials Required
                                </h5>
                                <div className="space-y-1">
                                  {recipe.consumed_items.map((consumedItem, index) => {
                                    const itemWithName = consumedItemsWithNames.find(
                                      item => item.item_id === consumedItem.item_id && item.recipe_id === consumedItem.recipe_id
                                    )
                                    return (
                                      <div key={index} className="flex items-center justify-between">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="p-0 h-auto text-sm hover:text-primary"
                                          onClick={() => navigate(`/item/${consumedItem.item_id}`)}
                                        >
                                          {itemWithName?.name || `Item ${consumedItem.item_id}`}
                                        </Button>
                                        <Badge variant="outline">×{consumedItem.amount}</Badge>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Produced Items */}
                            {recipe.produced_items.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Trophy className="h-4 w-4" />
                                  Produces
                                </h5>
                                <div className="space-y-1">
                                  {recipe.produced_items.map((producedItem, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-0 h-auto text-sm hover:text-primary"
                                        onClick={() => navigate(`/item/${producedItem.item_id}`)}
                                      >
                                        Item {producedItem.item_id}
                                      </Button>
                                      <Badge variant="outline">×{producedItem.amount}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
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
                <AddToProject 
                  itemId={item.id}
                  itemName={item.name}
                  itemType={type as 'item' | 'building' | 'cargo'}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="h-4 w-4 mr-2" />
                      Add to Project
                    </Button>
                  }
                />
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