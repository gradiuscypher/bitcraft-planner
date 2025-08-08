import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Search, Package, Building, Truck, ChevronRight, Settings2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddToProject } from "@/components/add-to-project"
import { TierTag } from "@/components/tier-tag"
import { apiService, type SearchResult, type SearchAllResponse } from '@/lib/api'

export function SearchResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  const [searchResults, setSearchResults] = useState<SearchAllResponse | null>(null)
  const [randomItems, setRandomItems] = useState<SearchAllResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingRandom, setLoadingRandom] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) {
      setLoading(false)
      // Load random items when no query
      const loadRandomItems = async () => {
        setLoadingRandom(true)
        try {
          const results = await apiService.getRandomItems(6)
          setRandomItems(results)
        } catch (err) {
          console.error('Failed to load random items:', err)
        } finally {
          setLoadingRandom(false)
        }
      }
      loadRandomItems()
      return
    }

    const performSearch = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const results = await apiService.searchAll(query, 50, 50.0)
        setSearchResults(results)
      } catch (err) {
        setError('Failed to search. Please try again.')
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [query, navigate])

  const handleItemClick = (item: SearchResult) => {
    navigate(`/${item.type}/${item.id}`)
  }

  const getItemIcon = (type: string | null) => {
    switch (type) {
      case 'item':
        return <Package className="h-4 w-4" />
      case 'building':
        return <Building className="h-4 w-4" />
      case 'cargo':
        return <Truck className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getItemTypeColor = (type: string | null) => {
    switch (type) {
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

  const renderResultsList = (results: SearchResult[], type: string) => {
    if (results.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="mb-2">{getItemIcon(type)}</div>
          <p>No {type}s found for "{query}"</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((item) => (
          <Card 
            key={`${item.type}-${item.id}`}
            className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary/50"
          >
            <CardHeader 
              className="pb-3 cursor-pointer"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-primary">
                    {getItemIcon(item.type)}
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{item.name}</span>
                    <TierTag tier={item.tier ?? null} />
                  </CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={getItemTypeColor(item.type)}>
                    {item.type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(item.score)}% match
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <AddToProject
                itemId={item.id}
                itemName={item.name}
                itemType={item.type as 'item' | 'building' | 'cargo'}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <Package className="h-4 w-4 mr-2" />
                    Add to Project
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Search className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Searching for "{query}"...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-4 p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalResults = searchResults ? 
    searchResults.items.length + searchResults.buildings.length + searchResults.cargo.length : 0

  // Combine random items from all categories for display
  const getRandomItemsForDisplay = () => {
    if (!randomItems) return []
    return [
      ...randomItems.items.map(item => ({ ...item, type: 'item' })),
      ...randomItems.buildings.map(item => ({ ...item, type: 'building' })),
      ...randomItems.cargo.map(item => ({ ...item, type: 'cargo' }))
    ]
  }

  // Show random items when no query
  if (!query && !loading) {
    const randomItemsToShow = getRandomItemsForDisplay()
    
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Recipe Explorer
            </h1>
            <p className="text-muted-foreground">
              Discover items, buildings, and cargo in Bitcraft. Try searching above or explore these featured items:
            </p>
          </div>

          {/* Random Items */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6" />
              Featured Items
            </h2>
            
            {loadingRandom ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading featured items...</p>
              </div>
            ) : randomItemsToShow.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {randomItemsToShow.map((item) => (
                  <Card 
                    key={`${item.type}-${item.id}`}
                    className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary/50"
                  >
                    <CardHeader 
                      className="pb-3 cursor-pointer"
                      onClick={() => navigate(`/${item.type}/${item.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-primary">
                            {getItemIcon(item.type)}
                          </div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span>{item.name}</span>
                            <TierTag tier={item.tier ?? null} />
                          </CardTitle>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={getItemTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Click to explore
                          </span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <AddToProject
                        itemId={item.id}
                        itemName={item.name}
                        itemType={item.type as 'item' | 'building' | 'cargo'}
                        trigger={
                          <Button variant="outline" size="sm" className="w-full">
                            <Package className="h-4 w-4 mr-2" />
                            Add to Project
                          </Button>
                        }
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-4" />
                <p>No featured items available right now</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-12 text-center space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Looking for something specific?</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/search/advanced">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Advanced Search
                  </Link>
                </Button>
              </div>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Search Results
              </h1>
              <p className="text-muted-foreground">
                {totalResults} results found for "{query}"
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to={`/search/advanced?q=${encodeURIComponent(query)}`}>
                <Settings2 className="h-4 w-4 mr-2" />
                Advanced Search
              </Link>
            </Button>
          </div>
        </div>

        {/* No results */}
        {totalResults === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">No results found</h2>
            <p className="text-muted-foreground mb-4">
              Try searching with different keywords or check your spelling.
            </p>
            <Button onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        )}

        {/* Results */}
        {totalResults > 0 && searchResults && (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({totalResults})
              </TabsTrigger>
              <TabsTrigger value="items">
                Items ({searchResults.items.length})
              </TabsTrigger>
              <TabsTrigger value="buildings">
                Buildings ({searchResults.buildings.length})
              </TabsTrigger>
              <TabsTrigger value="cargo">
                Cargo ({searchResults.cargo.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-8">
              {searchResults.items.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Package className="h-5 w-5" />
                    Items ({searchResults.items.length})
                  </h3>
                  {renderResultsList(searchResults.items, 'item')}
                </div>
              )}
              
              {searchResults.buildings.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Building className="h-5 w-5" />
                    Buildings ({searchResults.buildings.length})
                  </h3>
                  {renderResultsList(searchResults.buildings, 'building')}
                </div>
              )}
              
              {searchResults.cargo.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Truck className="h-5 w-5" />
                    Cargo ({searchResults.cargo.length})
                  </h3>
                  {renderResultsList(searchResults.cargo, 'cargo')}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="items">
              {renderResultsList(searchResults.items, 'item')}
            </TabsContent>
            
            <TabsContent value="buildings">
              {renderResultsList(searchResults.buildings, 'building')}
            </TabsContent>
            
            <TabsContent value="cargo">
              {renderResultsList(searchResults.cargo, 'cargo')}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
} 