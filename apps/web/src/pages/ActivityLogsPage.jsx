import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import pb from '@/lib/pocketbaseClient';

const ActivityLogsPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [activities, actionFilter]);

  const fetchActivities = async () => {
    try {
      const records = await pb.collection('activityLogs').getFullList({
        sort: '-createdAt',
        expand: 'userId,taskId,boardId',
        $autoCancel: false
      });
      setActivities(records);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    if (actionFilter !== 'all') {
      filtered = filtered.filter(activity => activity.action === actionFilter);
    }

    setFilteredActivities(filtered);
  };

  const actionColors = {
    created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    edited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    moved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  };

  return (
    <>
      <Helmet>
        <title>Activity Logs - TaskFlow</title>
        <meta name="description" content="View all activity logs" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
                  <p className="text-muted-foreground mt-1">Track all board activities</p>
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="edited">Edited</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="moved">Moved</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredActivities.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Activity className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No activity logs found</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {filteredActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Activity className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{activity.expand?.userId?.name || 'Someone'}</span>
                              <Badge className={actionColors[activity.action]} variant="secondary">
                                {activity.action}
                              </Badge>
                              {activity.expand?.taskId && (
                                <span className="text-sm text-muted-foreground">
                                  {activity.expand.taskId.title}
                                </span>
                              )}
                            </div>
                            {activity.details && (
                              <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default ActivityLogsPage;