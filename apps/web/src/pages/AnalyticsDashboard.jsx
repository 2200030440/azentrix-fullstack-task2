import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import pb from '@/lib/pocketbaseClient';

const AnalyticsDashboard = () => {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, overdue: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [currentUser]);

  const fetchAnalytics = async () => {
    try {
      const boards = await pb.collection('boards').getFullList({
        filter: `owner = "${currentUser.id}" || members ~ "${currentUser.id}"`,
        $autoCancel: false
      });

      const boardIds = boards.map(b => b.id);
      
      if (boardIds.length > 0) {
        const filterStr = boardIds.map(id => `board = "${id}"`).join(' || ');
        
        const tasks = await pb.collection('tasks').getFullList({
          filter: filterStr,
          $autoCancel: false
        });

        const completed = tasks.filter(t => t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'inprogress').length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;

        setStats({
          total: tasks.length,
          completed,
          inProgress,
          overdue
        });

        setChartData([
          { name: 'To Do', value: todo, color: '#818cf8' },
          { name: 'In Progress', value: inProgress, color: '#c084fc' },
          { name: 'Done', value: completed, color: '#34d399' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Analytics - TaskFlow</title>
        <meta name="description" content="View analytics and insights" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground mt-1">Track your team's performance</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Total Tasks</CardTitle>
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                      <TrendingUp className="h-4 w-4" />
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
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">In Progress</CardTitle>
                    <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                      <Clock className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="text-3xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">{stats.inProgress}</div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Overdue</CardTitle>
                    <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-450 rounded-xl">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-450">{stats.overdue}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-border/40 bg-card/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Task Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
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

export default AnalyticsDashboard;