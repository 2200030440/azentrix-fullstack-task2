import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TaskModal = ({ isOpen, onClose, task, boardId, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: '',
    due_date: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee: task.assignee || '',
        due_date: task.due_date ? task.due_date.split(' ')[0] : ''
      });
    } else {
      setFormData({ title: '', description: '', status: 'todo', priority: 'medium', assignee: '', due_date: '' });
    }
  }, [task, isOpen]);

  useEffect(() => {
    if (isOpen && boardId) fetchBoardMembers();
  }, [isOpen, boardId]);

  const fetchBoardMembers = async () => {
    try {
      if (currentUser?.role === 'admin') {
        const allUsers = await pb.collection('users').getFullList({
          sort: 'name',
          $autoCancel: false
        });
        setMembers(allUsers);
      } else {
        const board = await pb.collection('boards').getOne(boardId, {
          expand: 'members',
          $autoCancel: false
        });
        setMembers(board.expand?.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const data = {
      title: formData.title,
      status: formData.status,
      priority: formData.priority,
      board: boardId,
    };

    if (formData.description) data.description = formData.description;
    if (formData.assignee) data.assignee = formData.assignee;
    if (formData.due_date) data.due_date = formData.due_date + ' 00:00:00';

    console.log('Submitting:', JSON.stringify(data));

    if (task) {
      await pb.collection('tasks').update(task.id, data, { $autoCancel: false });
      toast('Task updated successfully');
    } else {
      await pb.collection('tasks').create(data, { $autoCancel: false });
      toast('Task created successfully');
    }

    onSuccess();
    onClose();
  } catch (error) {
    console.error('Error response:', JSON.stringify(error?.data));
    toast('Failed to save task: ' + (error?.message || 'Unknown error'));
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required placeholder="Task title" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  {(currentUser?.role === 'admin' || formData.status === 'done') && (
                    <SelectItem value="done">Done</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assignee</Label>
              <Select value={formData.assignee} onValueChange={(v) => setFormData({ ...formData, assignee: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;