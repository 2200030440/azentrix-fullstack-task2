import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Mail } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const ProfilePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const avatarUrl = currentUser?.avatar
    ? pb.files.getURL(currentUser, currentUser.avatar, { thumb: '200x200' })
    : null;

  return (
    <>
      <Helmet>
        <title>Profile - TaskFlow</title>
        <meta name="description" content="View your profile" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground mt-1">Your account information</p>
              </div>

              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={currentUser?.name}
                        className="h-32 w-32 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-4xl font-medium text-primary">
                          {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}

                    <div>
                      <h2 className="text-2xl font-bold">{currentUser?.name}</h2>
                      <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{currentUser?.email}</span>
                      </div>
                      {currentUser?.role && (
                        <Badge variant="secondary" className="mt-3">
                          {currentUser.role}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => navigate('/settings')}>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default ProfilePage;