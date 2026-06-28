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
  const { currentUser, updateProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0, activeMembers: 0 });
  const [activities, setActivities] = useState([]);
  const [standup, setStandup] = useState({ yesterday: '', today: '', blockers: '' });
  const [teamStandups, setTeamStandups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
      setStandup({
        yesterday: currentUser.standupYesterday || '',
        today: currentUser.standupToday || '',
        blockers: currentUser.standupBlockers || ''
      });
    }
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

      // Fetch all users to display team standups
      try {
        const users = await pb.collection('users').getFullList({
          $autoCancel: false,
        });
        const activeStandups = users.filter(
          (u) => u.standupToday || u.standupYesterday || u.standupBlockers
        );
        setTeamStandups(activeStandups);
      } catch (err) {
        console.error('Error fetching team standups:', err);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleStandupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile({
        standupYesterday: standup.yesterday,
        standupToday: standup.today,
        standupBlockers: standup.blockers,
        standupDate: new Date().toISOString().split('T')[0]
      });
      toast.success('Daily Standup saved successfully!');
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
                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Total Tasks</CardTitle>
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="text-3xl font-extrabold tracking-tight">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Completed</CardTitle>
                    <div className="p-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="text-3xl font-extrabold tracking-tight text-green-600 dark:text-green-400">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {completionRate}% completion rate
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Overdue</CardTitle>
                    <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-450">{stats.overdue}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Active Members</CardTitle>
                    <div className="p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                      <Users className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="text-3xl font-extrabold tracking-tight">{stats.activeMembers}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Sprint Overview + Daily Standup */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm">
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

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm">
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

              {/* Activity Feed + Team Standups */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
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

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Team Daily Standups
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto pr-1">
                    {teamStandups.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No team standups posted yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {teamStandups.map((member) => (
                          <div
                            key={member.id}
                            className="pb-4 border-b last:border-0 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-primary">
                                  {member.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <span className="font-medium text-sm">{member.name}</span>
                              {member.standupDate && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {member.standupDate}
                                </span>
                              )}
                            </div>
                            <div className="pl-8 space-y-1 text-sm">
                              {member.standupYesterday && (
                                <p>
                                  <span className="font-semibold text-muted-foreground text-xs">YESTERDAY:</span> {member.standupYesterday}
                                </p>
                              )}
                              {member.standupToday && (
                                <p>
                                  <span className="font-semibold text-muted-foreground text-xs">TODAY:</span> {member.standupToday}
                                </p>
                              )}
                              {member.standupBlockers && (
                                <p className="text-rose-500">
                                  <span className="font-semibold text-xs">BLOCKERS:</span> {member.standupBlockers}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default DashboardPage;