import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Building, 
  Search, 
  ExternalLink,
  Shield,
  Heart,
  Home,
  Zap,
  Settings,
  MapPin,
  Lightbulb
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AddToProject } from "@/components/add-to-project"
import { apiService, type BuildingDetail } from '@/lib/api'

export function BuildingDetail() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const [building, setBuilding] = useState<BuildingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!buildingId) {
      setError('Invalid building ID')
      setLoading(false)
      return
    }

    const fetchBuildingDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const numericId = parseInt(buildingId, 10)
        if (isNaN(numericId)) {
          throw new Error('Invalid building ID')
        }

        const buildingData = await apiService.getBuilding(numericId)
        setBuilding(buildingData)
      } catch (err) {
        setError('Failed to load building details. Please try again.')
        console.error('Building detail fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBuildingDetails()
  }, [buildingId, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Search className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading building details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !building) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-4 p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive">{error || 'Building not found'}</p>
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
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{building.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  building
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {building.id}
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
                  <Building className="h-5 w-5" />
                  Building Overview
                </CardTitle>
                <CardDescription>
                  {String(building.description || '')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Building Properties */}
                <div>
                  <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Building Properties
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-foreground">Health: {String(building.max_health || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-foreground">Defense: {String(building.defense_level || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-foreground">Decay: {String(building.decay || 0)}/day</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-foreground">Light Radius: {String(building.light_radius || 0)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Building Features */}
                <div>
                  <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Building Features
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Enterable:</span>
                      <Badge variant={building.unenterable ? "destructive" : "default"}>
                        {building.unenterable ? "No" : "Yes"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Wilderness:</span>
                      <Badge variant={building.wilderness ? "default" : "secondary"}>
                        {building.wilderness ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Has Action:</span>
                      <Badge variant={building.has_action ? "default" : "secondary"}>
                        {building.has_action ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Deconstructible:</span>
                      <Badge variant={building.not_deconstructible ? "destructive" : "default"}>
                        {building.not_deconstructible ? "No" : "Yes"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Functions */}
                {Boolean(building.functions) && Array.isArray(building.functions) && building.functions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Building Functions
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        This building has {Array.isArray(building.functions) ? building.functions.length : 0} function(s) available.
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
                  itemId={building.id}
                  itemName={building.name}
                  itemType="building"
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <Building className="h-4 w-4 mr-2" />
                      Add to Project
                    </Button>
                  }
                />
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(building.name)}`)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Similar
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/search?q=building`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Buildings
                </Button>
              </CardContent>
            </Card>

            {/* Building Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Building Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium text-foreground">Building</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs text-foreground">{building.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Health:</span>
                    <span className="font-medium text-foreground">{String(building.max_health || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Defense:</span>
                    <span className="font-medium text-foreground">{String(building.defense_level || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Compendium:</span>
                    <Badge variant={building.show_in_compendium ? "default" : "secondary"} className="text-xs">
                      {building.show_in_compendium ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}