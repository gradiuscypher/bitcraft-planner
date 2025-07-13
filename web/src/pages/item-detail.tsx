import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Building, Truck, Search, ExternalLink } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { apiService, type ItemDetail, type BuildingDetail, type CargoDetail } from '@/lib/api'

type ItemDetailData = ItemDetail | BuildingDetail | CargoDetail

export function ItemDetail() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<ItemDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getItemDescription = (item: ItemDetailData): string => {
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

        setItem(itemData)
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

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Additional Properties</h3>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(item)
                      .filter(([key]) => key !== 'id' && key !== 'name' && key !== 'description')
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-mono text-xs text-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
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

            {/* Related Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coming Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• Crafting recipes</div>
                  <div>• Required materials</div>
                  <div>• Building requirements</div>
                  <div>• Usage in recipes</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 