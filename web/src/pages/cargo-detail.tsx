import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Truck, 
  Search, 
  ExternalLink,
  Package,
  Timer,
  Zap,
  Settings,
  Weight,
  Clock,
  PlayCircle
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { apiService, type CargoDetail } from '@/lib/api'

export function CargoDetail() {
  const { cargoId } = useParams<{ cargoId: string }>()
  const navigate = useNavigate()
  const [cargo, setCargo] = useState<CargoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cargoId) {
      setError('Invalid cargo ID')
      setLoading(false)
      return
    }

    const fetchCargoDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const numericId = parseInt(cargoId, 10)
        if (isNaN(numericId)) {
          throw new Error('Invalid cargo ID')
        }

        const cargoData = await apiService.getCargo(numericId)
        setCargo(cargoData)
      } catch (err) {
        setError('Failed to load cargo details. Please try again.')
        console.error('Cargo detail fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCargoDetails()
  }, [cargoId, navigate])

  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
    if (seconds >= 60) return `${Math.round(seconds / 60)}m`
    return `${seconds}s`
  }

  const formatDespawnTime = (seconds: number) => {
    const hours = seconds / 3600
    if (hours >= 24) return `${Math.round(hours / 24)}d`
    if (hours >= 1) return `${Math.round(hours)}h`
    return `${Math.round(seconds / 60)}m`
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
            <p className="text-muted-foreground">Loading cargo details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !cargo) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-4 p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive">{error || 'Cargo not found'}</p>
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
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{cargo.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  cargo
                </Badge>
                <Badge variant="outline" className={getTierColor(cargo.tier)}>
                  Tier {cargo.tier}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {cargo.id}
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
                  Cargo Overview
                </CardTitle>
                <CardDescription>
                  {cargo.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Physical Properties */}
                <div>
                  <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Weight className="h-5 w-5" />
                    Physical Properties
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-foreground">Volume: {cargo.volume}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-foreground">Movement: {Math.round(cargo.movement_modifier * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-foreground">Blocks Path: {cargo.blocks_path ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-foreground">Despawn: {formatDespawnTime(cargo.despawn_time)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Interaction Properties */}
                <div>
                  <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Interaction Times
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-foreground">Pick Up: {formatTime(cargo.pick_up_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-foreground">Place Down: {formatTime(cargo.place_time)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Animation Details */}
                <div>
                  <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Animation Details
                  </h3>
                  <div className="grid gap-2 text-sm text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pick Up Animation:</span>
                      <span className="font-medium text-foreground">{cargo.pick_up_animation_start} → {cargo.pick_up_animation_end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drop Animation:</span>
                      <span className="font-medium text-foreground">{cargo.drop_animation_start} → {cargo.drop_animation_end}</span>
                    </div>
                    {cargo.animator_state && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Animator State:</span>
                        <span className="font-medium text-foreground">{cargo.animator_state}</span>
                      </div>
                    )}
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
                  onClick={() => navigate(`/search?q=${encodeURIComponent(cargo.name)}`)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Similar
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/search?q=cargo`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Cargo
                </Button>
              </CardContent>
            </Card>

            {/* Cargo Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Cargo Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium text-foreground">Cargo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs text-foreground">{cargo.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tag:</span>
                    <span className="font-medium text-foreground">{cargo.tag}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tier:</span>
                    <Badge variant="outline" className={getTierColor(cargo.tier)}>
                      {cargo.tier}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pickupable:</span>
                    <Badge variant={cargo.not_pickupable ? "destructive" : "default"} className="text-xs">
                      {cargo.not_pickupable ? "No" : "Yes"}
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