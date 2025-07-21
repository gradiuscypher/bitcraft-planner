import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Minus, Users, Package, Search, Copy, Check, Settings, ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { authService } from '@/lib/auth-service';
import { useAuth } from '@/hooks/use-auth';
import { apiService, type SearchResult } from '@/lib/api';
import type { CraftingProjectResponse, AddItemRequest } from '@/types/crafting';

interface ItemWithDetails {
  id: number;
  name: string;
  description: string;
  icon_asset_name: string;
  tier: number;
  tag: string;
  count: number;
}

function AddItemDialog({ projectUuid, onItemAdded }: { projectUuid: string; onItemAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [count, setCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for items
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await apiService.searchItems(query, 10, 60.0);
        setSearchResults(response.results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) {
      setError('Please select an item');
      return;
    }

    if (count <= 0) {
      setError('Count must be greater than 0');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: AddItemRequest = {
        item_id: selectedItem.id,
        count: count,
      };

      await authService.addItemToProject(projectUuid, request);
      onItemAdded();
      setIsOpen(false);
      setSelectedItem(null);
      setQuery('');
      setCount(1);
    } catch (err) {
      console.error('Failed to add item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  const selectItem = (item: SearchResult) => {
    setSelectedItem(item);
    setQuery(item.name);
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setQuery('');
    setSearchResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Item to Project</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search for an item and specify how many you need.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-search" className="text-foreground">Search Item</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="item-search"
                placeholder="Search for items..."
                className="pl-10 text-foreground"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              {selectedItem && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={clearSelection}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && !selectedItem && (
              <div className="border rounded-md bg-popover text-popover-foreground shadow-sm max-h-48 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent hover:text-accent-foreground border-b last:border-b-0 transition-colors text-popover-foreground"
                    onClick={() => selectItem(item)}
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-popover-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(item.score)}% match
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Searching...
              </div>
            )}

            {selectedItem && (
              <div className="flex items-center gap-2 p-3 bg-muted text-foreground rounded-md">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{selectedItem.name}</span>
                <Check className="h-4 w-4 text-green-600 ml-auto" />
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {selectedItem ? 'Item selected' : 'Start typing to search for items'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count" className="text-foreground">Quantity</Label>
            <Input
              id="count"
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              disabled={isLoading}
              className="text-foreground"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedItem} className="flex-1">
              {isLoading ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemRow({ item, projectUuid, canEdit, onItemUpdated }: { 
  item: ItemWithDetails; 
  projectUuid: string;
  canEdit: boolean;
  onItemUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCount, setEditCount] = useState(item.count);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (editCount <= 0) return;
    
    setIsUpdating(true);
    try {
      await authService.updateItemCount(projectUuid, item.id, editCount);
      onItemUpdated();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this item from the project?')) return;
    
    setIsUpdating(true);
    try {
      await authService.removeItemFromProject(projectUuid, item.id);
      onItemUpdated();
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">{item.name}</h4>
          <Badge variant="outline" className="text-xs">
            Tier {item.tier}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={editCount}
              onChange={(e) => setEditCount(parseInt(e.target.value) || 1)}
              className="w-20"
              disabled={isUpdating}
            />
            <Button size="sm" onClick={handleUpdate} disabled={isUpdating || editCount <= 0}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isUpdating}>
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge className="text-sm font-medium">
              {item.count.toLocaleString()}
            </Badge>
            {canEdit && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isUpdating}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CollaboratorRow({ owner, isCurrentUser }: { owner: any; isCurrentUser: boolean }) {
  const avatarUrl = owner.avatar 
    ? `https://cdn.discordapp.com/avatars/${owner.discord_id}/${owner.avatar}.png?size=32`
    : null;

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={owner.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium">
            {(owner.global_name || owner.username).slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="flex-1">
        <p className="font-medium text-foreground">
          {owner.global_name || owner.username}
          {isCurrentUser && <span className="text-muted-foreground ml-2">(you)</span>}
        </p>
        <p className="text-sm text-muted-foreground">@{owner.username}</p>
      </div>

      <Badge variant={isCurrentUser ? "default" : "secondary"}>
        {isCurrentUser ? "Owner" : "Collaborator"}
      </Badge>
    </div>
  );
}

export function ProjectDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<CraftingProjectResponse | null>(null);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (uuid) {
      loadProject();
    }
  }, [uuid]);

  const loadProject = async () => {
    if (!uuid) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const projectData = await authService.getProjectByUuid(uuid);
      setProject(projectData);
      
      // For now, mock the item details since we need to integrate with the search/item system
      const mockItems: ItemWithDetails[] = projectData.target_items.map((item) => ({
        id: item.item.id,
        name: item.item.name || item.item.description || `Item ${item.item.id}`,
        description: item.item.description || 'A crafting item',
        icon_asset_name: item.item.icon_asset_name,
        tier: item.item.tier,
        tag: item.item.tag,
        count: item.count,
      }));
      setItems(mockItems);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!project) return;
    
    const shareUrl = project.is_private 
      ? `${window.location.origin}/projects/${project.public_uuid}`
      : window.location.href;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !uuid) return;
    
    const confirmMessage = `Are you sure you want to delete "${project.project_name}"? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;
    
    try {
      await authService.deleteProject(uuid);
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  const canEdit = project && user && project.owners.some(owner => owner.user_id === user.id);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading project...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Project Not Found
            </h3>
            <p className="text-muted-foreground mb-6">
              {error || 'The project you\'re looking for doesn\'t exist or you don\'t have access to it.'}
            </p>
            <Button onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.project_name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {items.length} items
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {project.owners.length} collaborator{project.owners.length !== 1 ? 's' : ''}
                </span>
                {project.is_private && (
                  <Badge variant="secondary">Private Access</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyShareLink}>
              {linkCopied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {linkCopied ? 'Copied!' : 'Share'}
            </Button>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </DropdownMenuTrigger>
                                 <DropdownMenuContent>
                   <DropdownMenuItem onClick={handleDeleteProject} className="text-destructive focus:text-destructive">
                     <Trash2 className="h-4 w-4 mr-2" />
                     Delete Project
                   </DropdownMenuItem>
                 </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Main content */}
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Items</CardTitle>
                    <CardDescription>
                      Manage the items and quantities for this project
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <AddItemDialog projectUuid={uuid!} onItemAdded={loadProject} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No items added yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding items you need for this project
                    </p>
                    {canEdit && (
                      <AddItemDialog projectUuid={uuid!} onItemAdded={loadProject} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        projectUuid={uuid!}
                        canEdit={!!canEdit}
                        onItemUpdated={loadProject}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Collaborators</CardTitle>
                    <CardDescription>
                      People who can view and edit this project
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Collaborator
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.owners.map((owner) => (
                    <CollaboratorRow
                      key={owner.user_id}
                      owner={owner}
                      isCurrentUser={user?.id === owner.user_id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-medium">
                      {items.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collaborators</span>
                    <span className="font-medium">{project.owners.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Share Links</CardTitle>
                  <CardDescription>
                    Share your project with others
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">View Only Link</Label>
                    <div className="flex mt-1">
                      <Input
                        value={`${window.location.origin}/projects/${project.public_uuid}`}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button size="sm" variant="outline" className="ml-2">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {canEdit && (
                    <div>
                      <Label className="text-sm font-medium">Edit Link</Label>
                      <div className="flex mt-1">
                        <Input
                          value={`${window.location.origin}/projects/${project.private_uuid}`}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button size="sm" variant="outline" className="ml-2">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 