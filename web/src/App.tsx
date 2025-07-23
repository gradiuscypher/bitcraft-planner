import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Hammer,
  BookOpen,
  Users,
  Zap
} from 'lucide-react'
import { SearchDropdown } from '@/components/search-dropdown'
import { UserNav } from '@/components/user-nav'
import { AuthProvider } from '@/hooks/use-auth'
import { SearchResults } from '@/pages/search-results'
import { ItemDetail } from '@/pages/item-detail'
import { LoginPage } from '@/pages/login'
import { AuthCallback } from '@/pages/auth-callback'
import { GroupsPage } from '@/pages/groups'
import { GroupDetailPage } from '@/pages/group-detail'


// Landing page component
function LandingPage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-6">
            <Hammer className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Explore Bitcraft
            <span className="block text-primary">Recipes</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover and explore all available recipes in Bitcraft. Find the items, buildings, and cargo you need to build the ultimate civilization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link to="/search">
                <BookOpen className="h-5 w-5 mr-2" />
                Browse Recipes
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Bitcraft
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore and discover recipes with powerful search tools designed for the Bitcraft community
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Recipe Explorer</CardTitle>
                <CardDescription>
                  Discover and explore all available recipes with detailed information about items, buildings, and cargo
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Community Resource</CardTitle>
                <CardDescription>
                  A shared resource for the Bitcraft community to find and explore game content together
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="bg-muted/50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Built for Bitcraft Players
              </h3>
              <p className="text-muted-foreground mb-6">
                Whether you're a solo player or part of a large civilization, our search tools help you 
                discover and explore all the recipes and content available in Bitcraft.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Recipe Discovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Fast Search</span>
                </div>
              </div>
            </div>
            <div className="bg-background/80 rounded-lg p-8 border">
              <h4 className="font-semibold text-foreground mb-4">Available Now</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>• Complete recipe database</div>
                <div>• Advanced search functionality</div>
                <div>• Discord OAuth integration</div>
                <div>• Responsive design</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// Main App component with routing
function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            {/* Top Navbar */}
            <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground">
              <div className="flex h-16 items-center px-6">
                {/* Left Side - Logo and Navigation Links */}
                <div className="flex items-center space-x-6">
                  {/* Logo/Brand */}
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                      <Hammer className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl text-foreground">Bitcraft Planner</span>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/search">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Recipe Explorer
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/groups">
                        <Users className="h-4 w-4 mr-2" />
                        Groups
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Search Bar - Responsively fills remaining space */}
                <SearchDropdown />

                {/* Right side */}
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <ModeToggle />
                  <Separator orientation="vertical" className="h-6" />
                  <UserNav />
                </div>
              </div>
            </nav>

            {/* Main Content with Routing */}
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/item/:itemId" element={<ItemDetail />} />
              <Route path="/building/:buildingId" element={<ItemDetail />} />
              <Route path="/cargo/:cargoId" element={<ItemDetail />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
