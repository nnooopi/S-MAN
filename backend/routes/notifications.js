const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

// =====================================================
// GET /api/notifications - Get all notifications for current user
// =====================================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 50, 
      offset = 0, 
      type,  // Filter by notification_type
      is_read,  // Filter by read status
      course_id,  // Filter by course
      project_id  // Filter by project
    } = req.query;

    console.log('📥 Fetching notifications for user:', userId);

    // Build query
    let query = supabase
      .from('notifications')
      .select(`*`)
      .eq('recipient_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('notification_type', type);
    }
    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }
    if (course_id) {
      query = query.eq('course_id', course_id);
    }
    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch notifications',
        error: error.message 
      });
    }

    console.log(`✅ Found ${data.length} notifications`);

    // Fetch actor details separately if needed
    let notificationsWithActor = data;
    if (data.length > 0) {
      const actorIds = [...new Set(data.map(n => n.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const { data: actorData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, profile_image_url')
          .in('id', actorIds);
        
        const actorMap = {};
        if (actorData) {
          actorData.forEach(actor => {
            actorMap[actor.id] = actor;
          });
        }

        notificationsWithActor = data.map(notification => ({
          ...notification,
          actor: notification.actor_id ? actorMap[notification.actor_id] : null
        }));
      }
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false);

    res.json({
      success: true,
      notifications: notificationsWithActor,
      total: count,
      unread_count: unreadCount,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: notificationsWithActor.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// =====================================================
// GET /api/notifications/unread-count - Get unread count
// =====================================================
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .eq('is_archived', false);

    if (error) {
      console.error('❌ Error fetching unread count:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch unread count',
        error: error.message 
      });
    }

    res.json({
      success: true,
      unread_count: count
    });

  } catch (error) {
    console.error('❌ Error in GET /notifications/unread-count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// =====================================================
// PUT /api/notifications/:id/read - Mark notification as read
// =====================================================
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    console.log(`📖 Marking notification ${id} as read for user ${userId}`);

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error marking notification as read:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to mark notification as read',
        error: error.message 
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    console.log('✅ Notification marked as read');

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: data
    });

  } catch (error) {
    console.error('❌ Error in PUT /notifications/:id/read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// =====================================================
// PUT /api/notifications/mark-all-read - Mark all as read
// =====================================================
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📖 Marking all notifications as read for user ${userId}`);

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to mark all notifications as read',
        error: error.message 
      });
    }

    console.log(`✅ Marked ${data.length} notifications as read`);

    res.json({
      success: true,
      message: `${data.length} notifications marked as read`,
      count: data.length
    });

  } catch (error) {
    console.error('❌ Error in PUT /notifications/mark-all-read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// =====================================================
// DELETE /api/notifications/:id - Delete notification
// =====================================================
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    console.log(`🗑️ Deleting notification ${id} for user ${userId}`);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error deleting notification:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete notification',
        error: error.message 
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    console.log('✅ Notification deleted');

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /notifications/:id:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// =====================================================
// DELETE /api/notifications/clear-all - Clear all notifications
// =====================================================
router.delete('/clear-all', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🗑️ Clearing all notifications for user ${userId}`);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId)
      .select();

    if (error) {
      console.error('❌ Error clearing notifications:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to clear notifications',
        error: error.message 
      });
    }

    console.log(`✅ Cleared ${data.length} notifications`);

    res.json({
      success: true,
      message: `${data.length} notifications cleared`,
      count: data.length
    });

  } catch (error) {
    console.error('❌ Error in DELETE /notifications/clear-all:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// =====================================================
// POST /api/notifications/test - Create test notification (dev only)
// =====================================================
router.post('/test', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🧪 Creating test notification for user ${userId}`);

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: userId,
        notification_type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification created at ' + new Date().toLocaleString(),
        metadata: { test: true }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating test notification:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create test notification',
        error: error.message 
      });
    }

    console.log('✅ Test notification created');

    res.json({
      success: true,
      message: 'Test notification created',
      notification: data
    });

  } catch (error) {
    console.error('❌ Error in POST /notifications/test:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;
