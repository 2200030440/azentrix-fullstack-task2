import React from 'react';
import {
  Calendar,
  MessageSquare,
  Edit,
  Trash2
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  high: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
};

const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onOpenComments,
}) => {
  const { currentUser } = useAuth();
  const assignee = task.expand?.assignee;

  // Permission check:
  // - Admins can edit/delete any card
  // - Members can only edit/delete cards assigned to them
  const isAdmin = currentUser?.role === 'admin';
  const isOwnCard = task.assignee === currentUser?.id;
  const canManage = isAdmin || isOwnCard;

  const assigneeAvatar =
    assignee?.avatar
      ? pb.files.getURL(
          assignee,
          assignee.avatar,
          {
            thumb: '50x50',
          }
        )
      : null;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    document.body.style.cursor = 'default';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      default:
        return status;
    }
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="
        group
        cursor-grab
        active:cursor-grabbing
        border border-border/45
        bg-card/70
        hover:bg-card
        hover:border-primary/40
        hover:shadow-md hover:shadow-primary/5
        transition-all
        duration-200
        select-none
        overflow-hidden
        rounded-2xl
      "
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-sm line-clamp-2 flex-1">
            {task.title}
          </h3>

          {canManage && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="
                  h-7 w-7
                  opacity-0
                  group-hover:opacity-100
                  transition-opacity
                "
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="
                  h-7 w-7
                  opacity-0
                  group-hover:opacity-100
                  transition-opacity
                  text-destructive
                "
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {task.priority && (
            <Badge
              variant="secondary"
              className={
                priorityColors[task.priority] ||
                priorityColors.medium
              }
            >
              {task.priority}
            </Badge>
          )}

          {task.status && (
            <Badge variant="secondary">
              {getStatusLabel(task.status)}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />

                <span>
                  {format(
                    new Date(task.due_date),
                    'MMM d'
                  )}
                </span>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onOpenComments(task);
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Comments</span>
            </Button>
          </div>

          {assignee && (
            <div className="flex items-center gap-1.5">
              {assigneeAvatar ? (
                <img
                  src={assigneeAvatar}
                  alt={assignee.name || 'User'}
                  className="
                    h-6 w-6
                    rounded-full
                    object-cover
                    border
                  "
                />
              ) : (
                <div
                  className="
                    h-6 w-6
                    rounded-full
                    bg-primary/10
                    flex
                    items-center
                    justify-center
                  "
                >
                  <span className="text-xs font-medium text-primary">
                    {(assignee.name || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;