import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Package, Building, Truck, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiService, type SearchResult, type SearchAllResponse } from '@/lib/api'

export function SearchResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  const [searchResults, setSearchResults] = useState<SearchAllResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) {
      navigate('/')
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
    navigate(`/item/${item.type}/${item.id}`)
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
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleItemClick(item)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-primary">
                    {getItemIcon(item.type)}
                  </div>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={getItemTypeColor(item.type)}>
                    {item.type}
                  </Badge>
                  <span className="text-sm">
                    {Math.round(item.score)}% match
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Search Results
          </h1>
          <p className="text-muted-foreground">
            {totalResults} results found for "{query}"
          </p>
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