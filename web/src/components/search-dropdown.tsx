import { useState, useEffect, useRef } from 'react'
import { Search, Package, Building, Truck } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiService, type SearchResult, type SearchAllResponse } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

interface SearchDropdownProps {
  onSearch?: (query: string) => void
  onSelectItem?: (item: SearchResult) => void
}

export function SearchDropdown({ onSearch, onSelectItem }: SearchDropdownProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchAllResponse | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Get all results as a flat array for keyboard navigation
  const getAllResults = (): SearchResult[] => {
    if (!searchResults) return []
    return [
      ...searchResults.items,
      ...searchResults.buildings,
      ...searchResults.cargo
    ]
  }

  // Debounced search function
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults(null)
      setIsOpen(false)
      return
    }

    const debounceTimer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await apiService.searchAll(query, 10, 60.0)
        setSearchResults(results)
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      const allResults = getAllResults()
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < allResults.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < allResults.length) {
            handleSelectItem(allResults[selectedIndex])
          } else if (query.trim()) {
            handleSearch(query)
          }
          break
        case 'Escape':
          setIsOpen(false)
          setSelectedIndex(-1)
          searchInputRef.current?.blur()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, query])

  // Global keyboard shortcut for focusing search
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && searchInputRef.current && document.activeElement !== searchInputRef.current) {
        event.preventDefault()
        searchInputRef.current.focus()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleSearch = (searchQuery: string) => {
    setIsOpen(false)
    onSearch?.(searchQuery)
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
  }

  const handleSelectItem = (item: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    onSelectItem?.(item)
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
        return 'text-blue-600 dark:text-blue-400'
      case 'building':
        return 'text-green-600 dark:text-green-400'
      case 'cargo':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const renderSearchSection = (title: string, results: SearchResult[], icon: React.ReactNode) => {
    if (results.length === 0) return null

    return (
      <div className="py-2">
        <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground">
          {icon}
          {title}
        </div>
        {results.slice(0, 3).map((item) => {
          const globalIndex = getAllResults().findIndex(r => r.id === item.id && r.type === item.type)
          return (
            <button
              key={`${item.type}-${item.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent ${
                selectedIndex === globalIndex ? 'bg-accent' : ''
              }`}
              onClick={() => handleSelectItem(item)}
            >
              <div className={getItemTypeColor(item.type)}>
                {getItemIcon(item.type)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.type} • {Math.round(item.score)}% match
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative flex-1 px-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search items and recipes... (Press / to focus)"
          className="pl-9 w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : searchResults && (searchResults.items.length > 0 || searchResults.buildings.length > 0 || searchResults.cargo.length > 0) ? (
            <>
              {renderSearchSection('Items', searchResults.items, <Package className="h-3 w-3" />)}
              {renderSearchSection('Buildings', searchResults.buildings, <Building className="h-3 w-3" />)}
              {renderSearchSection('Cargo', searchResults.cargo, <Truck className="h-3 w-3" />)}
              
              {query && (
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => handleSearch(query)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search all results for "{query}"
                  </Button>
                </div>
              )}
            </>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="h-4 w-4 mx-auto mb-2" />
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
} 