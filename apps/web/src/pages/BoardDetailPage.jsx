import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import TaskCard from '@/components/TaskCard.jsx';
import TaskModal from '@/components/TaskModal.jsx';
import CommentsSection from '@/components/CommentsSection.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const BoardDetailPage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [board, setBoard] = useState(null);

  const [tasks, setTasks] = useState({
    todo: [],
    in_progress: [],
    done: [],
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('todo');

  useEffect(() => {
    fetchBoard();
    fetchTasks();

    pb.collection('tasks').subscribe(
      '*',
      (e) => {
        if (e.record?.board === id || e.action === 'delete') {
          fetchTasks();
        }
      },
      { $autoCancel: false }
    );

    return () => {
      pb.collection('tasks').unsubscribe('*');
    };
  }, [id]);

  const fetchBoard = async () => {
    try {
      const record = await pb.collection('boards').getOne(id, {
        expand: 'members',
        $autoCancel: false,
      });
      setBoard(record);
    } catch (error) {
      console.error('Error fetching board:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const records = await pb.collection('tasks').getFullList({
        filter: `board = "${id}"`,
        sort: '-created',
        expand: 'assignee',
        $autoCancel: false,
      });

      setTasks({
        todo: records.filter((t) => t.status === 'todo'),
        in_progress: records.filter((t) => t.status === 'in_progress'),
        done: records.filter((t) => t.status === 'done'),
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleCreateTask = (status) => {
    setSelectedTask(null);
    setSelectedStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (task) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this task?');
    if (!confirmDelete) return;

    try {
      await pb.collection('tasks').delete(task.id, { $autoCancel: false });
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleOpenComments = (task) => {
    setSelectedTask(task);
    setIsCommentsOpen(true);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    try {
      await pb.collection('tasks').update(
        taskId,
        { status: newStatus },
        { $autoCancel: false }
      );
      fetchTasks();
      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', tasks: tasks.todo },
    { id: 'in_progress', title: 'In Progress', tasks: tasks.in_progress },
    { id: 'done', title: 'Done', tasks: tasks.done },
  ];

  return (
    <>
      <Helmet>
        <title>{`${board?.name || 'Board'} - TaskFlow`}</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{board?.name}</h1>
                {board?.description && (
                  <p className="text-muted-foreground mt-1">{board.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="flex flex-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-lg">{column.title}</h2>
                        <Badge variant="secondary">{column.tasks.length}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCreateTask(column.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 flex-1 min-h-[200px]">
                      {column.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onOpenComments={handleOpenComments}
                        />
                      ))}

                      {column.tasks.length === 0 && (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                          No tasks yet
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        <Footer />
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        boardId={id}
        defaultStatus={selectedStatus}
        onSuccess={fetchTasks}
      />

      <CommentsSection
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        task={selectedTask}
      />
    </>
  );
};

export default BoardDetailPage;