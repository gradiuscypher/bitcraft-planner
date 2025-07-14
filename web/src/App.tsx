import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { 
  Settings, 
  User,
  Hammer,
  BookOpen,
  Wrench,
  Target,
  Users,
  Zap
} from 'lucide-react'
import { SearchDropdown } from '@/components/search-dropdown'
import { SearchResults } from '@/pages/search-results'
import { ItemDetail } from '@/pages/item-detail'

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
            Plan Your Bitcraft
            <span className="block text-primary">Crafting Journey</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Master the art of crafting in Bitcraft. Plan your projects, explore recipes, 
            and coordinate with your community to build the ultimate civilization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              <Target className="h-5 w-5 mr-2" />
              Start Planning
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              <BookOpen className="h-5 w-5 mr-2" />
              Browse Recipes
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
              Streamline your crafting workflow with powerful tools designed for the Bitcraft community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Project Planning</CardTitle>
                <CardDescription>
                  Plan complex crafting projects with resource calculations and step-by-step guides
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Recipe Explorer</CardTitle>
                <CardDescription>
                  Discover and explore all available recipes with detailed crafting requirements
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Community Coordination</CardTitle>
                <CardDescription>
                  Coordinate with your community to share resources and plan collaborative projects
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
                Whether you're a solo crafter or part of a large civilization, our tools help you 
                optimize your crafting workflow and achieve your building goals in Bitcraft.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Resource Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Efficient Planning</span>
                </div>
              </div>
            </div>
            <div className="bg-background/80 rounded-lg p-8 border">
              <h4 className="font-semibold text-foreground mb-4">Coming Soon</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>• Advanced resource calculators</div>
                <div>• Community project sharing</div>
                <div>• Real-time crafting progress</div>
                <div>• Integration with game data</div>
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

                {/* Navigation Links - ADD NEW NAVIGATION LINKS HERE */}
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm">
                    <Hammer className="h-4 w-4 mr-2" />
                    Crafting Planner
                  </Button>
                  <Button variant="ghost" size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Recipe Explorer
                  </Button>
                  {/* Add future navigation links here */}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/01.png" alt="User" />
                        <AvatarFallback>BC</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </nav>

          {/* Main Content with Routing */}
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/building/:id" element={<ItemDetail />} />
            <Route path="/cargo/:id" element={<ItemDetail />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
