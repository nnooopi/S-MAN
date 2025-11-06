const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer for memory storage (we'll upload directly to Supabase)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow any file type
    cb(null, true);
  }
});

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get all announcements for a course with comments and files
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const { data: announcements, error } = await supabase
      .from('announcements')
      .select(`
        *,
        professoraccounts!announcements_created_by_fkey (
          first_name,
          last_name,
          email,
          profile_image_url
        ),
        announcement_files (
          id,
          file_name,
          file_path,
          file_size,
          file_type,
          mime_type,
          is_image,
          image_width,
          image_height
        ),
        announcement_comments (
          id,
          content,
          user_id,
          user_type,
          parent_comment_id,
          is_edited,
          edited_at,
          created_at,
          updated_at
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return res.status(500).json({ error: 'Failed to fetch announcements' });
    }

    // Process announcements to include user details for comments
    const processedAnnouncements = await Promise.all(
      (announcements || []).map(async (announcement) => {
        // Process professor profile image URL
        if (announcement.professoraccounts?.profile_image_url) {
          announcement.professoraccounts.profile_image_url = 
            `/api/files/${announcement.professoraccounts.profile_image_url}`;
        }

        // Get user details for comments
        const commentsWithUsers = await Promise.all(
          announcement.announcement_comments.map(async (comment) => {
            let userDetails = null;
            
            if (comment.user_type === 'professor') {
              const { data: professor } = await supabase
                .from('professoraccounts')
                .select('first_name, last_name, email, profile_image_url')
                .eq('id', comment.user_id)
                .single();
              
              if (professor) {
                userDetails = {
                  ...professor,
                  profile_image_url: professor.profile_image_url 
                    ? `/api/files/${professor.profile_image_url}`
                    : null
                };
              }
            } else {
              const { data: student } = await supabase
                .from('studentaccounts')
                .select('first_name, last_name, email, profile_image_url')
                .eq('id', comment.user_id)
                .single();
              
              if (student) {
                userDetails = {
                  ...student,
                  profile_image_url: student.profile_image_url 
                    ? `/api/files/${student.profile_image_url}`
                    : null
                };
              }
            }
            
            return {
              ...comment,
              user: userDetails
            };
          })
        );

        return {
          ...announcement,
          announcement_comments: commentsWithUsers
        };
      })
    );

    res.json(processedAnnouncements);
  } catch (error) {
    console.error('Error in announcements API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new announcement with file uploads
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { course_id, title, content, type, created_by } = req.body;

    // Validate required fields
    if (!course_id || !title || !content || !created_by) {
      return res.status(400).json({ 
        error: 'Missing required fields: course_id, title, content, created_by' 
      });
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert([
        {
          course_id,
          title,
          content,
          type: type || 'general',
          created_by,
          is_active: true
        }
      ])
      .select(`
        *,
        professoraccounts!announcements_created_by_fkey (
          first_name,
          last_name,
          email,
          profile_image_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return res.status(500).json({ error: 'Failed to create announcement' });
    }

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const fileRecords = await Promise.all(
        req.files.map(async (file) => {
          const isImage = file.mimetype.startsWith('image/');
          const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
          const filePath = `announcements/${announcement.id}/${uniqueFileName}`;

          // Upload file to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('announcement-files')
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600'
            });

          if (uploadError) {
            console.error('Error uploading file to Supabase:', uploadError);
            return null;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('announcement-files')
            .getPublicUrl(filePath);

          return {
            announcement_id: announcement.id,
            file_name: file.originalname,
            file_path: publicUrl,
            file_size: file.size,
            file_type: path.extname(file.originalname).toLowerCase(),
            mime_type: file.mimetype,
            uploaded_by: created_by,
            uploaded_by_type: 'professor',
            is_image: isImage,
            image_width: null,
            image_height: null
          };
        })
      );

      // Filter out failed uploads
      const validFileRecords = fileRecords.filter(record => record !== null);

      if (validFileRecords.length > 0) {
        const { error: fileError } = await supabase
          .from('announcement_files')
          .insert(validFileRecords);

        if (fileError) {
          console.error('Error saving file records:', fileError);
          // Don't fail the request, just log the error
        }
      }
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error in create announcement API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an announcement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, is_active } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        professoraccounts!announcements_created_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return res.status(500).json({ error: 'Failed to update announcement' });
    }

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error in update announcement API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an announcement (soft delete by setting is_active to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting announcement:', error);
      return res.status(500).json({ error: 'Failed to delete announcement' });
    }

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error in delete announcement API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific announcement
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: announcement, error } = await supabase
      .from('announcements')
      .select(`
        *,
        professoraccounts!announcements_created_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching announcement:', error);
      return res.status(500).json({ error: 'Failed to fetch announcement' });
    }

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error in get announcement API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to announcement
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_type, content, parent_comment_id } = req.body;

    // Validate required fields
    if (!user_id || !user_type || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, user_type, content' 
      });
    }

    const { data: comment, error } = await supabase
      .from('announcement_comments')
      .insert([
        {
          announcement_id: id,
          user_id,
          user_type,
          content,
          parent_comment_id: parent_comment_id || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    // Get user details for the comment
    let userDetails = null;
    if (user_type === 'professor') {
      const { data: professor } = await supabase
        .from('professoraccounts')
        .select('first_name, last_name, email, profile_image_url')
        .eq('id', user_id)
        .single();
      userDetails = professor;
    } else {
      const { data: student } = await supabase
        .from('studentaccounts')
        .select('first_name, last_name, email, profile_image_url')
        .eq('id', user_id)
        .single();
      userDetails = student;
    }

    res.status(201).json({
      ...comment,
      user: userDetails
    });
  } catch (error) {
    console.error('Error in create comment API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment
router.put('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const { data: comment, error } = await supabase
      .from('announcement_comments')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }

    // Get user details for the comment
    let userDetails = null;
    if (comment.user_type === 'professor') {
      const { data: professor } = await supabase
        .from('professoraccounts')
        .select('first_name, last_name, email, profile_image_url')
        .eq('id', comment.user_id)
        .single();
      userDetails = professor;
    } else {
      const { data: student } = await supabase
        .from('studentaccounts')
        .select('first_name, last_name, email, profile_image_url')
        .eq('id', comment.user_id)
        .single();
      userDetails = student;
    }

    res.json({
      ...comment,
      user: userDetails
    });
  } catch (error) {
    console.error('Error in update comment API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;

    const { error } = await supabase
      .from('announcement_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error in delete comment API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for an announcement
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: comments, error } = await supabase
      .from('announcement_comments')
      .select('*')
      .eq('announcement_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    // Get user details for each comment
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        let userDetails = null;
        
        if (comment.user_type === 'professor') {
          const { data: professor } = await supabase
            .from('professoraccounts')
            .select('first_name, last_name, email, profile_image_url')
            .eq('id', comment.user_id)
            .single();
          userDetails = professor;
        } else {
          const { data: student } = await supabase
            .from('studentaccounts')
            .select('first_name, last_name, email, profile_image_url')
            .eq('id', comment.user_id)
            .single();
          userDetails = student;
        }
        
        return {
          ...comment,
          user: userDetails
        };
      })
    );

    res.json(commentsWithUsers);
  } catch (error) {
    console.error('Error in get comments API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get file download URL from Supabase storage
router.get('/files/:announcementId/:filename', async (req, res) => {
  try {
    const { announcementId, filename } = req.params;
    const filePath = `announcements/${announcementId}/${filename}`;
    
    // Get signed URL for file download
    const { data, error } = await supabase.storage
      .from('announcement-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ downloadUrl: data.signedUrl });
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

module.exports = router;
