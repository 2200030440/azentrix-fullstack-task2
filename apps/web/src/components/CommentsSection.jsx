import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Send, Trash2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const CommentsSection = ({ isOpen, onClose, task }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      fetchComments();
      
      pb.collection('comments').subscribe('*', (e) => {
        if (e.record.taskId === task.id) {
          fetchComments();
        }
      }, { $autoCancel: false });
    }

    return () => {
      pb.collection('comments').unsubscribe('*');
    };
  }, [isOpen, task]);

  const fetchComments = async () => {
    try {
      const records = await pb.collection('comments').getFullList({
        filter: `taskId = "${task.id}"`,
        sort: '-created',
        expand: 'userId',
        $autoCancel: false
      });
      setComments(records);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await pb.collection('comments').create({
        userId: currentUser.id,
        taskId: task.id,
        message: newComment
      }, { $autoCancel: false });

      setNewComment('');
      toast('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await pb.collection('comments').delete(commentId, { $autoCancel: false });
      toast('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast('Failed to delete comment');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments - {task?.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet</p>
            ) : (
              comments.map((comment) => {
                const user = comment.expand?.userId;
                const avatarUrl = user?.avatar
                  ? pb.files.getURL(user, user.avatar, { thumb: '50x50' })
                  : null;

                return (
                  <div key={comment.id} className="flex gap-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.name}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{user?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created || comment.createdAt || new Date()), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {comment.userId === currentUser.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap break-words">{comment.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="flex-1 text-foreground placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" disabled={loading || !newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsSection;