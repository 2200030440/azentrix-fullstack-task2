import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const TeamMembersPage = () => {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const records = await pb.collection('users').getFullList({
        sort: 'name',
        $autoCancel: false
      });
      setMembers(records);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await pb.collection('users').update(memberId, { role: newRole }, { $autoCancel: false });
      toast.success('User role updated successfully');
      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (memberId === currentUser.id) {
      toast.error('You cannot delete yourself');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user? All their records will remain but they will lose access.')) return;
    try {
      await pb.collection('users').delete(memberId, { $autoCancel: false });
      toast.success('User deleted successfully');
      fetchMembers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  return (
    <>
      <Helmet>
        <title>Team Members - TaskFlow</title>
        <meta name="description" content="Manage team members" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
                <p className="text-muted-foreground mt-1">Manage users and roles</p>
              </div>

              {members.length === 0 ? (
                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Users className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No team members found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => {
                    const avatarUrl = member.avatar
                      ? pb.files.getURL(member, member.avatar, { thumb: '100x100' })
                      : null;
                    const isAdminUser = currentUser?.role === 'admin';
                    const isSelf = member.id === currentUser.id;

                    return (
                      <Card key={member.id} className="rounded-2xl border border-border/40 bg-card/65 hover:bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={member.name}
                                  className="h-12 w-12 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-lg font-medium text-primary">
                                    {member.name?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{member.name}</p>
                                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                                {!isAdminUser && member.role && (
                                  <Badge variant="secondary" className="mt-2 bg-secondary text-secondary-foreground font-semibold">
                                    {member.role}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {isAdminUser && (
                              <div className="flex items-center gap-3 pt-3 border-t border-border/40 mt-1">
                                <div className="flex-1">
                                  <Select 
                                    value={member.role || 'member'} 
                                    onValueChange={(val) => handleUpdateRole(member.id, val)}
                                    disabled={isSelf}
                                  >
                                    <SelectTrigger className="w-full h-9 bg-background/50">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="member">Member</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {!isSelf && (
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-9 w-9 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
                                    onClick={() => handleDeleteMember(member.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default TeamMembersPage;