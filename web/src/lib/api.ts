// API service for BitCraft Planner
import { API_BASE_URL } from './config';

export interface SearchResult {
  name: string
  score: number
  id: number  // Changed from string to number
  type: string | null
  tier?: number | null
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  search_type: string
}

export interface SearchAllResponse {
  query: string
  items: SearchResult[]
  buildings: SearchResult[]
  cargo: SearchResult[]
}

export interface ItemDetail {
  id: number
  name: string
  tier?: number
  [key: string]: unknown // Allow for additional properties from the API
}

export interface BuildingDetail {
  id: number
  name: string
  [key: string]: unknown // Allow for additional properties from the API
}

export interface CargoDetail {
  id: number
  name: string
  tier?: number
  [key: string]: unknown // Allow for additional properties from the API
}

export interface BuildingType {
  id: number
  name: string
  [key: string]: unknown // Allow for additional properties from the API
}

export interface ConsumedItem {
  item_id: number
  amount: number
  recipe_id: number
}

export interface ProducedItem {
  item_id: number
  recipe_id: number
  amount: number
}

export interface Recipe {
  id: number
  actions_required: number
  building_tier_requirement: number
  building_type_requirement: number
  consumed_items: ConsumedItem[]
  produced_items: ProducedItem[]
  stamina_requirement: number
  time_requirement: number
  tool_tier_requirement: number | null
  tool_type_requirement: number | null
}

export interface RecipeTreeItem {
  item_id: number
  item_name: string
  amount: number
  is_base_material?: boolean
}

export interface RecipeTreeStep {
  depth: number
  items: RecipeTreeItem[]
}

export interface RecipeTreeResponse {
  recipe_id: number
  item_id: number
  item_name: string
  steps: RecipeTreeStep[]
  base_materials: RecipeTreeItem[]
}

class ApiService {
  private async makeRequest<T>(endpoint: string, timeout: number = 60000): Promise<T> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out - this operation may take a while due to complex recipe calculations')
      }
      console.error('API request error:', error)
      throw error
    }
  }

  // Individual item fetch methods
  async getItem(itemId: number): Promise<ItemDetail> {
    return this.makeRequest<ItemDetail>(`/items/${itemId}`)
  }

  async getBuilding(buildingId: number): Promise<BuildingDetail> {
    return this.makeRequest<BuildingDetail>(`/buildings/${buildingId}`)
  }

  async getCargo(cargoId: number): Promise<CargoDetail> {
    return this.makeRequest<CargoDetail>(`/cargo/${cargoId}`)
  }

  async getItemRecipe(itemId: number): Promise<Recipe[]> {
    return this.makeRequest<Recipe[]>(`/items/${itemId}/recipe`)
  }

  async getBuildingType(buildingTypeId: number): Promise<BuildingType> {
    return this.makeRequest<BuildingType>(`/buildings/type/${buildingTypeId}`)
  }

  async getItemRecipeTree(itemId: number, amount: number = 1, firstLevelOnly = false): Promise<RecipeTreeResponse> {
    const params = new URLSearchParams({
      amount: amount.toString(),
      first_level_only: firstLevelOnly ? 'true' : 'false'
    })
    // Use a longer timeout for recipe tree calculations (2 minutes)
    return this.makeRequest<RecipeTreeResponse>(`/items/${itemId}/recipe-tree?${params}`, 120000)
  }

  // Search methods
  async searchItems(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchResponse>(`/items/search?${params}`)
  }

  async searchBuildings(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchResponse>(`/items/search/buildings?${params}`)
  }

  async searchCargo(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchResponse>(`/items/search/cargo?${params}`)
  }

  async searchAll(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchAllResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchAllResponse>(`/items/search/all?${params}`)
  }

  async getBestMatch(query: string, search_type: string = 'all'): Promise<SearchResult | null> {
    const params = new URLSearchParams({
      query,
      search_type
    })
    return this.makeRequest<SearchResult | null>(`/items/search/best?${params}`)
  }

  async getRandomItems(count: number = 6): Promise<SearchAllResponse> {
    const params = new URLSearchParams({
      count: count.toString()
    })
    return this.makeRequest<SearchAllResponse>(`/items/random?${params}`)
  }
}

export const apiService = new ApiService() 