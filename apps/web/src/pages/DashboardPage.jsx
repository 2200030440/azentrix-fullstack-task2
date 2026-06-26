import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import pb from '@/lib/pocketbaseClient';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0, activeMembers: 0 });
  const [activities, setActivities] = useState([]);
  const [standup, setStandup] = useState({ yesterday: '', today: '', blockers: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all boards where current user is owner OR member
      const boards = await pb.collection('boards').getFullList({
        $autoCancel: false,
      });

      // Filter boards where user is owner or in members list
      const myBoards = boards.filter(
        (b) =>
          b.owner === currentUser.id ||
          (Array.isArray(b.members) && b.members.includes(currentUser.id))
      );

      const boardIds = myBoards.map((b) => b.id);

      if (boardIds.length === 0) {
        setStats({ total: 0, completed: 0, overdue: 0, activeMembers: 0 });
        return;
      }

      // Fetch all tasks for those boards
      const filterStr = boardIds.map((id) => `board = "${id}"`).join(' || ');

      const tasks = await pb.collection('tasks').getFullList({
        filter: filterStr,
        $autoCancel: false,
      });

      const now = new Date();
      const completed = tasks.filter((t) => t.status === 'done').length;
      const overdue = tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < now &&
          t.status !== 'done'
      ).length;

      // Count unique members across all boards
      const allMemberIds = new Set();
      myBoards.forEach((b) => {
        if (b.owner) allMemberIds.add(b.owner);
        if (Array.isArray(b.members)) b.members.forEach((m) => allMemberIds.add(m));
      });

      setStats({
        total: tasks.length,
        completed,
        overdue,
        activeMembers: allMemberIds.size,
      });

      // Fetch activity logs
      try {
        const activityRecords = await pb.collection('activity_logs').getFullList({
          sort: '-created',
          expand: 'user',
          $autoCancel: false,
        });
        setActivities(activityRecords.slice(0, 10));
      } catch (err) {
        // activity_logs may be empty or restricted — ignore
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleStandupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      toast.success('Standup saved!');
      // If you add a standups collection later, save here
    } catch (error) {
      console.error('Error saving standup:', error);
      toast.error('Failed to save standup');
    } finally {
      setLoading(false);
    }
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <>
      <Helmet>
        <title>Dashboard - TaskFlow</title>
        <meta name="description" content="Your TaskFlow dashboard overview" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Welcome back, {currentUser?.name}
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {completionRate}% completion rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.overdue}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeMembers}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Sprint Overview + Daily Standup */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Sprint Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">{completionRate}%</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-2xl font-bold">{stats.total - stats.completed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold">{stats.completed}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Standup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleStandupSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="yesterday">What did you do yesterday?</Label>
                        <Textarea
                          id="yesterday"
                          value={standup.yesterday}
                          onChange={(e) =>
                            setStandup({ ...standup, yesterday: e.target.value })
                          }
                          rows={2}
                          className="text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="today">What will you do today?</Label>
                        <Textarea
                          id="today"
                          value={standup.today}
                          onChange={(e) =>
                            setStandup({ ...standup, today: e.target.value })
                          }
                          rows={2}
                          className="text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="blockers">Any blockers?</Label>
                        <Textarea
                          id="blockers"
                          value={standup.blockers}
                          onChange={(e) =>
                            setStandup({ ...standup, blockers: e.target.value })
                          }
                          rows={2}
                          className="text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Saving...' : 'Save Standup'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Team Activity Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No recent activity
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 pb-4 border-b last:border-0"
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">
                                {activity.expand?.user?.name || 'Someone'}
                              </span>{' '}
                              <span className="text-muted-foreground">
                                {activity.action}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(activity.created), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

export default DashboardPage;