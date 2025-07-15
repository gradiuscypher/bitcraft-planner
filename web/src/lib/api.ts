// API service for BitCraft Planner
const API_BASE_URL = 'http://localhost:8000'

export interface SearchResult {
  name: string
  score: number
  id: number  // Changed from string to number
  type: string | null
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
  [key: string]: unknown // Allow for additional properties from the API
}

class ApiService {
  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`)
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }

  // Individual item fetch methods
  async getItem(itemId: number): Promise<ItemDetail> {
    return this.makeRequest<ItemDetail>(`/item/${itemId}`)
  }

  async getBuilding(buildingId: number): Promise<BuildingDetail> {
    return this.makeRequest<BuildingDetail>(`/building/${buildingId}`)
  }

  async getCargo(cargoId: number): Promise<CargoDetail> {
    return this.makeRequest<CargoDetail>(`/cargo/${cargoId}`)
  }

  // Search methods
  async searchItems(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchResponse>(`/search/items?${params}`)
  }

  async searchBuildings(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchResponse>(`/search/buildings?${params}`)
  }

  async searchCargo(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchResponse>(`/search/cargo?${params}`)
  }

  async searchAll(query: string, limit: number = 10, score_cutoff: number = 60.0): Promise<SearchAllResponse> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      score_cutoff: score_cutoff.toString()
    })
    return this.makeRequest<SearchAllResponse>(`/search/all?${params}`)
  }

  async getBestMatch(query: string, search_type: string = 'all'): Promise<SearchResult | null> {
    const params = new URLSearchParams({
      query,
      search_type
    })
    return this.makeRequest<SearchResult | null>(`/search/best?${params}`)
  }
}

export const apiService = new ApiService() 