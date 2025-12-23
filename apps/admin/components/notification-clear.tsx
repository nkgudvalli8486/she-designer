'use client';

import { useEffect } from 'react';

export function NotificationClear() {
  useEffect(() => {
    // Mark all notifications as viewed when page is visited
    const markAsViewed = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (data.notifications) {
          const viewedIds = data.notifications.map((n: any) => n.id);
          localStorage.setItem('viewedNotifications', JSON.stringify(viewedIds));
          // Trigger a custom event to update the topbar
          window.dispatchEvent(new CustomEvent('notificationsViewed'));
        }
      } catch (error) {
        console.error('Error marking notifications as viewed:', error);
      }
    };
    
    markAsViewed();
  }, []);
  
  return null;
}
