import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Kanban } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const BoardsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (currentUser) fetchBoards();
  }, [currentUser]);

  const fetchBoards = async () => {
    try {
      const queryParams = {
        sort: '-created',
        expand: 'members',
        $autoCancel: false
      };

      if (currentUser?.role !== 'admin') {
        queryParams.filter = `owner = "${currentUser.id}" || members ~ "${currentUser.id}"`;
      }

      const records = await pb.collection('boards').getFullList(queryParams);
      setBoards(records);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pb.collection('boards').create({
        name: formData.name,
        description: formData.description,
        owner: currentUser.id,
        members: [currentUser.id]
      }, { $autoCancel: false });

      toast('Board created successfully');
      setFormData({ name: '', description: '' });
      setIsCreateOpen(false);
      fetchBoards();
    } catch (error) {
      console.error('Error creating board:', error);
      toast('Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Boards - TaskFlow</title>
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
                  <p className="text-muted-foreground mt-1">Manage your project boards</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Board
                </Button>
              </div>

              {boards.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Kanban className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first board to start organizing tasks
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Board
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {boards.map((board) => (
                    <Card
                      key={board.id}
                      className="cursor-pointer rounded-2xl border border-border/40 bg-card/65 hover:bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                      onClick={() => navigate(`/board/${board.id}`)}
                    >
                      <CardHeader>
                        <CardTitle>{board.name}</CardTitle>
                        {board.description && (
                          <CardDescription className="line-clamp-2">{board.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{Array.isArray(board.members) ? board.members.length : 0} members</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
        <Footer />
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Board Name</Label>
              <Input id="name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required placeholder="My Project" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3} placeholder="What is this board about?" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoardsPage;