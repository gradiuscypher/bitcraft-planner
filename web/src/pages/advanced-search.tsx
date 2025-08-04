import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Package, Building, Truck, Filter, SortAsc, SortDesc, X, Settings2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddToProject } from "@/components/add-to-project"
import { apiService, type SearchResult, type SearchAllResponse } from '@/lib/api'

interface AdvancedSearchFilters {
  query: string
  includeItems: boolean
  includeBuildings: boolean
  includeCargo: boolean
  minScore: number
  maxResults: number
  sortBy: 'relevance' | 'name' | 'score'
  sortOrder: 'asc' | 'desc'
}

const defaultFilters: AdvancedSearchFilters = {
  query: '',
  includeItems: true,
  includeBuildings: true,
  includeCargo: true,
  minScore: 50,
  maxResults: 50,
  sortBy: 'relevance',
  sortOrder: 'desc'
}

export function AdvancedSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<AdvancedSearchFilters>(() => {
    // Initialize filters from URL params
    const urlQuery = searchParams.get('q') || ''
    const urlIncludeItems = searchParams.get('items') !== 'false'
    const urlIncludeBuildings = searchParams.get('buildings') !== 'false'
    const urlIncludeCargo = searchParams.get('cargo') !== 'false'
    const urlMinScore = parseInt(searchParams.get('minScore') || '50')
    const urlMaxResults = parseInt(searchParams.get('maxResults') || '50')
    const urlSortBy = (searchParams.get('sortBy') as any) || 'relevance'
    const urlSortOrder = (searchParams.get('sortOrder') as any) || 'desc'

    return {
      query: urlQuery,
      includeItems: urlIncludeItems,
      includeBuildings: urlIncludeBuildings,
      includeCargo: urlIncludeCargo,
      minScore: urlMinScore,
      maxResults: urlMaxResults,
      sortBy: urlSortBy,
      sortOrder: urlSortOrder
    }
  })
  
  const [searchResults, setSearchResults] = useState<SearchAllResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (!filters.includeItems) params.set('items', 'false')
    if (!filters.includeBuildings) params.set('buildings', 'false')
    if (!filters.includeCargo) params.set('cargo', 'false')
    if (filters.minScore !== 50) params.set('minScore', filters.minScore.toString())
    if (filters.maxResults !== 50) params.set('maxResults', filters.maxResults.toString())
    if (filters.sortBy !== 'relevance') params.set('sortBy', filters.sortBy)
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder)
    
    setSearchParams(params)
  }, [filters, setSearchParams])

  const performSearch = async () => {
    if (!filters.query.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const results = await apiService.searchAll(
        filters.query, 
        filters.maxResults, 
        filters.minScore
      )
      
      // Filter results based on user preferences
      const filteredResults: SearchAllResponse = {
        query: results.query,
        items: filters.includeItems ? results.items : [],
        buildings: filters.includeBuildings ? results.buildings : [],
        cargo: filters.includeCargo ? results.cargo : []
      }

      // Sort results if needed
      if (filters.sortBy !== 'relevance') {
        const sortFn = (a: SearchResult, b: SearchResult) => {
          let comparison = 0
          switch (filters.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name)
              break
            case 'score':
              comparison = a.score - b.score
              break
          }
          return filters.sortOrder === 'asc' ? comparison : -comparison
        }

        filteredResults.items.sort(sortFn)
        filteredResults.buildings.sort(sortFn)
        filteredResults.cargo.sort(sortFn)
      }

      setSearchResults(filteredResults)
    } catch (err) {
      setError('Search failed. Please try again.')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    performSearch()
  }

  const handleFilterChange = (key: keyof AdvancedSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setSearchResults(null)
    setHasSearched(false)
  }

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
          <p>No {type}s found</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((item) => (
          <Card 
            key={`${item.type}-${item.id}`}
            className="hover:shadow-md transition-shadow"
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
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </div>
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

  const totalResults = searchResults ? 
    searchResults.items.length + searchResults.buildings.length + searchResults.cargo.length : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings2 className="h-8 w-8" />
            Advanced Search
          </h1>
          <p className="text-muted-foreground">
            Search with detailed filters and sorting options
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Search Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Query */}
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search Query</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-query"
                      type="text"
                      placeholder="Enter search terms..."
                      className="pl-10"
                      value={filters.query}
                      onChange={(e) => handleFilterChange('query', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                {/* Item Types */}
                <div className="space-y-3">
                  <Label>Include Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-items"
                        checked={filters.includeItems}
                        onCheckedChange={(checked) => handleFilterChange('includeItems', checked)}
                      />
                      <Label htmlFor="include-items" className="flex items-center gap-2 text-sm text-foreground">
                        <Package className="h-4 w-4 text-blue-600" />
                        Items
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-buildings"
                        checked={filters.includeBuildings}
                        onCheckedChange={(checked) => handleFilterChange('includeBuildings', checked)}
                      />
                      <Label htmlFor="include-buildings" className="flex items-center gap-2 text-sm text-foreground">
                        <Building className="h-4 w-4 text-green-600" />
                        Buildings
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-cargo"
                        checked={filters.includeCargo}
                        onCheckedChange={(checked) => handleFilterChange('includeCargo', checked)}
                      />
                      <Label htmlFor="include-cargo" className="flex items-center gap-2 text-sm text-foreground">
                        <Truck className="h-4 w-4 text-orange-600" />
                        Cargo
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Minimum Score */}
                <div className="space-y-3">
                  <Label>Minimum Match Score: {filters.minScore}%</Label>
                  <Slider
                    value={[filters.minScore]}
                    onValueChange={([value]) => handleFilterChange('minScore', value)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Max Results */}
                <div className="space-y-2">
                  <Label htmlFor="max-results">Max Results</Label>
                  <Select
                    value={filters.maxResults.toString()}
                    onValueChange={(value) => handleFilterChange('maxResults', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Sorting */}
                <div className="space-y-3">
                  <Label>Sort By</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value: any) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="score">Score</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('sortOrder', 'asc')}
                      className="flex-1"
                    >
                      <SortAsc className="h-4 w-4 mr-1" />
                      Asc
                    </Button>
                    <Button
                      variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('sortOrder', 'desc')}
                      className="flex-1"
                    >
                      <SortDesc className="h-4 w-4 mr-1" />
                      Desc
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleSearch}
                    disabled={!filters.query.trim() || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Search className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-16">
                <Search className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">Searching...</h2>
                <p className="text-muted-foreground">Finding results for "{filters.query}"</p>
              </div>
            )}

            {/* No Search Yet */}
            {!hasSearched && !loading && (
              <div className="text-center py-16">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">Ready to Search</h2>
                <p className="text-muted-foreground">Enter your search terms and click Search to get started</p>
              </div>
            )}

            {/* No Results */}
            {hasSearched && !loading && totalResults === 0 && (
              <div className="text-center py-16">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">No results found</h2>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Reset Filters
                </Button>
              </div>
            )}

            {/* Results */}
            {hasSearched && !loading && totalResults > 0 && searchResults && (
              <>
                {/* Results Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2 text-foreground">
                    Search Results
                  </h2>
                  <p className="text-muted-foreground">
                    {totalResults} results found for "{filters.query}"
                  </p>
                </div>

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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}