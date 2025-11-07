
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');


require('dotenv').config();

// Determine the correct path to frontend build folder
const frontendBuildPath = path.join(__dirname, '../frontend/build');
const buildPathExists = fs.existsSync(frontendBuildPath);
console.log('🔍 [PATH] __dirname:', __dirname);
console.log('🔍 [PATH] frontendBuildPath:', frontendBuildPath);
console.log('🔍 [PATH] Build folder exists:', buildPathExists);

const app = express();

// Request timeout to prevent hanging requests
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minute timeout
  next();
});

// Middleware
app.use(cors());
app.use(express.json({
  limit: '50mb',  // Increase limit to handle base64-encoded files
  type: function (req) {
    // Only parse JSON for requests that explicitly have JSON content type
    const contentType = req.get('content-type');
    if (!contentType) return false;
    
    // Don't parse as JSON if it's multipart/form-data or any other form type
    if (contentType.includes('multipart/form-data') || 
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('text/plain')) {
      return false;
    }
    
    return contentType.includes('application/json');
  }
}));

// Serve frontend build files if they exist
if (buildPathExists) {
  console.log('📁 [INIT] Serving frontend from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));
} else {
  console.log('⚠️  [WARNING] Frontend build folder not found at:', frontendBuildPath);
}



// Supabase client with service role for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

console.log('🔐 [INIT] Supabase client initialized');
console.log('🔐 [INIT] URL:', process.env.SUPABASE_URL || 'using default');
console.log('🔐 [INIT] Service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Replace your existing getFreshSupabaseClient with this:
const getFreshSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'x-request-id': `req-${Date.now()}-${Math.random()}`
        }
      }
    }
  );
};

// Database connection check
const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('adminaccounts')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
    } else {
      console.log('✅ Database connection OK');
    }
  } catch (error) {
    console.error('Database health check failed:', error);
  }
};
checkDatabaseConnection();

// ✅ Helper function to convert profile image URLs to correct API paths
const getProfileImageUrl = (studentId, profileImagePath) => {
  if (!profileImagePath) return null;
  
  // If it's already an API path, return as-is
  if (profileImagePath.startsWith('/api/files/') || profileImagePath.startsWith('http')) {
    return profileImagePath;
  }
  
  // If it's just a filename, construct the full API path
  const fileName = profileImagePath.split('/').pop() || profileImagePath;
  return `/api/files/studentaccounts/${studentId}/${fileName}`;
};

// ✅ Helper function to convert profile image URLs in objects
const enrichProfileImages = (obj, studentId) => {
  if (!obj || !studentId) return obj;
  
  if (obj.profile_image_url) {
    obj.profile_image_url = getProfileImageUrl(studentId, obj.profile_image_url);
  }
  
  if (obj.feedback_by_image) {
    obj.feedback_by_image = getProfileImageUrl(obj.feedback_by || studentId, obj.feedback_by_image);
  }
  
  return obj;
};

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'registrationCard') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Registration card must be a PDF file'), false);
      }
    } else if (file.fieldname === 'profileImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Profile image must be an image file'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// Store verification codes temporarily (in production, use Redis)
const verificationCodes = new Map();

// =================== UTILITY FUNCTIONS ===================

// Generate verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate join code for courses
function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =================== AUTHENTICATION MIDDLEWARES ===================

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('🔍 Checking admin token...');

    // Try Supabase Auth first
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      console.log('✅ Valid Supabase token for user:', user.id);
      
      const { data: admin, error: adminError } = await supabase
        .from('adminaccounts')
        .select('*')
        .eq('id', user.id)
        .single();

      if (admin && !adminError) {
        console.log('👑 Admin access granted:', admin.email);
        req.admin = admin;
        req.user = user;
        return next();
      } else {
        console.log('❌ User not found in adminaccounts table');
        return res.status(403).json({ error: 'Admin access required - not in admin table' });
      }
    }

    // If Supabase Auth fails, try JWT verification (for legacy tokens)
    try {
      console.log('🔄 Trying JWT verification...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.userType === 'admin') {
        console.log('✅ Valid JWT admin token');
        
        const { data: admin, error: adminError } = await supabase
          .from('adminaccounts')
          .select('*')
          .eq('email', decoded.email)
          .single();

        if (admin && !adminError) {
          req.admin = admin;
          return next();
        }
      }
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
    }

    console.log('❌ Admin authentication failed');
    return res.status(403).json({ error: 'Admin access required' });

  } catch (error) {
    console.error('💥 Admin auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// ✅ FIXED: Professor authentication middleware
// Replace your existing authenticateProfessor middleware with this enhanced version
const authenticateProfessor = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ Professor: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('🔍 Professor: Checking token...');

    // Try Supabase Auth first
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      console.log('✅ Professor: Valid Supabase token for user:', user.id);
      
      // Enhanced database lookup with retry logic
      let professor = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!professor && attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Professor: Database lookup attempt ${attempts}/${maxAttempts}`);
        
        // Use fresh connection for each attempt
        const freshSupabase = getFreshSupabaseClient();
        
        try {
          const { data: prof, error: profErr } = await freshSupabase
            .from('professoraccounts')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (prof && !profErr) {
            professor = prof;
            console.log(`✅ Professor: Found professor on attempt ${attempts}:`, professor.email);
            break;
          } else {
            console.log(`❌ Professor: Attempt ${attempts} failed:`, profErr?.message);
            
            // Add exponential backoff delay between attempts
            if (attempts < maxAttempts) {
              const delay = Math.min(100 * Math.pow(2, attempts - 1), 1000); // Max 1 second
              console.log(`⏳ Professor: Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        } catch (dbError) {
          console.log(`💥 Professor: Database error on attempt ${attempts}:`, dbError.message);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      if (professor) {
        console.log('✅ Professor: Authentication successful for:', professor.email);
        
        // Create standardized user object
        req.professor = professor;
        req.user = {
          id: professor.id,
          email: professor.email,
          firstName: professor.first_name,
          lastName: professor.last_name,
          employeeNumber: professor.employee_number,
          college: professor.college,
          userType: 'professor'
        };
        
        return next();
      } else {
        console.log('❌ Professor: Professor not found after all attempts');
        
        // Last resort: try to find by email
        try {
          const freshSupabase = getFreshSupabaseClient();
          const { data: profByEmail, error: emailErr } = await freshSupabase
            .from('professoraccounts')
            .select('*')
            .eq('email', user.email)
            .single();
          
          if (profByEmail) {
            console.log('⚠️ Professor: Found by email but using fallback method');
            console.log('- Auth ID:', user.id);
            console.log('- Prof ID:', profByEmail.id);
            
            if (profByEmail.id === user.id) {
              // IDs match, use the professor
              req.professor = profByEmail;
              req.user = {
                id: profByEmail.id,
                email: profByEmail.email,
                firstName: profByEmail.first_name,
                lastName: profByEmail.last_name,
                employeeNumber: profByEmail.employee_number,
                college: profByEmail.college,
                userType: 'professor'
              };
              console.log('✅ Professor: Fallback authentication successful');
              return next();
            }
          }
        } catch (fallbackError) {
          console.log('💥 Professor: Fallback lookup failed:', fallbackError.message);
        }
        
        return res.status(403).json({ 
          error: 'Professor access required - database lookup failed',
          details: 'Professor record exists but could not be retrieved consistently'
        });
      }
    }

    // If Supabase Auth fails, try JWT verification (for legacy tokens)
    try {
      console.log('🔄 Professor: Trying JWT verification...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.userType === 'professor') {
        console.log('✅ Professor: Valid JWT token');
        
        const freshSupabase = getFreshSupabaseClient();
        const { data: professor, error: profErr } = await freshSupabase
          .from('professoraccounts')
          .select('*')
          .eq('email', decoded.email)
          .single();
          
        if (professor && !profErr) {
          console.log('✅ Professor: Found via JWT lookup:', professor.email);
          req.professor = professor;
          req.user = {
            id: professor.id,
            email: professor.email,
            firstName: professor.first_name,
            lastName: professor.last_name,
            employeeNumber: professor.employee_number,
            college: professor.college,
            userType: 'professor'
          };
          return next();
        }
      }
    } catch (jwtError) {
      console.log('❌ Professor: JWT verification failed:', jwtError.message);
    }

    console.log('❌ Professor: Authentication failed');
    return res.status(403).json({ error: 'Professor authentication failed' });
    
  } catch (err) {
    console.error('💥 Professor: Auth error:', err);
    res.status(401).json({ error: 'Professor authentication error', details: err.message });
  }
};

// ✅ ENHANCED: Student authentication middleware with better error handling
const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ Student: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('🔍 Student: Checking token...');

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      console.log('✅ Student: Valid Supabase token for user:', user.id, 'Email:', user.email);
      
      let student = null;
      const freshSupabase = getFreshSupabaseClient();
      
      // PRIMARY METHOD: Look up by email first (more reliable) with retries
      console.log('🔍 Student: Primary lookup by email...');
      let emailAttempts = 0;
      const maxEmailAttempts = 3;
      
      while (!student && emailAttempts < maxEmailAttempts) {
        emailAttempts++;
        console.log(`🔄 Student: Email lookup attempt ${emailAttempts}/${maxEmailAttempts} for email: ${user.email}`);
        
        try {
          const { data: stuByEmail, error: emailErr } = await freshSupabase
            .from('studentaccounts')
            .select('*')
            .eq('email', user.email);
          
          if (stuByEmail && !emailErr && stuByEmail.length > 0) {
            student = stuByEmail[0]; // Take first match
            console.log(`✅ Student: Found by email on attempt ${emailAttempts}:`, student.email, 'DB ID:', student.id);
            break;
          } else {
            console.log(`⚠️ Student: Email lookup attempt ${emailAttempts} failed:`, emailErr?.message || 'No results');
            
            // If it's the last attempt, don't wait
            if (emailAttempts < maxEmailAttempts) {
              console.log(`🕒 Student: Waiting before retry attempt ${emailAttempts + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 200 * emailAttempts));
            }
          }
        } catch (emailError) {
          console.log(`💥 Student: Email lookup error on attempt ${emailAttempts}:`, emailError.message);
          
          // If it's the last attempt, don't wait
          if (emailAttempts < maxEmailAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200 * emailAttempts));
          }
        }
      }
      
      // FALLBACK METHOD: If email lookup fails, try ID-based lookup
      if (!student) {
        console.log('🔄 Student: Fallback to ID-based lookup...');
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!student && attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 Student: ID lookup attempt ${attempts}/${maxAttempts}`);
          
          try {
            const { data: stu, error: stuErr } = await freshSupabase
              .from('studentaccounts')
              .select('*')
              .eq('id', user.id);
            
            if (stu && !stuErr && stu.length > 0) {
              student = stu[0];
              console.log(`✅ Student: Found by ID on attempt ${attempts}:`, student.email);
              break;
            } else {
              console.log(`❌ Student: ID attempt ${attempts} failed:`, stuErr?.message || 'No results');
              
              if (attempts < maxAttempts) {
                const delay = 100 * attempts;
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          } catch (dbError) {
            console.log(`💥 Student: ID lookup error on attempt ${attempts}:`, dbError.message);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      }
      
      // LAST RESORT: Aggressive lookup if both primary methods failed
      if (!student) {
        console.log('🔄 Student: LAST RESORT - Aggressive lookup for email:', user.email);
        try {
          // Try a broader query to see if the student exists at all
          const { data: allMatches, error: broadErr } = await freshSupabase
            .from('studentaccounts')
            .select('*')
            .ilike('email', `%${user.email}%`)
            .limit(5);
          
          if (allMatches && allMatches.length > 0) {
            console.log(`🔍 Student: Found ${allMatches.length} potential matches:`, 
              allMatches.map(s => ({ id: s.id, email: s.email, name: `${s.first_name} ${s.last_name}` })));
            
            // Find exact email match
            const exactMatch = allMatches.find(s => s.email === user.email);
            if (exactMatch) {
              student = exactMatch;
              console.log('✅ Student: LAST RESORT successful - found exact match:', student.email);
            }
          } else {
            console.log('❌ Student: LAST RESORT failed - no matches found');
          }
        } catch (broadError) {
          console.log('💥 Student: LAST RESORT error:', broadError.message);
        }
      }

      if (student) {
        console.log('✅ Student: Authentication successful for:', student.email, 'using DB ID:', student.id);
        
        // ✅ ENHANCED: Create comprehensive user object with correct student DB ID
        req.student = student;
        req.user = {
          id: student.id, // Always use the database student ID, not Supabase Auth ID
          authId: user.id, // Store the Supabase Auth ID separately for reference
          email: student.email,
          firstName: student.first_name,
          lastName: student.last_name,
          fullName: `${student.first_name} ${student.last_name}`,
          studentNumber: student.student_number,
          program: student.program,
          yearLevel: student.year_level,
          college: student.college,
          userType: 'student'
        };
        
        return next();
      } else {
        console.log('❌ Student: No student record found for Auth ID:', user.id, 'Email:', user.email);
        
        return res.status(403).json({ 
          error: 'Student access required - no matching student record found',
          details: `Auth ID: ${user.id}, Email: ${user.email}`,
          suggestion: 'Please contact administrator - your account may need to be activated in the student system'
        });
      }
    }

    // If Supabase Auth fails, try JWT verification (for legacy tokens)
    try {
      console.log('🔄 Student: Trying JWT verification...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.userType === 'student') {
        console.log('✅ Student: Valid JWT token');
        
        const freshSupabase = getFreshSupabaseClient();
        const { data: student, error: stuErr } = await freshSupabase
          .from('studentaccounts')
          .select('*')
          .eq('email', decoded.email)
          .single();
          
        if (student && !stuErr) {
          console.log('✅ Student: Found via JWT lookup:', student.email);
          req.student = student;
          req.user = {
            id: student.id,
            email: student.email,
            firstName: student.first_name,
            lastName: student.last_name,
            studentNumber: student.student_number,
            program: student.program,
            yearLevel: student.year_level,
            college: student.college,
            userType: 'student'
          };
          return next();
        }
      }
    } catch (jwtError) {
      console.log('❌ Student: JWT verification failed:', jwtError.message);
    }

    console.log('❌ Student: Authentication failed');
    return res.status(403).json({ error: 'Student authentication failed' });
    
  } catch (err) {
    console.error('💥 Student: Auth error:', err);
    res.status(401).json({ error: 'Student authentication error', details: err.message });
  }
};


const studentDashboardRoutes = require('./dashboard');
const deliverableSubmissionsRoutes = require('./routes/deliverable_submissions')(supabase, authenticateProfessor);

app.use('/api/student', authenticateStudent, studentDashboardRoutes);
app.use('/api/professor', deliverableSubmissionsRoutes);
// =================== EMAIL FUNCTIONS ===================

// Email functions
async function sendVerificationEmail(email, code, name) {
  const msg = {
    to: email,
    from: 'system@s-man.app',
    subject: 'S-MAN Account Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to S-MAN, ${name}!</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <p>Best regards,<br>S-MAN Team</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

async function sendApprovalEmail(email, name, userType) {
  const msg = {
    to: email,
    from: 'system@s-man.app',
    subject: 'S-MAN Account Approved - Welcome!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Congratulations, ${name}!</h2>
        <p>Your S-MAN ${userType} account has been approved by our administrators.</p>
        <p>You can now sign in to your account using your email and password.</p>
        <a href="https://your-domain.com/signin" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Sign In Now
        </a>
        <p>Welcome to the S-MAN community!</p>
        <p>Best regards,<br>S-MAN Team</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
}

async function sendRejectionEmail(email, name, userType, reason = '') {
  const msg = {
    to: email,
    from: 'system@s-man.app',
    subject: 'S-MAN Account Application - Update Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello ${name},</h2>
        <p>Thank you for your interest in joining S-MAN.</p>
        <p>After review, your ${userType} account application requires additional attention.</p>
        ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
        <p>Please feel free to submit a new application with any necessary corrections, or contact our support team if you have questions.</p>
        <p>We appreciate your understanding.</p>
        <p>Best regards,<br>S-MAN Team</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return false;
  }
}

// Function to clean up user folder from storage bucket
async function cleanupUserFiles(bucketName, email) {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(email);

    if (listError) {
      console.error(`Error listing files in ${bucketName}/${email}:`, listError);
      return false;
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${email}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(filePaths);

      if (deleteError) {
        console.error(`Error deleting files from ${bucketName}/${email}:`, deleteError);
        return false;
      }

      console.log(`✅ Successfully cleaned up ${filePaths.length} files from ${bucketName}/${email}`);
    }

    return true;
  } catch (error) {
    console.error(`Error cleaning up files for ${email}:`, error);
    return false;
  }
}

// =================== SIGNUP ENDPOINTS ===================

// Student signup endpoint
app.post('/api/signup/student', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'registrationCard', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      firstName, middleName, lastName, studentNumber, program,
      college, email, password, classStatus, yearLevel
    } = req.body;

    // Validation
    if (!email.endsWith('@student.fatima.edu.ph')) {
      return res.status(400).json({ error: 'Email must end with @student.fatima.edu.ph' });
    }

    if (!['BSIT', 'BSEMC', 'BSCS'].includes(program)) {
      return res.status(400).json({ error: 'Invalid program' });
    }

    if (!['regular', 'irregular'].includes(classStatus)) {
      return res.status(400).json({ error: 'Invalid class status' });
    }

    if (parseInt(yearLevel) < 1 || parseInt(yearLevel) > 4) {
      return res.status(400).json({ error: 'Year level must be between 1 and 4' });
    }

    // Check if email already exists in pending accounts
    const { data: existingPendingByEmail } = await supabase
      .from('pending_studentaccounts')
      .select('email')
      .eq('email', email)
      .single();

    if (existingPendingByEmail) {
      return res.status(400).json({ 
        error: 'An account with this email is already pending approval. Please check your email for the verification code or contact support.' 
      });
    }

    // Check if email already exists in approved accounts  
    const { data: existingApprovedByEmail } = await supabase
      .from('studentaccounts')
      .select('email')
      .eq('email', email)
      .single();

    if (existingApprovedByEmail) {
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please sign in instead.' 
      });
    }

    // Check if student number already exists in pending accounts
    const { data: existingPendingByStudentNumber } = await supabase
      .from('pending_studentaccounts')
      .select('student_number')
      .eq('student_number', studentNumber)
      .single();

    if (existingPendingByStudentNumber) {
      return res.status(400).json({ 
        error: 'A student with this student number is already pending approval.' 
      });
    }

    // Check if student number already exists in approved accounts
    const { data: existingApprovedByStudentNumber } = await supabase
      .from('studentaccounts')
      .select('student_number')
      .eq('student_number', studentNumber)
      .single();

    if (existingApprovedByStudentNumber) {
      return res.status(400).json({ 
        error: 'A student with this student number already exists.' 
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationId = crypto.randomUUID();
    
    // Store verification data temporarily
    verificationCodes.set(verificationId, {
      code: verificationCode,
      email,
      userData: {
        first_name: firstName, 
        middle_name: middleName, 
        last_name: lastName, 
        student_number: studentNumber, 
        program,
        college, 
        email, 
        password: await bcrypt.hash(password, 10), // For legacy auth
        plain_password: password, // ✅ Store plain password for Supabase Auth
        class_position: 'student', 
        class_status: classStatus, 
        year_level: yearLevel
      },
      files: req.files,
      timestamp: Date.now(),
      attempts: 0,
      resendCount: 0,
      userType: 'student'
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`);
    
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // Clean up expired codes (5 minutes)
    setTimeout(() => {
      verificationCodes.delete(verificationId);
    }, 5 * 60 * 1000);

    res.json({ 
      message: 'Verification code sent to your email',
      verificationId
    });

  } catch (error) {
    console.error('Student signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Professor signup endpoint
app.post('/api/signup/professor', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'registrationCard', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      firstName, middleName, lastName, employeeNumber, college, email, password
    } = req.body;

    // Validation
    if (!email.endsWith('@fatima.edu.ph') && !email.endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'Email must end with @fatima.edu.ph or @gmail.com (for testing)' });
    }

    // Check if email already exists in pending accounts
    const { data: existingPendingByEmail } = await supabase
      .from('pending_professoraccounts')
      .select('email')
      .eq('email', email)
      .single();

    if (existingPendingByEmail) {
      return res.status(400).json({ 
        error: 'An account with this email is already pending approval. Please check your email for the verification code or contact support.' 
      });
    }

    // Check if email already exists in approved accounts
    const { data: existingApprovedByEmail } = await supabase
      .from('professoraccounts')
      .select('email')
      .eq('email', email)
      .single();

    if (existingApprovedByEmail) {
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please sign in instead.' 
      });
    }

    // Check if employee number already exists in pending accounts
    const { data: existingPendingByEmployeeNumber } = await supabase
      .from('pending_professoraccounts')
      .select('employee_number')
      .eq('employee_number', employeeNumber)
      .single();

    if (existingPendingByEmployeeNumber) {
      return res.status(400).json({ 
        error: 'A professor with this employee number is already pending approval.' 
      });
    }

    // Check if employee number already exists in approved accounts
    const { data: existingApprovedByEmployeeNumber } = await supabase
      .from('professoraccounts')
      .select('employee_number')
      .eq('employee_number', employeeNumber)
      .single();

    if (existingApprovedByEmployeeNumber) {
      return res.status(400).json({ 
        error: 'A professor with this employee number already exists.' 
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationId = crypto.randomUUID();
    
    // Store verification data temporarily
    verificationCodes.set(verificationId, {
      code: verificationCode,
      email,
      userData: {
        first_name: firstName, 
        middle_name: middleName, 
        last_name: lastName, 
        employee_number: employeeNumber, 
        college, 
        email,
        password: await bcrypt.hash(password, 10), // For legacy auth
        plain_password: password, // ✅ Store plain password for Supabase Auth
        class_position: 'professor'
      },
      files: req.files,
      timestamp: Date.now(),
      attempts: 0,
      resendCount: 0,
      userType: 'professor'
    });
    
    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`);
    
    if (!emailSent && process.env.NODE_ENV !== 'development') {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // Clean up expired codes (5 minutes)
    setTimeout(() => {
      verificationCodes.delete(verificationId);
    }, 5 * 60 * 1000);

    res.json({ 
      message: 'Verification code sent to your email',
      verificationId
    });

  } catch (error) {
    console.error('Professor signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =================== VERIFICATION ENDPOINTS ===================

// Verify code endpoint with fresh connection for database save
app.post('/api/verify-code', async (req, res) => {
  try {
    const { verificationId, code } = req.body;

    console.log('🔍 Verification attempt:', { verificationId, code });

    if (!verificationId || !code) {
      return res.status(400).json({ error: 'Verification ID and code are required' });
    }

    const verificationData = verificationCodes.get(verificationId);
    
    if (!verificationData) {
      console.log('❌ Verification data not found for ID:', verificationId);
      return res.status(400).json({ error: 'Invalid or expired verification session' });
    }

    console.log('✅ Verification data found:', {
      email: verificationData.email,
      userType: verificationData.userType,
      attempts: verificationData.attempts,
      timestamp: new Date(verificationData.timestamp).toISOString()
    });

    // Check if code has expired (5 minutes)
    if (Date.now() - verificationData.timestamp > 5 * 60 * 1000) {
      console.log('❌ Verification code expired');
      verificationCodes.delete(verificationId);
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Check attempts
    if (verificationData.attempts >= 3) {
      console.log('❌ Too many attempts');
      verificationCodes.delete(verificationId);
      return res.status(400).json({ error: 'Too many failed attempts' });
    }

    if (verificationData.code !== code) {
      console.log('❌ Invalid code:', { expected: verificationData.code, received: code });
      verificationData.attempts++;
      return res.status(400).json({ 
        error: 'Invalid verification code',
        attemptsLeft: 3 - verificationData.attempts
      });
    }

    console.log('✅ Code verification successful');

    // Code is correct - NOW upload files and save to database
    const { userData, files, userType } = verificationData;
    
    try {
      console.log('📤 Starting file upload and database save...');

      // Use fresh connection for database operations
      const freshSupabase = getFreshSupabaseClient();

      // Upload files to Supabase storage ONLY after verification
      let profileImageUrl = null;
      let registrationCardUrl = null;

      const bucketName = userType === 'professor' ? 'pending_professoraccounts' : 'pending_studentaccounts';
      console.log('📁 Using bucket:', bucketName);

      // Upload profile image if provided
      if (files && files.profileImage && files.profileImage[0]) {
        console.log('📸 Uploading profile image...');
        const profileImageFile = files.profileImage[0];
        const profileImagePath = `${userData.email}/profile_${Date.now()}.${profileImageFile.originalname.split('.').pop()}`;
        
        const { data: profileUpload, error: profileError } = await freshSupabase.storage
          .from(bucketName)
          .upload(profileImagePath, profileImageFile.buffer, {
            contentType: profileImageFile.mimetype,
            upsert: true
          });

        if (profileError) {
          console.error('❌ Profile image upload error:', profileError);
          throw new Error('Failed to upload profile image: ' + profileError.message);
        }
        
        profileImageUrl = profileImagePath;
        console.log('✅ Profile image uploaded:', profileImageUrl);
      }

      // Upload registration card if provided
      if (files && files.registrationCard && files.registrationCard[0]) {
        console.log('📄 Uploading registration card...');
        const regCardFile = files.registrationCard[0];
        const regCardPath = `${userData.email}/registration_${Date.now()}.pdf`;
        
        const { data: regCardUpload, error: regCardError } = await freshSupabase.storage
          .from(bucketName)
          .upload(regCardPath, regCardFile.buffer, {
            contentType: regCardFile.mimetype,
            upsert: true
          });

        if (regCardError) {
          console.error('❌ Registration card upload error:', regCardError);
          throw new Error('Failed to upload registration card: ' + regCardError.message);
        }
        
        registrationCardUrl = regCardPath;
        console.log('✅ Registration card uploaded:', registrationCardUrl);
      }

      // Save to appropriate pending table
      const tableName = userType === 'professor' ? 'pending_professoraccounts' : 'pending_studentaccounts';
      console.log('💾 Saving to table:', tableName);
      
      const insertData = {
        ...userData,
        plain_password: userData.plain_password, // ✅ Include plain password
        profile_image_url: profileImageUrl,
        registration_card_url: registrationCardUrl,
        created_at: new Date().toISOString()
      };

      console.log('📝 Insert data prepared:', {
        email: insertData.email,
        firstName: insertData.first_name,
        lastName: insertData.last_name,
        hasProfileImage: !!profileImageUrl,
        hasRegistrationCard: !!registrationCardUrl
      });

      // Use fresh connection for insert
      const { data, error } = await freshSupabase
        .from(tableName)
        .insert([insertData])
        .select();

      if (error) {
        console.error('❌ Database insert error:', error);
        throw new Error('Database save failed: ' + error.message);
      }

      console.log('✅ Data saved to database successfully');

      // Verify the insert actually worked
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: verifyData } = await freshSupabase
        .from(tableName)
        .select('*')
        .eq('email', userData.email)
        .single();
      
      console.log('🔍 Verification check - data exists:', !!verifyData);

      // Clean up verification data
      verificationCodes.delete(verificationId);
      console.log('🧹 Verification data cleaned up');

      res.json({ 
        message: 'Account created successfully! Your account is pending approval.',
        success: true
      });

    } catch (uploadError) {
      console.error('💥 Upload/Database error:', uploadError);
      
      // Clean up any uploaded files if there was an error
      if (profileImageUrl) {
        try {
          await supabase.storage.from(bucketName).remove([profileImageUrl]);
          console.log('🧹 Cleaned up profile image after error');
        } catch (cleanupError) {
          console.error('Failed to cleanup profile image:', cleanupError);
        }
      }
      
      if (registrationCardUrl) {
        try {
          await supabase.storage.from(bucketName).remove([registrationCardUrl]);
          console.log('🧹 Cleaned up registration card after error');
        } catch (cleanupError) {
          console.error('Failed to cleanup registration card:', cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: 'Failed to create account: ' + uploadError.message
      });
    }

  } catch (error) {
    console.error('💥 Verification error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Resend verification code endpoint
app.post('/api/resend-code', async (req, res) => {
  try {
    const { verificationId } = req.body;

    console.log('🔄 Resend code request for:', verificationId);

    if (!verificationId) {
      return res.status(400).json({ error: 'Verification ID is required' });
    }

    const verificationData = verificationCodes.get(verificationId);
    
    if (!verificationData) {
      console.log('❌ Verification session not found');
      return res.status(400).json({ error: 'Invalid verification session' });
    }

    // Check if 30 seconds have passed since last send
    if (Date.now() - verificationData.timestamp < 30 * 1000) {
      console.log('❌ Resend too soon');
      return res.status(400).json({ error: 'Please wait 30 seconds before requesting a new code' });
    }

    // Check resend limit
    if (verificationData.resendCount >= 3) {
      console.log('❌ Max resend attempts reached');
      verificationCodes.delete(verificationId);
      return res.status(400).json({ error: 'Maximum resend attempts reached' });
    }

    // Generate new code
    const newCode = generateVerificationCode();
    verificationData.code = newCode;
    verificationData.timestamp = Date.now();
    verificationData.resendCount++;
    verificationData.attempts = 0;

    console.log('📧 Sending new verification code:', newCode);

    // Send new code
    const firstName = verificationData.userData.first_name || verificationData.userData.firstName;
    const lastName = verificationData.userData.last_name || verificationData.userData.lastName;
    
    const emailSent = await sendVerificationEmail(
      verificationData.email, 
      newCode, 
      `${firstName} ${lastName}`
    );
    
    if (!emailSent && process.env.NODE_ENV !== 'development') {
      console.log('❌ Email sending failed');
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    console.log('✅ New verification code sent successfully');

    res.json({ 
      message: 'New verification code sent',
      resendCount: verificationData.resendCount
    });

  } catch (error) {
    console.error('💥 Resend code error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// =================== PROFESSOR ENDPOINTS ===================

// 1. Create Course (pending approval)
// Update the create course endpoint to include program
app.post('/api/professor/create-course', authenticateProfessor, async (req, res) => {
  try {
    const professor_id = req.user.id;
    const {
      courseName, courseCode, section, semester, schoolYear,
      description, maxStudents, program  // ✅ ADD program field
    } = req.body;

    // Validation for program
    if (!program || !['BSIT', 'BSEMC', 'BSCS'].includes(program)) {
      return res.status(400).json({ error: 'Valid program is required (BSIT, BSEMC, or BSCS)' });
    }

    // Check for duplicate course (including program in the check)
    const { data: exists } = await supabase
      .from('pending_courses')
      .select('id')
      .eq('course_code', courseCode)
      .eq('section', section)
      .eq('semester', semester)
      .eq('school_year', schoolYear)
      .eq('program', program)  // ✅ ADD program to duplicate check
      .single();

    if (exists) {
      return res.status(400).json({ error: "Course already pending approval for this program" });
    }

    // Check in approved courses too
    const { data: existsApproved } = await supabase
      .from('courses')
      .select('id')
      .eq('course_code', courseCode)
      .eq('section', section)
      .eq('semester', semester)
      .eq('school_year', schoolYear)
      .eq('program', program)  // ✅ ADD program to duplicate check
      .single();

    if (existsApproved) {
      return res.status(400).json({ error: "Course already exists for this program" });
    }

    // Insert pending course with program
    const { data, error } = await supabase
      .from('pending_courses')
      .insert([{
        course_name: courseName,
        course_code: courseCode,
        section,
        semester,
        school_year: schoolYear,
        description,
        max_students: maxStudents || 50,
        program,  // ✅ ADD program field
        professor_id
      }])
      .select();

    if (error) {
      console.error('Create course error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      message: "Course submitted for approval",
      courseId: data[0]?.id,
      courseName: courseName
    });
  } catch (err) {
    console.error('Professor create course error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1.5. Get Professor Profile (for professor)
app.get('/api/professor/profile', authenticateProfessor, async (req, res) => {
  try {
    // Use the professor data already fetched in authentication middleware
    if (req.professor) {
      // Construct proper profile image URL if it exists
      let profileImageUrl = null;
      if (req.professor.profile_image_url) {
        if (req.professor.profile_image_url.startsWith('http')) {
          profileImageUrl = req.professor.profile_image_url;
        } else {
          // For Supabase storage paths, construct the proper API endpoint
          const professorId = req.professor.id;
          if (req.professor.profile_image_url.includes('/')) {
            profileImageUrl = `/api/files/professoraccounts/${professorId}/${req.professor.profile_image_url.split('/').pop()}`;
          } else {
            profileImageUrl = `/api/files/professoraccounts/${professorId}/${req.professor.profile_image_url}`;
          }
        }
      }

      const profileData = {
        id: req.professor.id,
        email: req.professor.email,
        first_name: req.professor.first_name,
        firstName: req.professor.first_name,
        last_name: req.professor.last_name,
        lastName: req.professor.last_name,
        employee_number: req.professor.employee_number,
        employeeNumber: req.professor.employee_number,
        college: req.professor.college,
        profile_image_url: profileImageUrl,
        created_at: req.professor.created_at,
        updated_at: req.professor.updated_at
      };

      res.json(profileData);
    } else {
      // Fallback: query by ID if req.professor is not available
      const professor_id = req.user.id;
      const { data, error } = await supabase
        .from('professoraccounts')
        .select('*')
        .eq('id', professor_id)
        .single();
      
      if (error) {
        console.error('Get professor profile error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      // Construct profile image URL for fallback data
      let profileImageUrl = null;
      if (data?.profile_image_url) {
        if (data.profile_image_url.startsWith('http')) {
          profileImageUrl = data.profile_image_url;
        } else {
          const professorId = data.id;
          if (data.profile_image_url.includes('/')) {
            profileImageUrl = `/api/files/professoraccounts/${professorId}/${data.profile_image_url.split('/').pop()}`;
          } else {
            profileImageUrl = `/api/files/professoraccounts/${professorId}/${data.profile_image_url}`;
          }
        }
      }

      const profileData = {
        id: data.id,
        email: data.email,
        first_name: data.first_name,
        firstName: data.first_name,
        last_name: data.last_name,
        lastName: data.last_name,
        employee_number: data.employee_number,
        employeeNumber: data.employee_number,
        college: data.college,
        profile_image_url: profileImageUrl,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      res.json(profileData);
    }
  } catch (err) {
    console.error('Professor profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1.5b. Update Professor Profile (for professor) - Only firstName and lastName
app.put('/api/professor/profile', authenticateProfessor, async (req, res) => {
  try {
    const professor_id = req.user.id;
    const { firstName, lastName } = req.body;

    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Update only first_name and last_name
    const { data, error } = await supabase
      .from('professoraccounts')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq('id', professor_id)
      .select()
      .single();

    if (error) {
      console.error('Update professor profile error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Return updated profile data
    const profileData = {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      firstName: data.first_name,
      last_name: data.last_name,
      lastName: data.last_name,
      employee_number: data.employee_number,
      employeeNumber: data.employee_number,
      college: data.college,
      profile_image_url: data.profile_image_url,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json(profileData);
  } catch (err) {
    console.error('Update professor profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1.6. Get Student Profile (for student)
app.get('/api/student/profile', authenticateStudent, async (req, res) => {
  try {
    // Use the student data already fetched in authentication middleware
    if (req.student) {
      // Construct proper profile image URL if it exists
      let profileImageUrl = null;
      if (req.student.profile_image_url) {
        if (req.student.profile_image_url.startsWith('http')) {
          profileImageUrl = req.student.profile_image_url;
        } else {
          // For Supabase storage paths, construct the proper API endpoint
          const studentId = req.student.id;
          if (req.student.profile_image_url.includes('/')) {
            profileImageUrl = `/api/files/studentaccounts/${studentId}/${req.student.profile_image_url.split('/').pop()}`;
          } else {
            profileImageUrl = `/api/files/studentaccounts/${studentId}/${req.student.profile_image_url}`;
          }
        }
      }

      const profileData = {
        id: req.student.id,
        email: req.student.email,
        first_name: req.student.first_name,
        last_name: req.student.last_name,
        middle_name: req.student.middle_name,
        full_name: `${req.student.first_name} ${req.student.last_name}`,
        student_number: req.student.student_number,
        program: req.student.program,
        college: req.student.college,
        year_level: req.student.year_level,
        class_status: req.student.class_status,
        class_position: req.student.class_position,
        profile_image_url: profileImageUrl,
        registration_card_url: req.student.registration_card_url,
        created_at: req.student.created_at,
        updated_at: req.student.updated_at
      };

      res.json(profileData);
    } else {
      // Fallback: query by ID if req.student is not available
      const student_id = req.user.id;
      const { data, error } = await supabase
        .from('studentaccounts')
        .select('*')
        .eq('id', student_id)
        .single();
      
      if (error) {
        console.error('Get student profile error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      // Construct profile image URL for fallback data
      let profileImageUrl = null;
      if (data?.profile_image_url) {
        if (data.profile_image_url.startsWith('http')) {
          profileImageUrl = data.profile_image_url;
        } else {
          const studentId = data.id;
          if (data.profile_image_url.includes('/')) {
            profileImageUrl = `/api/files/studentaccounts/${studentId}/${data.profile_image_url.split('/').pop()}`;
          } else {
            profileImageUrl = `/api/files/studentaccounts/${studentId}/${data.profile_image_url}`;
          }
        }
      }

      const profileData = {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`,
        profile_image_url: profileImageUrl
      };

      res.json(profileData || {});
    }
  } catch (err) {
    console.error('Student profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1.6b. Update Student Profile (for student) - Only firstName and lastName
app.put('/api/student/profile', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    const { firstName, lastName } = req.body;

    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Update only first_name and last_name
    const { data, error } = await supabase
      .from('studentaccounts')
      .update({
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq('id', student_id)
      .select()
      .single();

    if (error) {
      console.error('Update student profile error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Construct profile image URL
    let profileImageUrl = null;
    if (data?.profile_image_url) {
      if (data.profile_image_url.startsWith('http')) {
        profileImageUrl = data.profile_image_url;
      } else {
        const studentId = data.id;
        if (data.profile_image_url.includes('/')) {
          profileImageUrl = `/api/files/studentaccounts/${studentId}/${data.profile_image_url.split('/').pop()}`;
        } else {
          profileImageUrl = `/api/files/studentaccounts/${studentId}/${data.profile_image_url}`;
        }
      }
    }

    // Return updated profile data
    const profileData = {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name,
      full_name: `${data.first_name} ${data.last_name}`,
      student_number: data.student_number,
      program: data.program,
      college: data.college,
      year_level: data.year_level,
      class_status: data.class_status,
      class_position: data.class_position,
      profile_image_url: profileImageUrl,
      registration_card_url: data.registration_card_url,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json(profileData);
  } catch (err) {
    console.error('Update student profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Recent Feedbacks - ALL feedbacks sorted by newest first
app.get('/api/student/recent-feedbacks', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    console.log('🔍 Fetching ALL recent feedbacks');
    
    // Get ALL task_feedback records
    const { data: allFeedbacks, error: feedbackError } = await supabase
      .from('task_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (feedbackError) {
      console.error('❌ Error fetching feedbacks:', feedbackError);
      return res.status(500).json({ error: feedbackError.message });
    }
    
    console.log('✅ Found feedbacks:', allFeedbacks?.length || 0);
    
    // Process each feedback to get submission details
    const formattedFeedbacks = [];
    
    for (const feedback of allFeedbacks || []) {
      try {
        let submissionDetails = null;
        
        // Get feedback giver details
        const { data: feedbackGiver, error: giverError } = await supabase
          .from('studentaccounts')
          .select('first_name, last_name')
          .eq('id', feedback.feedback_by)
          .single();
        
        if (giverError) {
          console.error('Error fetching feedback giver:', giverError);
        }
        
        // Check if it's a task_submission or revision_submission
        if (feedback.submission_id) {
          const { data: submission, error: subError } = await supabase
            .from('task_submissions')
            .select('submitted_by, task_id')
            .eq('id', feedback.submission_id)
            .single();
          
          if (subError) {
            console.error('Error fetching task submission:', subError);
            continue;
          }
          
          if (submission) {
            const { data: submitter } = await supabase
              .from('studentaccounts')
              .select('first_name, last_name')
              .eq('id', submission.submitted_by)
              .single();
            
            const { data: task } = await supabase
              .from('tasks')
              .select('title, project_id, phase_id')
              .eq('id', submission.task_id)
              .single();
            
            const { data: project } = await supabase
              .from('projects')
              .select('title')
              .eq('id', task?.project_id)
              .single();
            
            const { data: phase } = await supabase
              .from('project_phases')
              .select('phase_number, title')
              .eq('id', task?.phase_id)
              .single();
            
            submissionDetails = {
              submission_id: feedback.submission_id,
              task_id: submission.task_id,
              project_id: task?.project_id,
              phase_id: task?.phase_id,
              submitted_by_name: submitter ? `${submitter.first_name} ${submitter.last_name}` : 'Unknown',
              task_title: task?.title || 'Unknown Task',
              project_title: project?.title || 'Unknown Project',
              phase_title: phase ? `Phase ${phase.phase_number}: ${phase.title}` : 'Unknown Phase'
            };
          }
        } else if (feedback.revision_submission_id) {
          const { data: revision, error: revError } = await supabase
            .from('revision_submissions')
            .select('submitted_by, task_id')
            .eq('id', feedback.revision_submission_id)
            .single();
          
          if (revError) {
            console.error('Error fetching revision submission:', revError);
            continue;
          }
          
          if (revision) {
            const { data: submitter } = await supabase
              .from('studentaccounts')
              .select('first_name, last_name')
              .eq('id', revision.submitted_by)
              .single();
            
            const { data: task } = await supabase
              .from('tasks')
              .select('title, project_id, phase_id')
              .eq('id', revision.task_id)
              .single();
            
            const { data: project } = await supabase
              .from('projects')
              .select('title')
              .eq('id', task?.project_id)
              .single();
            
            const { data: phase } = await supabase
              .from('project_phases')
              .select('phase_number, title')
              .eq('id', task?.phase_id)
              .single();
            
            submissionDetails = {
              submission_id: feedback.revision_submission_id,
              task_id: revision.task_id,
              project_id: task?.project_id,
              phase_id: task?.phase_id,
              submitted_by_name: submitter ? `${submitter.first_name} ${submitter.last_name}` : 'Unknown',
              task_title: task?.title || 'Unknown Task',
              project_title: project?.title || 'Unknown Project',
              phase_title: phase ? `Phase ${phase.phase_number}: ${phase.title}` : 'Unknown Phase'
            };
          }
        }
        
        if (submissionDetails) {
          formattedFeedbacks.push({
            id: feedback.id,
            feedback_text: feedback.feedback_text,
            created_at: feedback.created_at,
            feedback_by_name: feedbackGiver ? `${feedbackGiver.first_name} ${feedbackGiver.last_name}` : 'Unknown',
            ...submissionDetails
          });
        }
        
        if (formattedFeedbacks.length >= 10) break;
      } catch (err) {
        console.error('Error processing feedback:', err);
        continue;
      }
    }
    
    console.log('✅ Formatted feedbacks:', formattedFeedbacks.length);
    res.json({ feedbacks: formattedFeedbacks });
  } catch (err) {
    console.error('❌ Recent feedbacks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Recent Submissions - ALL submissions sorted by newest first
app.get('/api/student/recent-submissions', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    console.log('🔍 Fetching ALL recent submissions');
    
    // Get ALL task submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select('*')
      .order('submission_date', { ascending: false })
      .limit(50);
    
    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }
    
    console.log('✅ Found submissions:', submissions?.length || 0);
    
    // Format the response with additional queries
    const formattedSubmissions = [];
    
    for (const submission of submissions || []) {
      try {
        // Get submitter details
        const { data: submitter } = await supabase
          .from('studentaccounts')
          .select('first_name, last_name')
          .eq('id', submission.submitted_by)
          .single();
        
        // Get task details
        const { data: task } = await supabase
          .from('tasks')
          .select('title, project_id, phase_id')
          .eq('id', submission.task_id)
          .single();
        
        const { data: project } = await supabase
          .from('projects')
          .select('title')
          .eq('id', task?.project_id)
          .single();
        
        const { data: phase } = await supabase
          .from('project_phases')
          .select('phase_number, title')
          .eq('id', task?.phase_id)
          .single();
        
        formattedSubmissions.push({
          id: submission.id,
          task_id: submission.task_id,
          project_id: task?.project_id,
          phase_id: task?.phase_id,
          attempt_number: submission.attempt_number,
          submission_date: submission.submission_date,
          status: submission.status,
          submitted_by_name: submitter ? `${submitter.first_name} ${submitter.last_name}` : 'Unknown',
          task_title: task?.title || 'Unknown Task',
          project_title: project?.title || 'Unknown Project',
          phase_title: phase ? `Phase ${phase.phase_number}: ${phase.title}` : 'Unknown Phase'
        });
        
        if (formattedSubmissions.length >= 10) break;
      } catch (err) {
        console.error('Error processing submission:', err);
        continue;
      }
    }
    
    console.log('✅ Formatted submissions:', formattedSubmissions.length);
    res.json({ submissions: formattedSubmissions });
  } catch (err) {
    console.error('❌ Recent submissions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Group Stats - Calculate grade averages, task completion, and submission activity
app.get('/api/student/group-stats/:groupId', authenticateStudent, async (req, res) => {
  try {
    const { groupId } = req.params;
    const student_id = req.user.id;

    console.log('📊 Fetching group stats for group:', groupId, 'student:', student_id);

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // Verify the current user belongs to this group
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .single();

    if (membershipError || !membership) {
      console.error('User not authorized to view this group stats:', membershipError);
      return res.status(403).json({ error: 'Not authorized to view this group' });
    }

    // Initialize stats object
    const stats = {
      phaseGradeAverage: null,
      projectGradeAverage: null,
      taskCompletionRate: null,
      totalTasks: 0,
      completedTasks: 0,
      submissionActivity: {
        totalSubmissions: 0,
        onTimeSubmissions: 0,
        lateSubmissions: 0,
        pendingSubmissions: 0
      }
    };

    // Get phase deliverable submissions for this group (only graded ones)
    const { data: phaseSubmissions, error: phaseError } = await supabase
      .from('phase_deliverable_submissions')
      .select('grade, submitted_at, phase_snapshot')
      .eq('group_id', groupId)
      .eq('status', 'graded')
      .not('grade', 'is', null);

    if (phaseError) {
      console.error('Error fetching phase submissions:', phaseError);
    }

    // Get project deliverable submissions for this group (only graded ones)
    const { data: projectSubmissions, error: projectError } = await supabase
      .from('project_deliverable_submissions')
      .select('grade, submitted_at, project_snapshot')
      .eq('group_id', groupId)
      .eq('status', 'graded')
      .not('grade', 'is', null);

    if (projectError) {
      console.error('Error fetching project submissions:', projectError);
    }

    // Calculate phase grade average
    if (phaseSubmissions && phaseSubmissions.length > 0) {
      const phaseGrades = phaseSubmissions.map(s => parseFloat(s.grade)).filter(g => !isNaN(g));
      if (phaseGrades.length > 0) {
        stats.phaseGradeAverage = phaseGrades.reduce((sum, grade) => sum + grade, 0) / phaseGrades.length;
      }
    }

    // Calculate project grade average
    if (projectSubmissions && projectSubmissions.length > 0) {
      const projectGrades = projectSubmissions.map(s => parseFloat(s.grade)).filter(g => !isNaN(g));
      if (projectGrades.length > 0) {
        stats.projectGradeAverage = projectGrades.reduce((sum, grade) => sum + grade, 0) / projectGrades.length;
      }
    }

    // Get all tasks assigned to group members
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
    } else if (groupMembers) {
      const memberIds = groupMembers.map(m => m.student_id);
      console.log('📊 Group member IDs:', memberIds);

      // Get all tasks assigned to these members from tasks table
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, assigned_to, due_date, created_at')
        .in('assigned_to', memberIds)
        .eq('is_active', true);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      } else if (tasks && tasks.length > 0) {
        stats.totalTasks = tasks.length;
        console.log('📊 Total tasks found:', stats.totalTasks);

        // Track submission activity by task submission status
        let completedCount = 0;
        let onTimeCount = 0;
        let lateCount = 0;
        let submittedCount = 0; // Any submitted (has a submission record)

        for (const task of tasks) {
          // Get latest task submission
          const { data: taskSubmissions } = await supabase
            .from('task_submissions')
            .select('id, status, updated_at, submitted_at')
            .eq('task_id', task.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          // Get latest revision submission
          const { data: revisionSubmissions } = await supabase
            .from('revision_submissions')
            .select('id, status, updated_at, submitted_at')
            .eq('task_id', task.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          // Determine which is the latest submission
          let latestStatus = task.status; // Default to task status
          let latestDate = null;
          let submittedAt = null;

          if (taskSubmissions && taskSubmissions.length > 0) {
            latestStatus = taskSubmissions[0].status;
            latestDate = new Date(taskSubmissions[0].updated_at);
            submittedAt = new Date(taskSubmissions[0].submitted_at);
          }

          if (revisionSubmissions && revisionSubmissions.length > 0) {
            const revisionDate = new Date(revisionSubmissions[0].updated_at);
            if (!latestDate || revisionDate > latestDate) {
              latestStatus = revisionSubmissions[0].status;
              latestDate = revisionDate;
              submittedAt = new Date(revisionSubmissions[0].submitted_at);
            }
          }

          // Count as completed if status is 'approved' or 'completed'
          if (latestStatus === 'approved' || latestStatus === 'completed') {
            completedCount++;
          }

          // If there's a submission, count it
          if (submittedAt) {
            submittedCount++;

            // Check if on-time or late
            const taskDueDate = task.due_date ? new Date(task.due_date) : null;
            if (taskDueDate) {
              if (submittedAt <= taskDueDate) {
                onTimeCount++;
                console.log(`📊 Task ${task.id}: On-time (submitted ${submittedAt.toISOString()} <= due ${taskDueDate.toISOString()})`);
              } else {
                lateCount++;
                console.log(`📊 Task ${task.id}: LATE (submitted ${submittedAt.toISOString()} > due ${taskDueDate.toISOString()})`);
              }
            }
          }

          console.log(`📊 Task ${task.id}: Latest status = ${latestStatus}, Submitted: ${!!submittedAt}`);
        }

        stats.completedTasks = completedCount;
        stats.submissionActivity.totalSubmissions = submittedCount;
        stats.submissionActivity.onTimeSubmissions = onTimeCount;
        stats.submissionActivity.lateSubmissions = lateCount;
        stats.submissionActivity.pendingSubmissions = stats.totalTasks - submittedCount;

        console.log('📊 Submission Activity Calculated:');
        console.log('  Total submitted:', stats.submissionActivity.totalSubmissions);
        console.log('  On-Time:', stats.submissionActivity.onTimeSubmissions);
        console.log('  Late:', stats.submissionActivity.lateSubmissions);
        console.log('  Pending (not submitted):', stats.submissionActivity.pendingSubmissions);
        console.log('📊 Completed tasks:', stats.completedTasks);

        if (stats.totalTasks > 0) {
          stats.taskCompletionRate = (stats.completedTasks / stats.totalTasks) * 100;
        }
      } else {
        console.log('📊 No tasks found for group members');
      }
    }

    console.log('✅ Group stats calculated:', stats);
    res.json(stats);
  } catch (err) {
    console.error('❌ Group stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get ALL group tasks for a project/phase
app.get('/api/student/group-tasks', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    const { projectId, phaseId, memberIds } = req.query;
    
    console.log('🔍 Fetching group tasks for project:', projectId, 'phase:', phaseId);
    
    if (!projectId) {
      return res.json({ tasks: [] });
    }
    
    // Parse memberIds from query string (comma-separated)
    const groupMemberIds = memberIds ? memberIds.split(',') : [student_id];
    console.log('✅ Group member IDs:', groupMemberIds);
    
    // Get ALL tasks assigned to ANY group member for this project/phase
    // Include both task_submissions and revision_submissions
    let query = supabase
      .from('tasks')
      .select(`*, task_submissions(*, revision_submissions(*))`)
      .eq('project_id', projectId)
      .in('assigned_to', groupMemberIds);
    
    if (phaseId) {
      query = query.eq('phase_id', phaseId);
    }
    
    const { data: tasks, error: tasksError } = await query;
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }
    
    console.log('✅ Found tasks:', tasks?.length || 0);
    // DEBUG: Log first task to see structure
    if (tasks?.length > 0) {
      console.log('🔍 [DEBUG] First task structure:', JSON.stringify(tasks[0], null, 2));
    }
    res.json({ tasks: tasks || [] });
  } catch (err) {
    console.error('❌ Group tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all phases for a specific project (for Submission Checking)
app.get('/api/projects/:projectId/phases', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log('🔍 [Submission Checking] Fetching phases for project:', projectId);

    // Get all phases for the project, ordered by phase number
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id, phase_number, title, start_date, end_date, description')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true });

    if (phasesError) {
      console.error('❌ Error fetching phases:', phasesError);
      console.error('❌ Error details:', {
        message: phasesError.message,
        hint: phasesError.hint,
        details: phasesError.details,
        code: phasesError.code
      });
      return res.status(500).json({ error: 'Failed to fetch phases: ' + phasesError.message });
    }

    console.log('✅ Found phases:', phases?.length || 0, phases);
    res.json({ phases: phases || [] });
  } catch (err) {
    console.error('❌ Phases fetch error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get phase evaluation form and criteria
app.get('/api/phases/:phaseId/evaluation-form', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;

    console.log('🔍 Fetching evaluation form for phase:', phaseId);

    // First, get the phase evaluation form
    const { data: form, error: formError } = await supabase
      .from('phase_evaluation_forms')
      .select('id, phase_id, instructions, total_points')
      .eq('phase_id', phaseId)
      .single();

    if (formError && formError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching phase evaluation form:', formError);
      return res.status(500).json({ error: 'Failed to fetch form: ' + formError.message });
    }

    if (!form) {
      console.log('⚠️ No evaluation form found for phase:', phaseId);
      return res.json({ form: null, criteria: [] });
    }

    console.log('✅ Found evaluation form:', form.id);

    // Now get the criteria for this form
    const { data: criteria, error: criteriaError } = await supabase
      .from('phase_evaluation_criteria')
      .select('id, phase_evaluation_form_id, name, description, max_points, order_index')
      .eq('phase_evaluation_form_id', form.id)
      .order('order_index', { ascending: true });

    if (criteriaError) {
      console.error('❌ Error fetching evaluation criteria:', criteriaError);
      return res.status(500).json({ error: 'Failed to fetch criteria: ' + criteriaError.message });
    }

    console.log('✅ Found criteria:', criteria?.length || 0);
    res.json({ form, criteria: criteria || [] });
  } catch (err) {
    console.error('❌ Evaluation form fetch error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get submissions for a specific project and phase (for Submission Checking)
app.get('/api/submission-checking/:projectId/phase/:phaseId', authenticateStudent, async (req, res) => {
  try {
    const { projectId, phaseId } = req.params;
    const student_id = req.user.id;

    console.log('🔍 [Submission Checking] Fetching submissions for project:', projectId, 'phase:', phaseId);
    console.log('🔍 [Submission Checking] Student ID:', student_id);

    // STEP 0: Get the project's course_id first
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.log('⚠️ Project not found');
      return res.json({ submissions: [] });
    }

    const courseId = project.course_id;
    console.log('🔍 [Submission Checking] Course ID:', courseId);

    // STEP 1: Get the logged-in student's group membership in this course
    // Use service role client to bypass RLS policies
    const freshSupabase = getFreshSupabaseClient();
    
    console.log(`🔄 Fetching group memberships for student: ${student_id}`);
    
    const { data: allMemberships, error: membershipsError } = await freshSupabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', student_id);

    if (membershipsError) {
      console.log('❌ Error fetching student group memberships:', membershipsError);
      return res.json({ submissions: [] });
    }

    if (!allMemberships) {
      console.log('❌ No memberships data returned');
      return res.json({ submissions: [] });
    }

    console.log('🔍 Student has', allMemberships?.length || 0, 'group memberships');

    if (allMemberships.length === 0) {
      console.log('⚠️ Student is not in any group');
      return res.json({ submissions: [] });
    }

    // Now check which of these groups belongs to the target course
    const groupIds = allMemberships.map(m => m.group_id);
    console.log('🔍 Checking if groups belong to course:', courseId, 'Group IDs:', groupIds);
    
    // Use service role client to bypass RLS
    const { data: groupsInCourse, error: groupsError } = await freshSupabase
      .from('course_groups')
      .select('id')
      .eq('course_id', courseId)
      .in('id', groupIds);

    if (groupsError) {
      console.log('❌ Error fetching course groups:', groupsError);
      return res.json({ submissions: [] });
    }

    if (!groupsInCourse || groupsInCourse.length === 0) {
      console.log('⚠️ Student is not in any group for this course');
      console.log('🔍 Course ID:', courseId);
      console.log('🔍 Student group IDs:', groupIds);
      console.log('🔍 Groups found in course:', groupsInCourse?.length || 0);
      return res.json({ submissions: [] });
    }

    const groupId = groupsInCourse[0].id;
    console.log('✅ [Submission Checking] Student group ID:', groupId);

    // STEP 2: Get all members in the same group
    const { data: groupMembers, error: groupMembersError } = await freshSupabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId);

    if (groupMembersError || !groupMembers) {
      console.log('⚠️ Could not fetch group members');
      return res.json({ submissions: [] });
    }

    const groupMemberIds = groupMembers.map(m => m.student_id);
    console.log('✅ Group members:', groupMemberIds.length);

    // STEP 3: Get ALL tasks for this project and phase assigned to any group member
    const { data: tasks, error: tasksError } = await freshSupabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        created_at,
        assigned_to,
        file_types_allowed
      `)
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .in('assigned_to', groupMemberIds);

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('✅ Found tasks:', tasks?.length || 0);
    if (tasks && tasks.length > 0) {
      console.log('📋 Task IDs:', tasks.map(t => ({ id: t.id, title: t.title, assigned_to: t.assigned_to })));
    }

    if (!tasks || tasks.length === 0) {
      return res.json({ submissions: [] });
    }

    const taskIds = tasks.map(t => t.id);

    // STEP 4: Get all submissions for these tasks
    const { data: submissions, error: submissionsError } = await freshSupabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        submitted_by,
        submission_date,
        status,
        file_urls,
        submission_text,
        created_at
      `)
      .in('task_id', taskIds)
      .order('submission_date', { ascending: false });

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    console.log('✅ Found submissions:', submissions?.length || 0);

    // STEP 4B: Get revision submissions for these tasks
    const { data: revisionSubmissions, error: revisionError } = await freshSupabase
      .from('revision_submissions')
      .select(`
        id,
        original_submission_id,
        task_id,
        submitted_by,
        submitted_at,
        status,
        file_paths,
        submission_text,
        revision_attempt_number,
        created_at
      `)
      .in('task_id', taskIds)
      .order('submitted_at', { ascending: false });

    if (revisionError) {
      console.error('❌ Error fetching revision submissions:', revisionError);
      // Don't fail, just continue without revisions
    }

    console.log('✅ Found revision submissions:', revisionSubmissions?.length || 0);

    // STEP 5: Format the response
    const formattedSubmissions = [];
    
    for (const submission of submissions || []) {
      try {
        const task = tasks.find(t => t.id === submission.task_id);
        
        // Get member details
        const { data: member } = await freshSupabase
          .from('studentaccounts')
          .select('first_name, last_name, profile_image_url')
          .eq('id', submission.submitted_by)
          .single();

        // Get feedback for this submission
        const { data: feedbackData, error: feedbackError } = await freshSupabase
          .from('task_feedback')
          .select(`
            id,
            feedback_text,
            feedback_by,
            created_at
          `)
          .eq('submission_id', submission.id)
          .order('created_at', { ascending: false });

        if (feedbackError) {
          console.error('❌ Error fetching feedback for submission', submission.id, ':', feedbackError);
        } else {
          console.log(`✅ Found ${feedbackData?.length || 0} feedbacks for submission ${submission.id}`);
        }

        // Format feedback with user details
        let formattedFeedback = [];
        if (feedbackData && feedbackData.length > 0) {
          for (const fb of feedbackData) {
            // Get feedback giver details - try professor first
            const { data: feedbackGiver, error: profError } = await freshSupabase
              .from('professoraccounts')
              .select('first_name, last_name, profile_image_url')
              .eq('id', fb.feedback_by)
              .single();

            // If not a professor, try studentaccounts
            let giverDetails = feedbackGiver;
            if (!giverDetails || profError) {
              const { data: studentFeedbackGiver } = await freshSupabase
                .from('studentaccounts')
                .select('first_name, last_name, profile_image_url')
                .eq('id', fb.feedback_by)
                .single();
              giverDetails = studentFeedbackGiver;
            }

            formattedFeedback.push({
              id: fb.id,
              feedback_text: fb.feedback_text,
              feedback_by: fb.feedback_by,
              feedback_by_name: giverDetails ? `${giverDetails.first_name} ${giverDetails.last_name}` : 'Unknown',
              feedback_by_image: giverDetails?.profile_image_url 
                ? getProfileImageUrl(fb.feedback_by, giverDetails.profile_image_url)
                : null,
              created_at: fb.created_at
            });
          }
        }

        // Parse file URLs
        let fileUrls = [];
        if (submission.file_urls) {
          try {
            const parsed = typeof submission.file_urls === 'string' 
              ? JSON.parse(submission.file_urls) 
              : submission.file_urls;
            fileUrls = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            fileUrls = [];
          }
        }

        // Debug: Log submission date
        console.log(`📅 Submission ${submission.id}: submission_date =`, submission.submission_date, 'created_at =', submission.created_at);
        
        formattedSubmissions.push({
          id: submission.id,
          taskId: submission.task_id,
          taskTitle: task?.title || 'Unknown Task',
          taskDescription: task?.description || '',
          file_types_allowed: task?.file_types_allowed || [],
          memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
          memberProfileImage: member?.profile_image_url 
            ? getProfileImageUrl(submission.submitted_by, member.profile_image_url)
            : null,
          submittedAt: submission.submission_date || submission.created_at,
          status: submission.status || 'pending',
          fileUrls: fileUrls,
          submissionText: submission.submission_text,
          dueDate: task?.due_date || null,
          assignedDate: task?.created_at || null,
          feedback: formattedFeedback
        });
      } catch (err) {
        console.error('Error processing submission:', err);
        continue;
      }
    }

    console.log('✅ Formatted submissions:', formattedSubmissions.length);
    
    // Process revision submissions
    if (revisionSubmissions && revisionSubmissions.length > 0) {
      for (const revision of revisionSubmissions) {
        try {
          const task = tasks.find(t => t.id === revision.task_id);
          
          // Get member details
          const { data: member } = await freshSupabase
            .from('studentaccounts')
            .select('first_name, last_name, profile_image_url')
            .eq('id', revision.submitted_by)
            .single();

          // Get feedback for this revision submission
          const { data: feedbackData } = await freshSupabase
            .from('submission_feedback')
            .select('*')
            .eq('submission_id', revision.id)
            .order('created_at', { ascending: false });

          let formattedFeedback = [];
          if (feedbackData && feedbackData.length > 0) {
            for (const fb of feedbackData) {
              const { data: feedbackGiver } = await freshSupabase
                .from('professoraccounts')
                .select('first_name, last_name, profile_image_url')
                .eq('id', fb.feedback_by)
                .single();

              let giverDetails = feedbackGiver;
              if (!giverDetails) {
                const { data: studentFeedbackGiver } = await freshSupabase
                  .from('studentaccounts')
                  .select('first_name, last_name, profile_image_url')
                  .eq('id', fb.feedback_by)
                  .single();
                giverDetails = studentFeedbackGiver;
              }

              formattedFeedback.push({
                id: fb.id,
                feedback_text: fb.feedback_text,
                feedback_by: fb.feedback_by,
                feedback_by_name: giverDetails ? `${giverDetails.first_name} ${giverDetails.last_name}` : 'Unknown',
                feedback_by_image: giverDetails?.profile_image_url 
                  ? getProfileImageUrl(fb.feedback_by, giverDetails.profile_image_url)
                  : null,
                created_at: fb.created_at
              });
            }
          }

          // Parse file paths
          let fileUrls = [];
          if (revision.file_paths) {
            try {
              const parsed = typeof revision.file_paths === 'string' 
                ? JSON.parse(revision.file_paths) 
                : revision.file_paths;
              fileUrls = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              fileUrls = [];
            }
          }

          // Debug: Log revision submission date
          console.log(`📅 Revision ${revision.id}: submitted_at =`, revision.submitted_at, 'created_at =', revision.created_at);

          formattedSubmissions.push({
            id: revision.id,
            taskId: revision.task_id,
            taskTitle: task?.title || 'Unknown Task',
            taskDescription: task?.description || '',
            file_types_allowed: task?.file_types_allowed || [],
            memberName: member ? `${member.first_name} ${member.last_name}` : 'Unknown',
            memberProfileImage: member?.profile_image_url 
              ? getProfileImageUrl(revision.submitted_by, member.profile_image_url)
              : null,
            submittedAt: revision.submitted_at || revision.created_at,
            status: revision.status || 'pending',
            fileUrls: fileUrls,
            submissionText: revision.submission_text,
            dueDate: task?.due_date || null,
            assignedDate: task?.created_at || null,
            feedback: formattedFeedback,
            revisionAttemptNumber: revision.revision_attempt_number,
            isRevisionSubmission: true,
            originalSubmissionId: revision.original_submission_id
          });
        } catch (err) {
          console.error('Error processing revision submission:', err);
          continue;
        }
      }
    }

    console.log('✅ Formatted submissions (including revisions):', formattedSubmissions.length);
    
    // Group submissions by task_id
    const groupedByTask = {};
    for (const submission of formattedSubmissions) {
      if (!groupedByTask[submission.taskId]) {
        groupedByTask[submission.taskId] = {
          taskId: submission.taskId,
          taskTitle: submission.taskTitle,
          taskDescription: submission.taskDescription,
          file_types_allowed: submission.file_types_allowed,
          dueDate: submission.dueDate,
          assignedDate: submission.assignedDate,
          attempts: [],
          latestStatus: 'pending',
          approvedAttemptId: null
        };
      }
      
      groupedByTask[submission.taskId].attempts.push({
        id: submission.id,
        memberName: submission.memberName,
        memberProfileImage: submission.memberProfileImage,
        submittedAt: submission.submittedAt,
        status: submission.status,
        fileUrls: submission.fileUrls,
        submissionText: submission.submissionText,
        feedback: submission.feedback,
        revisionAttemptNumber: submission.revisionAttemptNumber || null,
        isRevisionSubmission: submission.isRevisionSubmission || false,
        originalSubmissionId: submission.originalSubmissionId || null
      });
      
      // Track if any attempt is approved
      if (submission.status === 'approved') {
        groupedByTask[submission.taskId].approvedAttemptId = submission.id;
        groupedByTask[submission.taskId].latestStatus = 'approved';
      } else if (groupedByTask[submission.taskId].latestStatus !== 'approved' && submission.status === 'revision_requested') {
        groupedByTask[submission.taskId].latestStatus = 'revision_requested';
      }
    }
    
    const groupedSubmissions = Object.values(groupedByTask);
    console.log('✅ Grouped into tasks:', groupedSubmissions.length);
    res.json({ submissions: groupedSubmissions });
  } catch (error) {
    console.error('❌ [Submission Checking] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve a specific submission attempt
app.post('/api/submission-checking/approve', authenticateStudent, async (req, res) => {
  try {
    const { submissionId, taskId, projectId, isRevisionSubmission } = req.body;
    const leader_id = req.user.id;

    if (!submissionId || !taskId || !projectId) {
      return res.status(400).json({ error: 'Missing required fields: submissionId, taskId, projectId' });
    }

    console.log('✅ Leader authenticated:', leader_id);
    console.log('📝 Approving submission:', submissionId);
    console.log('📝 Is revision submission?:', isRevisionSubmission);

    // Use service role client for approval operations
    const freshSupabase = getFreshSupabaseClient();
    
    // Determine which table to query based on submission type
    const tableName = isRevisionSubmission ? 'revision_submissions' : 'task_submissions';
    const selectFields = isRevisionSubmission 
      ? 'id, task_id, submitted_by' 
      : 'id, task_id, submitted_by';
    
    // Get the submission to verify it exists and get submitter info
    const { data: submissionData, error: submissionError } = await freshSupabase
      .from(tableName)
      .select(selectFields)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submissionData) {
      console.log(`❌ Submission not found in ${tableName}:`, submissionError);
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log('✅ Submission found. Submitted by:', submissionData.submitted_by);

    // Get the submitter's group - find which group they belong to
    const { data: submitterMembership, error: submitterError } = await freshSupabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', submissionData.submitted_by)
      .limit(1)
      .single();

    if (submitterError || !submitterMembership) {
      console.log('❌ Could not find submitter group membership:', submitterError);
      return res.status(404).json({ error: 'Submitter not found in any group' });
    }

    const submissionGroupId = submitterMembership.group_id;
    console.log('✅ Submission group ID:', submissionGroupId);

    // Verify leader is in the same group as the submitted member
    const { data: leaderMembership, error: membershipError } = await freshSupabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', leader_id)
      .eq('group_id', submissionGroupId)
      .single();

    if (membershipError || !leaderMembership) {
      console.log('❌ Leader not in the same group as submission');
      return res.status(403).json({ error: 'Not authorized - not in same group' });
    }

    // Check if leader has permission (must be leader/coordinator)
    const leaderRole = leaderMembership.role?.toLowerCase();
    if (leaderRole !== 'leader' && leaderRole !== 'coordinator') {
      console.log('❌ Not authorized - user role is:', leaderRole);
      return res.status(403).json({ error: 'Only group leaders can approve submissions' });
    }

    console.log('✅ Authorization verified - user is group leader in same group');

    // Update submission status to approved (use correct table)
    const { error: updateError } = await freshSupabase
      .from(tableName)
      .update({ status: 'approved' })
      .eq('id', submissionId);

    if (updateError) {
      console.error('❌ Approve submission error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log('✅ Submission approved:', submissionId);
    console.log('📝 Updating task status for task ID:', taskId);
    console.log('📝 Is this a revision submission?:', isRevisionSubmission);

    // Update task status to completed when submission is approved (works for both original and revision submissions)
    const { data: updatedTask, error: taskUpdateError } = await freshSupabase
      .from('tasks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select();

    if (taskUpdateError) {
      console.error('❌ Error: Could not update task status to completed:', taskUpdateError);
      console.error('❌ Task ID attempted:', taskId);
      // Don't fail the request, just warn - submission was still approved
    } else {
      console.log('✅ Task status updated to completed:', taskId);
      console.log('✅ Updated task data:', updatedTask);
    }

    res.json({ 
      success: true, 
      message: 'Submission approved successfully',
      taskUpdated: !taskUpdateError,
      updatedTaskId: taskId
    });
  } catch (error) {
    console.error('❌ [Approve Submission] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Request revision on a specific submission attempt
app.post('/api/submission-checking/request-revision', authenticateStudent, async (req, res) => {
  try {
    const { submissionId, taskId, projectId, revisionMessage, isRevisionSubmission } = req.body;
    const leader_id = req.user.id;

    if (!submissionId || !taskId || !projectId) {
      return res.status(400).json({ error: 'Missing required fields: submissionId, taskId, projectId' });
    }

    console.log('✅ Leader authenticated:', leader_id);
    console.log('📝 Requesting revision on submission:', submissionId);
    console.log('📝 Is revision submission?:', isRevisionSubmission);

    // Use service role client for revision operations
    const freshSupabase = getFreshSupabaseClient();
    
    // Determine which table to query based on submission type
    const tableName = isRevisionSubmission ? 'revision_submissions' : 'task_submissions';
    const selectFields = isRevisionSubmission 
      ? 'id, task_id, submitted_by' 
      : 'id, task_id, submitted_by';
    
    // Get the submission to verify it exists and get submitter info
    const { data: submissionData, error: submissionError } = await freshSupabase
      .from(tableName)
      .select(selectFields)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submissionData) {
      console.log(`❌ Submission not found in ${tableName}:`, submissionError);
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log('✅ Submission found. Submitted by:', submissionData.submitted_by);

    // Get the submitter's group - find which group they belong to
    const { data: submitterMembership, error: submitterError } = await freshSupabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', submissionData.submitted_by)
      .limit(1)
      .single();

    if (submitterError || !submitterMembership) {
      console.log('❌ Could not find submitter group membership:', submitterError);
      return res.status(404).json({ error: 'Submitter not found in any group' });
    }

    const submissionGroupId = submitterMembership.group_id;
    console.log('✅ Submission group ID:', submissionGroupId);

    // Verify leader is in the same group as the submitted member
    const { data: leaderMembership, error: membershipError } = await freshSupabase
      .from('course_group_members')
      .select('role')
      .eq('student_id', leader_id)
      .eq('group_id', submissionGroupId)
      .single();

    if (membershipError || !leaderMembership) {
      console.log('❌ Leader not in the same group as submission');
      return res.status(403).json({ error: 'Not authorized - not in same group' });
    }

    // Check if leader has permission (must be leader/coordinator)
    const leaderRole = leaderMembership.role?.toLowerCase();
    if (leaderRole !== 'leader' && leaderRole !== 'coordinator') {
      console.log('❌ Not authorized - user role is:', leaderRole);
      return res.status(403).json({ error: 'Only group leaders can request revisions' });
    }

    console.log('✅ Authorization verified - user is group leader in same group');

    // Update submission status to revision_requested and optionally add message
    const updateData = { 
      status: 'revision_requested',
      reviewed_by: leader_id,
      reviewed_at: new Date().toISOString()
    };
    
    if (revisionMessage) {
      updateData.review_comments = revisionMessage;
    }

    const { error: updateError } = await freshSupabase
      .from(tableName)
      .update(updateData)
      .eq('id', submissionId);

    if (updateError) {
      console.error('❌ Request revision error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log('✅ Revision requested:', submissionId);

    // Update task status to to_revise when revision is requested
    const { error: taskUpdateError } = await freshSupabase
      .from('tasks')
      .update({ status: 'to_revise' })
      .eq('id', taskId);

    if (taskUpdateError) {
      console.warn('⚠️ Warning: Could not update task status to to_revise:', taskUpdateError);
      // Don't fail the request, just warn - revision request was still processed
    } else {
      console.log('✅ Task status updated to to_revise:', taskId);
    }

    res.json({ success: true, message: 'Revision requested successfully' });
  } catch (error) {
    console.error('❌ [Request Revision] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Approved Courses (for professor)
app.get('/api/professor/courses', authenticateProfessor, async (req, res) => {
  try {
    const professor_id = req.user.id;
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('professor_id', professor_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get professor courses error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data || []);
  } catch (err) {
    console.error('Professor courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Pending Courses (for professor)
app.get('/api/professor/pending-courses', authenticateProfessor, async (req, res) => {
  try {
    const professor_id = req.user.id;
    const { data, error } = await supabase
      .from('pending_courses')
      .select('*')
      .eq('professor_id', professor_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get pending courses error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data || []);
  } catch (err) {
    console.error('Professor pending courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Replace your professor join requests endpoint with this enhanced version:
app.get('/api/professor/join-requests', authenticateProfessor, async (req, res) => {
  try {
    const professor_id = req.user.id;
    
    console.log('👨‍🏫 === PROFESSOR JOIN REQUESTS START ===');
    console.log('👨‍🏫 Professor ID:', professor_id);
    
    // Get courses of this professor
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, course_name, course_code, section')
      .eq('professor_id', professor_id);
    
    if (coursesError) {
      console.error('❌ Get professor courses error:', coursesError);
      return res.status(500).json({ error: coursesError.message });
    }
    
    const courseIds = (courses || []).map(c => c.id);
    console.log('📚 Professor courses:', courseIds.length);
    
    if (courseIds.length === 0) {
      console.log('📚 No courses found for professor');
      return res.json([]);
    }
    
    // Get join requests with manual student lookup
    const { data: joinRequests, error: requestsError } = await supabase
      .from('course_join_requests')
      .select('*')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false });
    
    if (requestsError) {
      console.error('❌ Get join requests error:', requestsError);
      return res.status(500).json({ error: requestsError.message });
    }

    console.log('📝 Raw join requests found:', joinRequests?.length || 0);
    
    // Manually format each request with proper lookups
    const formattedData = [];
    
    for (const request of joinRequests || []) {
      console.log(`🔍 Processing request ID: ${request.id}`);
      
      // Find course info
      const course = courses.find(c => c.id === request.course_id);
      
      if (!course) {
        console.warn(`⚠️ Course not found for request ${request.id}`);
        continue;
      }
      
      // Get student info with fresh connection
      const freshSupabase = getFreshSupabaseClient();
      const { data: student, error: studentError } = await freshSupabase
        .from('studentaccounts')
        .select('first_name, last_name, student_number, program, year_level')
        .eq('id', request.student_id)
        .single();
      
      if (studentError || !student) {
        console.warn(`⚠️ Student not found for request ${request.id}, student_id: ${request.student_id}`);
        console.log('Student error:', studentError?.message);
        
        // Try to get basic info from request or create placeholder
        formattedData.push({
          ...request,
          course_name: course.course_name,
          course_code: course.course_code,
          section: course.section,
          student_name: 'Unknown Student',
          student_number: 'N/A',
          program: 'N/A',
          year_level: 'N/A'
        });
        continue;
      }
      
      console.log(`✅ Student found: ${student.first_name} ${student.last_name}`);
      
      formattedData.push({
        ...request,
        course_name: course.course_name,
        course_code: course.course_code,
        section: course.section,
        student_name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number,
        program: student.program,
        year_level: student.year_level
      });
    }
    
    console.log('📝 Formatted requests:', formattedData.length);
    console.log('👨‍🏫 === PROFESSOR JOIN REQUESTS COMPLETE ===');
    
    res.json(formattedData);
  } catch (err) {
    console.error('💥 Professor join requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Approve/Reject Join Request (professor)
app.post('/api/professor/join-request/:id/:action', authenticateProfessor, async (req, res) => {
  try {
    const { id, action } = req.params;
    const { reason } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Find the join request
    const { data: joinReq, error: joinError } = await supabase
      .from('course_join_requests')
      .select('*, courses!inner(professor_id)')
      .eq('id', id)
      .single();
    
    if (joinError || !joinReq) {
      console.error('Join request not found:', joinError);
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Only the course's professor can approve/reject
    if (joinReq.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (action === 'approve') {
      // Add to course_students if not already there
      const { error: enrollError } = await supabase
        .from('course_students')
        .upsert([{
          course_id: joinReq.course_id,
          student_id: joinReq.student_id,
          approved_by: req.user.id
        }], { onConflict: 'course_id,student_id' });

      if (enrollError) {
        console.error('Enrollment error:', enrollError);
        return res.status(500).json({ error: 'Failed to enroll student' });
      }

      // Update join request status
      const { error: updateError } = await supabase
        .from('course_join_requests')
        .update({
          status: 'approved',
          responded_by: req.user.id,
          responded_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', id);

      if (updateError) {
        console.error('Update join request error:', updateError);
        return res.status(500).json({ error: 'Failed to update request status' });
      }

      return res.json({ message: "Student approved and enrolled" });
    }

    // Reject
    const { error: rejectError } = await supabase
      .from('course_join_requests')
      .update({
        status: 'rejected',
        responded_by: req.user.id,
        responded_at: new Date().toISOString(),
        rejection_reason: reason || null
      })
      .eq('id', id);

    if (rejectError) {
      console.error('Reject join request error:', rejectError);
      return res.status(500).json({ error: 'Failed to reject request' });
    }

    res.json({ message: "Join request rejected" });
  } catch (err) {
    console.error('Professor join request action error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Replace your existing course students endpoint with this version
app.get('/api/professor/course/:id/students', authenticateProfessor, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 === GET COURSE STUDENTS START ===');
    console.log('🔍 Course ID:', id);
    console.log('🔍 Professor ID:', req.user.id);
    console.log('🔍 Timestamp:', new Date().toISOString());
    
    // SOLUTION 1: Always create completely fresh client with timestamp
    const freshSupabase = createClient(
      process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs',
      {
        auth: {
          persistSession: false,  // Don't persist sessions
          autoRefreshToken: false // Don't auto-refresh
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'x-request-id': `course-students-${Date.now()}` // Unique request ID
          }
        }
      }
    );

    // SOLUTION 2: Add small delay to ensure fresh connection
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify this professor owns the course
    const { data: course, error: courseError } = await freshSupabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      console.log('❌ Course verification failed:', courseError?.message);
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    console.log('✅ Course verified:', course.course_name);

    // SOLUTION 3: Multiple attempts with different strategies
    let studentResults = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (studentResults.length === 0 && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts} to fetch students`);

      if (attempts === 1) {
        // Strategy 1: Direct join query
        const { data: joinResult, error: joinError } = await freshSupabase
          .from('course_students')
          .select(`
            *,
            studentaccounts!inner(first_name, last_name, student_number, program, year_level, email)
          `)
          .eq('course_id', id)
          .eq('is_active', true);

        if (joinResult && joinResult.length > 0 && !joinError) {
          console.log(`✅ Strategy 1 success: Found ${joinResult.length} students`);
          studentResults = joinResult.map(enrollment => ({
            id: enrollment.id,
            student_id: enrollment.student_id,
            enrolled_at: enrollment.enrolled_at,
            student_name: `${enrollment.studentaccounts.first_name} ${enrollment.studentaccounts.last_name}`,
            student_number: enrollment.studentaccounts.student_number,
            program: enrollment.studentaccounts.program,
            year_level: enrollment.studentaccounts.year_level,
            email: enrollment.studentaccounts.email,
            _data_source: 'join_query'
          }));
          break;
        } else {
          console.log(`❌ Strategy 1 failed:`, joinError?.message || 'No results');
        }
      }

      if (attempts === 2) {
        // Strategy 2: Manual lookup with fresh connection per student
        const { data: rawEnrollments, error: enrollError } = await freshSupabase
          .from('course_students')
          .select('*')
          .eq('course_id', id)
          .eq('is_active', true);

        console.log(`📝 Raw enrollments found: ${rawEnrollments?.length || 0}`);

        if (rawEnrollments && rawEnrollments.length > 0) {
          for (const enrollment of rawEnrollments) {
            console.log(`👤 Looking up student: ${enrollment.student_id}`);
            
            // Create another fresh connection for each student lookup
            const studentSupabase = createClient(
              process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
              process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs',
              {
                auth: { persistSession: false },
                global: {
                  headers: {
                    'Cache-Control': 'no-cache',
                    'x-student-lookup': `${enrollment.student_id}-${Date.now()}`
                  }
                }
              }
            );

            const { data: student, error: studentError } = await studentSupabase
              .from('studentaccounts')
              .select('first_name, last_name, student_number, program, year_level, email')
              .eq('id', enrollment.student_id)
              .single();

            if (student && !studentError) {
              console.log(`✅ Found student: ${student.first_name} ${student.last_name}`);
              studentResults.push({
                id: enrollment.id,
                student_id: enrollment.student_id,
                enrolled_at: enrollment.enrolled_at,
                student_name: `${student.first_name} ${student.last_name}`,
                student_number: student.student_number,
                program: student.program,
                year_level: student.year_level,
                email: student.email,
                _data_source: 'manual_lookup_fresh_connection'
              });
            } else {
              console.log(`⚠️ Student not found: ${enrollment.student_id}`, studentError?.message);
              // Include with placeholder data
              studentResults.push({
                id: enrollment.id,
                student_id: enrollment.student_id,
                enrolled_at: enrollment.enrolled_at,
                student_name: `Unknown Student (${enrollment.student_id.substring(0, 8)}...)`,
                student_number: 'N/A',
                program: 'N/A',
                year_level: 'N/A',
                email: 'unknown@email.com',
                _data_source: 'manual_lookup_failed',
                _missing_student_data: true
              });
            }

            // Small delay between lookups
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        if (studentResults.length > 0) {
          console.log(`✅ Strategy 2 success: Found ${studentResults.length} students`);
          break;
        }
      }

      if (attempts === 3) {
        // Strategy 3: Force database refresh with raw SQL
        console.log(`🔄 Strategy 3: Attempting raw query approach`);
        
        try {
          const { data: sqlResult, error: sqlError } = await freshSupabase
            .rpc('get_course_students_with_details', { course_id_param: id });

          if (sqlResult && !sqlError) {
            console.log(`✅ Strategy 3 success: Found ${sqlResult.length} students via RPC`);
            studentResults = sqlResult;
            break;
          }
        } catch (sqlError) {
          console.log(`❌ Strategy 3 failed:`, sqlError.message);
        }
      }

      // Wait before next attempt
      if (attempts < maxAttempts) {
        console.log(`⏳ Waiting 200ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('📝 Final results:', {
      total_found: studentResults.length,
      attempts_used: attempts,
      successful_lookups: studentResults.filter(s => !s._missing_student_data).length,
      failed_lookups: studentResults.filter(s => s._missing_student_data).length
    });

    console.log('🔍 === GET COURSE STUDENTS END ===');
    return res.json(studentResults);
    
  } catch (err) {
    console.error('💥 Professor course students error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =================== STUDENT ENDPOINTS ===================

// NEW: Get Course Information with Professor Details
app.get('/api/student/course/:courseId/info', authenticateStudent, async (req, res) => {
  try {
    const { courseId } = req.params;
    const student_id = req.user.id;
    
    console.log('[COURSE INFO] Fetching course info for:', courseId, 'student:', student_id);
    
    // Get course from course_students enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('*,courses!inner(*)')
      .eq('student_id', student_id)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();
    
    if (enrollmentError || !enrollment) {
      console.log('[COURSE INFO] Enrollment error:', enrollmentError?.message);
      return res.status(404).json({ error: 'Course not found or not enrolled' });
    }
    
    const courseData = {
      ...enrollment.courses,
      enrollment_id: enrollment.id,
      enrolled_at: enrollment.enrolled_at
    };
    
    console.log('[COURSE INFO] Course found:', courseData.course_code, 'Prof ID:', courseData.professor_id);
    
    // Fetch professor data if professor_id exists
    if (courseData.professor_id) {
      try {
        const { data: profData, error: profError } = await supabase
          .from('professoraccounts')
          .select('id, first_name, last_name, email')
          .eq('id', courseData.professor_id)
          .single();
        
        if (profData) {
          courseData.professoraccounts = profData;
          console.log('[COURSE INFO] Professor attached:', profData.first_name, profData.last_name);
        } else {
          console.log('[COURSE INFO] Professor not found:', profError?.message);
        }
      } catch (profErr) {
        console.log('[COURSE INFO] Professor fetch error:', profErr.message);
      }
    }
    
    console.log('[COURSE INFO] Returning course data with professor');
    res.json(courseData);
    
  } catch (err) {
    console.error('[COURSE INFO] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1. Get Enrolled Courses (student)
app.get('/api/student/courses', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    
    // Get enrolled courses
    const { data, error } = await supabase
      .from('course_students')
      .select(`*,courses!inner(*)`)
      .eq('student_id', student_id)
      .eq('is_active', true);
    
    if (error) {
      console.error('Get student courses error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    
    // Fetch professor data for each course and attach
    const courses = await Promise.all((data || []).map(async enrollment => {
      const courseData = {
        ...enrollment.courses,
        enrollment_id: enrollment.id,
        enrolled_at: enrollment.enrolled_at
      };
      
      console.log('[PROF DEBUG] Processing course:', courseData.course_code, 'Professor ID:', courseData.professor_id);
      
      if (courseData.professor_id) {
        try {
          const { data: profData, error: profError } = await supabase
            .from('professoraccounts')
            .select('id, first_name, last_name, email')
            .eq('id', courseData.professor_id)
            .single();
          
          console.log('[PROF DEBUG] Query error:', profError, 'Got prof data:', !!profData);
          
          if (profData) {
            courseData.professoraccounts = profData;
            console.log('[PROF DEBUG] Attached professor:', profData.first_name, profData.last_name);
          }
        } catch (e) {
          console.log('[PROF DEBUG] Exception:', e.message);
        }
      }
      
      return courseData;
    }));
    
    console.log('[PROF DEBUG] Returning', courses.length, 'courses');
    console.log('[PROF DEBUG] First course has professoraccounts:', !!courses[0]?.professoraccounts);
    res.json(courses);
  } catch (err) {
    console.error('Student courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Join Requests (student)
app.get('/api/student/join-requests', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    
    const { data, error } = await supabase
      .from('course_join_requests')
      .select(`
        *,
        courses!inner(course_name, course_code, section, semester, school_year)
      `)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get student join requests error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Format the response
    const formattedData = (data || []).map(request => ({
      ...request,
      course_name: request.courses.course_name,
      course_code: request.courses.course_code,
      section: request.courses.section,
      semester: request.courses.semester,
      school_year: request.courses.school_year
    }));
    
    res.json(formattedData);
  } catch (err) {
    console.error('Student join requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Join Course (student)
// Replace your student join course endpoint with this enhanced version:
// Replace your student join course endpoint with this enhanced version:
app.post('/api/student/join-course', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    const { joinCode, message } = req.body;

    console.log('🎓 === STUDENT JOIN COURSE START ===');
    console.log('🎓 Student ID:', student_id);
    console.log('🎓 Student email:', req.user.email);
    console.log('🎓 Join code:', joinCode);

    if (!joinCode) {
      return res.status(400).json({ error: 'Join code is required' });
    }

    // ✅ ENHANCED: Verify student exists with better error handling
    const freshSupabase = getFreshSupabaseClient();
    const { data: studentVerify, error: studentError } = await freshSupabase
      .from('studentaccounts')
      .select('id, first_name, last_name, student_number, program, year_level, email')
      .eq('id', student_id)
      .single();

    console.log('🔍 Student verification result:');
    console.log('- Student found:', !!studentVerify);
    console.log('- Student data:', studentVerify);
    console.log('- Error:', studentError?.message || 'none');

    if (studentError) {
      console.error('❌ Student verification failed:', studentError);
      
      // ✅ ENHANCED: Try alternative lookup by email as fallback
      console.log('🔄 Trying fallback lookup by email...');
      const { data: studentByEmail, error: emailError } = await freshSupabase
        .from('studentaccounts')
        .select('id, first_name, last_name, student_number, program, year_level, email')
        .eq('email', req.user.email)
        .single();

      if (studentByEmail && !emailError) {
        console.log('✅ Found student by email fallback:', studentByEmail.email);
        // Use the student found by email
        studentVerify = studentByEmail;
      } else {
        console.error('❌ Fallback lookup also failed:', emailError);
        return res.status(400).json({ 
          error: 'Student account not found in database. Please contact administrator.',
          details: `Student ID: ${student_id}, Email: ${req.user.email}`
        });
      }
    }

    if (!studentVerify) {
      console.error('❌ No student data returned');
      return res.status(400).json({ 
        error: 'Student account not found. Please contact administrator.' 
      });
    }

    console.log('✅ Student verified:', studentVerify.first_name, studentVerify.last_name);

    // Find course by join code
    const { data: course, error: courseError } = await freshSupabase
      .from('courses')
      .select('*')
      .eq('join_code', joinCode.trim().toUpperCase())
      .eq('is_active', true)
      .eq('is_accepting_students', true)
      .single();
    
    if (courseError || !course) {
      console.error('❌ Course not found:', courseError);
      return res.status(404).json({ error: "Invalid or inactive join code" });
    }

    console.log('✅ Course found:', course.course_name);

    // Check if already enrolled
    const { data: existingEnrollment } = await freshSupabase
      .from('course_students')
      .select('id')
      .eq('course_id', course.id)
      .eq('student_id', student_id)
      .single();
    
    if (existingEnrollment) {
      console.log('❌ Already enrolled');
      return res.status(400).json({ error: "You are already enrolled in this course" });
    }

    // Check for existing pending request
    const { data: existingRequest } = await freshSupabase
      .from('course_join_requests')
      .select('id, status')
      .eq('course_id', course.id)
      .eq('student_id', student_id)
      .single();
    
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        console.log('❌ Pending request exists');
        return res.status(400).json({ error: "You already have a pending request for this course" });
      } else if (existingRequest.status === 'rejected') {
        // Allow reapplication if previously rejected
        console.log('🔄 Deleting old rejected request');
        const { error: deleteError } = await freshSupabase
          .from('course_join_requests')
          .delete()
          .eq('id', existingRequest.id);
        
        if (deleteError) {
          console.error('Delete old request error:', deleteError);
        }
      }
    }

    // Insert join request with verified data
    console.log('💾 Creating join request...');
    const { data: insertData, error: insertError } = await freshSupabase
      .from('course_join_requests')
      .insert([{
        course_id: course.id,
        student_id: student_id,
        join_code_used: joinCode.trim().toUpperCase(),
        message: message || null,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (insertError) {
      console.error('❌ Insert join request error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log('✅ Join request created successfully:', insertData[0]?.id);
    console.log('🎓 === STUDENT JOIN COURSE COMPLETE ===');
    
    res.json({ 
      message: "Join request sent successfully",
      requestId: insertData[0]?.id,
      courseName: course.course_name
    });
  } catch (err) {
    console.error('💥 Student join course error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Enhanced file serving endpoint - REMOVED (using Supabase bucket endpoints instead)










// =================== ADMIN COURSE MANAGEMENT ===================

// Get pending courses for admin approval
// Replace your pending courses endpoint with this enhanced version
// Replace your /api/admin/pending-courses endpoint with this working version:
app.get('/api/admin/pending-courses', authenticateAdmin, async (req, res) => {
  try {
    console.log('📚 === ADMIN PENDING COURSES (CACHE-BUSTING) ===');
    console.log('📚 Admin user:', req.admin?.email);
    console.log('📚 Request timestamp:', new Date().toISOString());
    
    // ✅ FORCE FRESH CONNECTION - No caching
    const getFreshConnection = () => {
      return createClient(
        process.env.SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
      );
    };

    // Step 1: Get pending courses with fresh connection
    const freshSupabase1 = getFreshConnection();
    const { data: courses, error: coursesError } = await freshSupabase1
      .from('pending_courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (coursesError) {
      console.error('❌ Get pending courses error:', coursesError);
      return res.status(500).json({ error: coursesError.message });
    }
    
    console.log('📚 Raw courses found:', courses?.length || 0);
    if (courses?.length > 0) {
      console.log('📚 First course professor_id:', courses[0].professor_id);
    }
    
    // Step 2: Manual lookup with fresh connections for each professor
    const formattedData = [];
    
    for (const course of courses || []) {
      console.log(`🔍 === PROFESSOR LOOKUP START ===`);
      console.log(`🔍 Course: ${course.course_name}`);
      console.log(`🔍 Professor ID: ${course.professor_id}`);
      
      let professor_name = 'Unknown Professor';
      let professor_email = 'unknown@email.com';
      
      // Fresh connection for professor lookup
      const freshSupabase2 = getFreshConnection();
      
      try {
        // Try professoraccounts first
        console.log('🔍 Checking professoraccounts table...');
        const { data: professor, error: profError } = await freshSupabase2
          .from('professoraccounts')
          .select('first_name, last_name, email')
          .eq('id', course.professor_id)
          .single();
        
        console.log('🔍 Professor query result:', {
          found: !!professor,
          error: profError?.message || 'none',
          professorData: professor ? {
            name: `${professor.first_name} ${professor.last_name}`,
            email: professor.email
          } : null
        });
        
        if (professor && !profError) {
          professor_name = `${professor.first_name} ${professor.last_name}`;
          professor_email = professor.email;
          console.log(`✅ Found in professoraccounts: ${professor_name}`);
        } else {
          console.log(`❌ Not found in professoraccounts, checking pending...`);
          
          // Fresh connection for pending lookup
          const freshSupabase3 = getFreshConnection();
          
          // Try pending_professoraccounts
          const { data: pendingProf, error: pendingError } = await freshSupabase3
            .from('pending_professoraccounts')
            .select('first_name, last_name, email')
            .eq('id', course.professor_id)
            .single();
          
          console.log('🔍 Pending professor query result:', {
            found: !!pendingProf,
            error: pendingError?.message || 'none'
          });
          
          if (pendingProf && !pendingError) {
            professor_name = `${pendingProf.first_name} ${pendingProf.last_name} (Pending Approval)`;
            professor_email = pendingProf.email;
            console.log(`⏳ Found in pending: ${professor_name}`);
          } else {
            professor_name = `Unknown Professor (ID: ${course.professor_id?.substring(0, 8)}...)`;
            professor_email = 'unknown@email.com';
            console.log(`❌ Professor not found anywhere for ID: ${course.professor_id}`);
            
            // ✅ EXTRA DEBUG: List all professors to see what's available
            const { data: allProfs } = await freshSupabase3
              .from('professoraccounts')
              .select('id, email, first_name, last_name')
              .limit(5);
            console.log('🔍 Available professors (first 5):', allProfs);
          }
        }
      } catch (lookupError) {
        console.error('💥 Professor lookup error:', lookupError);
        professor_name = `Lookup Error (ID: ${course.professor_id?.substring(0, 8)}...)`;
        professor_email = 'error@email.com';
      }
      
      console.log(`🔍 === PROFESSOR LOOKUP END ===`);
      
      formattedData.push({
        ...course,
        professor_name,
        professor_email
      });
    }
    
    console.log('📚 Final formatted data:', formattedData.length);
    console.log('📚 === ADMIN PENDING COURSES COMPLETE ===');
    
    res.json(formattedData);
    
  } catch (err) {
    console.error('💥 Admin pending courses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update course approval to include program
app.post('/api/admin/approve-course/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get pending course
    const { data: pendingCourse, error: fetchError } = await supabase
      .from('pending_courses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !pendingCourse) {
      return res.status(404).json({ error: 'Pending course not found' });
    }

    // Generate unique join code
    let joinCode;
    let isUnique = false;
    
    while (!isUnique) {
      joinCode = generateJoinCode();
      const { data: existing } = await supabase
        .from('courses')
        .select('id')
        .eq('join_code', joinCode)
        .single();
      
      if (!existing) {
        isUnique = true;
      }
    }

    // Move to approved courses with program
    const { error: insertError } = await supabase
      .from('courses')
      .insert([{
        course_name: pendingCourse.course_name,
        course_code: pendingCourse.course_code,
        section: pendingCourse.section,
        semester: pendingCourse.semester,
        school_year: pendingCourse.school_year,
        description: pendingCourse.description,
        max_students: pendingCourse.max_students,
        program: pendingCourse.program,  // ✅ ADD program field
        professor_id: pendingCourse.professor_id,
        approved_by: req.admin.id,
        join_code: joinCode,
        created_at: pendingCourse.created_at
      }]);
    
    if (insertError) {
      console.error('Course approval error:', insertError);
      return res.status(500).json({ error: 'Failed to approve course' });
    }

    // Delete from pending
    const { error: deleteError } = await supabase
      .from('pending_courses')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Delete pending course error:', deleteError);
    }

    res.json({ message: 'Course approved successfully', joinCode });
  } catch (err) {
    console.error('Admin approve course error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reject course
app.post('/api/admin/reject-course/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Get pending course info
    const { data: pendingCourse, error: fetchError } = await supabase
      .from('pending_courses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !pendingCourse) {
      return res.status(404).json({ error: 'Pending course not found' });
    }

    // Delete from pending table
    const { error: deleteError } = await supabase
      .from('pending_courses')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Reject course error:', deleteError);
      return res.status(500).json({ error: 'Failed to reject course' });
    }

    // TODO: Send rejection email to professor if needed

    res.json({ message: 'Course rejected successfully' });
  } catch (err) {
    console.error('Admin reject course error:', err);
    res.status(500).json({ error: err.message });
  }
});


///debug admin
// Add this right after your existing course management endpoints
app.get('/api/debug/pending-courses-detailed', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 === DETAILED PENDING COURSES DEBUG ===');
    console.log('👤 Admin user:', req.admin?.email);
    
    // Test 1: Raw pending courses
    console.log('📊 Test 1: Raw pending_courses query...');
    const { data: rawCourses, error: rawError } = await supabase
      .from('pending_courses')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Raw courses result:');
    console.log('- Count:', rawCourses?.length || 0);
    console.log('- Error:', rawError?.message || 'none');
    if (rawCourses?.length > 0) {
      console.log('- First course professor_id:', rawCourses[0].professor_id);
      console.log('- First course details:', {
        id: rawCourses[0].id,
        course_name: rawCourses[0].course_name,
        professor_id: rawCourses[0].professor_id
      });
    }

    // Test 2: Check if professor exists
    if (rawCourses?.length > 0) {
      const professorId = rawCourses[0].professor_id;
      console.log('👨‍🏫 Test 2: Checking professor with ID:', professorId);
      
      const { data: professor, error: profError } = await supabase
        .from('professoraccounts')
        .select('*')
        .eq('id', professorId)
        .single();

      console.log('👨‍🏫 Professor check result:');
      console.log('- Found:', !!professor);
      console.log('- Error:', profError?.message || 'none');
      if (professor) {
        console.log('- Professor details:', {
          id: professor.id,
          email: professor.email,
          name: `${professor.first_name} ${professor.last_name}`
        });
      }
    }

    // Test 3: Try left join instead of inner join
    console.log('📊 Test 3: Left join query...');
    const { data: leftJoinCourses, error: leftJoinError } = await supabase
      .from('pending_courses')
      .select(`
        *,
        professoraccounts(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    console.log('📊 Left join result:');
    console.log('- Count:', leftJoinCourses?.length || 0);
    console.log('- Error:', leftJoinError?.message || 'none');
    if (leftJoinCourses?.length > 0) {
      console.log('- First course with professor:', {
        course_name: leftJoinCourses[0].course_name,
        professor_data: leftJoinCourses[0].professoraccounts
      });
    }

    // Test 4: Try the exact query from your endpoint
    console.log('📊 Test 4: Exact endpoint query (inner join)...');
    const { data: innerJoinCourses, error: innerJoinError } = await supabase
      .from('pending_courses')
      .select(`
        *,
        professoraccounts!inner(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    console.log('📊 Inner join result:');
    console.log('- Count:', innerJoinCourses?.length || 0);
    console.log('- Error:', innerJoinError?.message || 'none');

    console.log('🔍 === DEBUG COMPLETE ===');

    res.json({
      timestamp: new Date().toISOString(),
      rawCourses: rawCourses || [],
      rawError: rawError?.message || null,
      leftJoinCourses: leftJoinCourses || [],
      leftJoinError: leftJoinError?.message || null,
      innerJoinCourses: innerJoinCourses || [],
      innerJoinError: innerJoinError?.message || null,
      professorCheck: rawCourses?.length > 0 ? {
        professorId: rawCourses[0].professor_id,
        exists: !!professor,
        professorError: profError?.message || null
      } : null
    });

  } catch (error) {
    console.error('💥 Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this to the end of your professor course creation endpoint (after successful insert)
app.post('/api/professor/create-course', authenticateProfessor, async (req, res) => {
  try {
    const professor_id = req.user.id;
    const {
      courseName, courseCode, section, semester, schoolYear,
      description, maxStudents
    } = req.body;

    // ... existing validation and duplicate checks ...

    // Insert pending course
    const { data, error } = await supabase
      .from('pending_courses')
      .insert([{
        course_name: courseName,
        course_code: courseCode,
        section,
        semester,
        school_year: schoolYear,
        description,
        max_students: maxStudents || 50,
        professor_id
      }])
      .select();

    if (error) {
      console.error('Create course error:', error);
      return res.status(500).json({ error: error.message });
    }

    // ✅ NEW: Enhanced success logging
    console.log('🎉 === NEW COURSE CREATED ===');
    console.log('🎉 Course ID:', data[0]?.id);
    console.log('🎉 Course Name:', courseName);
    console.log('🎉 Professor ID:', professor_id);
    console.log('🎉 Created at:', new Date().toISOString());
    console.log('🎉 === NOTIFY ADMIN ===');

    // ✅ NEW: Verify the course was actually inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('pending_courses')
      .select('*')
      .eq('id', data[0]?.id)
      .single();

    if (verifyData) {
      console.log('✅ Course insertion verified:', verifyData.course_name);
    } else {
      console.error('❌ Course verification failed:', verifyError);
    }

    res.json({ 
      message: "Course submitted for approval",
      courseId: data[0]?.id,
      courseName: courseName
    });
  } catch (err) {
    console.error('Professor create course error:', err);
    res.status(500).json({ error: err.message });
  }
});











// =================== EXISTING ADMIN ENDPOINTS ===================

// Get pending students with fresh connection
app.get('/api/admin/pending-students', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Admin requesting pending students:', {
      adminId: req.admin?.id,
      timestamp: new Date().toISOString()
    });
    
    const freshSupabase = getFreshSupabaseClient();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const { data: pendingStudents, error, count } = await freshSupabase
      .from('pending_studentaccounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    console.log('📊 Database query completed:');
    console.log('- Students found:', pendingStudents?.length || 0);
    console.log('- Exact count:', count);
    console.log('- Error:', error?.message || 'none');
    console.log('- First student:', pendingStudents?.[0]?.email || 'none');

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }

    const result = Array.isArray(pendingStudents) ? pendingStudents : [];
    console.log('✅ Returning students data:', result.length);
    res.json(result);
  } catch (error) {
    console.error('💥 Fetch pending students error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});
// Get pending professors with fresh connection
app.get('/api/admin/pending-professors', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Admin requesting pending professors:', {
      adminId: req.admin?.id,
      timestamp: new Date().toISOString()
    });
    
    const freshSupabase = getFreshSupabaseClient();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const { data: pendingProfessors, error, count } = await freshSupabase
      .from('pending_professoraccounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    console.log('📊 Database query completed:');
    console.log('- Professors found:', pendingProfessors?.length || 0);
    console.log('- Exact count:', count);
    console.log('- Error:', error?.message || 'none');

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }

    const result = Array.isArray(pendingProfessors) ? pendingProfessors : [];
    console.log('✅ Returning professors data:', result.length);
    res.json(result);
  } catch (error) {
    console.error('💥 Fetch pending professors error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Replace your student approval endpoint with this fixed version:
app.post('/api/admin/approve-student/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👍 === STUDENT APPROVAL START ===');
    console.log('👍 Starting student approval process for ID:', id);

    const freshSupabase = getFreshSupabaseClient();

    // Get pending student account
    const { data: pendingStudent, error: fetchError } = await freshSupabase
      .from('pending_studentaccounts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !pendingStudent) {
      console.error('❌ Student not found:', fetchError);
      return res.status(404).json({ error: 'Pending student account not found' });
    }

    console.log('📧 Creating Supabase Auth account for:', pendingStudent.email);

    // Create Supabase Auth account
    const { data: authUser, error: authError } = await freshSupabase.auth.admin.createUser({
      email: pendingStudent.email,
      password: pendingStudent.plain_password,
      email_confirm: true,
      user_metadata: {
        firstName: pendingStudent.first_name,
        lastName: pendingStudent.last_name,
        userType: 'student',
        studentNumber: pendingStudent.student_number,
        program: pendingStudent.program,
        yearLevel: pendingStudent.year_level,
        college: pendingStudent.college
      }
    });

    if (authError) {
      console.error('❌ Auth creation error:', authError);
      return res.status(500).json({ error: 'Failed to create auth account: ' + authError.message });
    }

    console.log('✅ Auth user created with ID:', authUser.user.id);

    // ✅ FIXED: Move files from pending bucket to approved bucket
    let newProfileImageUrl = null;
    let newRegistrationCardUrl = null;

    console.log('📁 === FILE MIGRATION START ===');
    console.log('📁 From bucket: pending_studentaccounts');
    console.log('📁 To bucket: studentaccounts');
    console.log('📁 Auth user ID:', authUser.user.id);

    // Move profile image
    if (pendingStudent.profile_image_url) {
      console.log('📸 Moving profile image...');
      console.log('📸 Original path:', pendingStudent.profile_image_url);
      
      try {
        // Download from pending bucket
        const { data: profileFile, error: downloadError } = await freshSupabase.storage
          .from('pending_studentaccounts')
          .download(pendingStudent.profile_image_url);

        if (downloadError) {
          console.error('❌ Profile image download error:', downloadError);
        } else if (profileFile) {
          console.log('✅ Profile image downloaded, size:', profileFile.size);
          
          // Create new path with Auth user ID
          const fileName = pendingStudent.profile_image_url.split('/').pop();
          const newPath = `${authUser.user.id}/profile_${fileName}`;
          console.log('📸 New path:', newPath);
          
          // Upload to approved bucket
          const { data: uploadData, error: uploadError } = await freshSupabase.storage
            .from('studentaccounts')
            .upload(newPath, profileFile, {
              contentType: profileFile.type || 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('❌ Profile image upload error:', uploadError);
          } else {
            console.log('✅ Profile image uploaded successfully');
            newProfileImageUrl = newPath;
            
            // Delete from pending bucket
            const { error: deleteError } = await freshSupabase.storage
              .from('pending_studentaccounts')
              .remove([pendingStudent.profile_image_url]);
            
            if (deleteError) {
              console.error('⚠️ Failed to delete old profile image:', deleteError);
            } else {
              console.log('🗑️ Old profile image deleted');
            }
          }
        }
      } catch (profileError) {
        console.error('💥 Profile image migration error:', profileError);
      }
    }

    // Move registration card
    if (pendingStudent.registration_card_url) {
      console.log('📄 Moving registration card...');
      console.log('📄 Original path:', pendingStudent.registration_card_url);
      
      try {
        // Download from pending bucket
        const { data: regCardFile, error: downloadError } = await freshSupabase.storage
          .from('pending_studentaccounts')
          .download(pendingStudent.registration_card_url);

        if (downloadError) {
          console.error('❌ Registration card download error:', downloadError);
        } else if (regCardFile) {
          console.log('✅ Registration card downloaded, size:', regCardFile.size);
          
          // Create new path with Auth user ID
          const fileName = pendingStudent.registration_card_url.split('/').pop();
          const newPath = `${authUser.user.id}/registration_${fileName}`;
          console.log('📄 New path:', newPath);
          
          // Upload to approved bucket
          const { data: uploadData, error: uploadError } = await freshSupabase.storage
            .from('studentaccounts')
            .upload(newPath, regCardFile, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error('❌ Registration card upload error:', uploadError);
          } else {
            console.log('✅ Registration card uploaded successfully');
            newRegistrationCardUrl = newPath;
            
            // Delete from pending bucket
            const { error: deleteError } = await freshSupabase.storage
              .from('pending_studentaccounts')
              .remove([pendingStudent.registration_card_url]);
            
            if (deleteError) {
              console.error('⚠️ Failed to delete old registration card:', deleteError);
            } else {
              console.log('🗑️ Old registration card deleted');
            }
          }
        }
      } catch (regCardError) {
        console.error('💥 Registration card migration error:', regCardError);
      }
    }

    console.log('📁 === FILE MIGRATION COMPLETE ===');
    console.log('📁 New profile URL:', newProfileImageUrl);
    console.log('📁 New registration URL:', newRegistrationCardUrl);

    // Insert into approved studentaccounts table with Auth user ID
    const approvedData = {
      id: authUser.user.id, // Use Supabase Auth user ID
      first_name: pendingStudent.first_name,
      middle_name: pendingStudent.middle_name,
      last_name: pendingStudent.last_name,
      student_number: pendingStudent.student_number,
      program: pendingStudent.program,
      college: pendingStudent.college,
      email: pendingStudent.email,
      password: pendingStudent.password, // Keep hashed password for legacy
      class_position: pendingStudent.class_position,
      class_status: pendingStudent.class_status,
      year_level: pendingStudent.year_level,
      profile_image_url: newProfileImageUrl,
      registration_card_url: newRegistrationCardUrl,
      approved_by: req.admin.id,
      approved_at: new Date().toISOString(),
      created_at: pendingStudent.created_at
    };

    console.log('💾 Inserting into studentaccounts table...');
    const { error: insertError } = await freshSupabase
      .from('studentaccounts')
      .insert([approvedData])
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create approved account: ' + insertError.message });
    }

    console.log('✅ Successfully inserted into studentaccounts');

    // Delete from pending table
    const { error: deleteError } = await freshSupabase
      .from('pending_studentaccounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
    } else {
      console.log('✅ Successfully removed from pending table');
    }

    // Send approval email
    await sendApprovalEmail(
      pendingStudent.email,
      `${pendingStudent.first_name} ${pendingStudent.last_name}`,
      'student'
    );

    console.log('🎉 === STUDENT APPROVAL COMPLETE ===');

    res.json({ 
      message: 'Student account approved successfully',
      authUserId: authUser.user.id,
      profileMigrated: !!newProfileImageUrl,
      registrationMigrated: !!newRegistrationCardUrl
    });

  } catch (error) {
    console.error('💥 Student approval error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Replace your professor approval endpoint with this fixed version:
app.post('/api/admin/approve-professor/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👍 === PROFESSOR APPROVAL START ===');
    console.log('👍 Approving professor account:', id);

    const freshSupabase = getFreshSupabaseClient();

    // Get pending professor account
    const { data: pendingProfessor, error: fetchError } = await freshSupabase
      .from('pending_professoraccounts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !pendingProfessor) {
      console.error('❌ Professor not found:', fetchError);
      return res.status(404).json({ error: 'Pending professor account not found' });
    }

    console.log('📧 Creating Supabase Auth account for:', pendingProfessor.email);

    // Create Supabase Auth account
    const { data: authUser, error: authError } = await freshSupabase.auth.admin.createUser({
      email: pendingProfessor.email,
      password: pendingProfessor.plain_password,
      email_confirm: true,
      user_metadata: {
        firstName: pendingProfessor.first_name,
        lastName: pendingProfessor.last_name,
        userType: 'professor',
        employeeNumber: pendingProfessor.employee_number,
        college: pendingProfessor.college
      }
    });

    if (authError) {
      console.error('❌ Auth creation error:', authError);
      return res.status(500).json({ error: 'Failed to create auth account: ' + authError.message });
    }

    console.log('✅ Auth user created with ID:', authUser.user.id);

    // ✅ FIXED: Move files from pending bucket to approved bucket
    let newProfileImageUrl = null;
    let newRegistrationCardUrl = null;

    console.log('📁 === FILE MIGRATION START ===');
    console.log('📁 From bucket: pending_professoraccounts');
    console.log('📁 To bucket: professoraccounts');
    console.log('📁 Auth user ID:', authUser.user.id);

    // Move profile image
    if (pendingProfessor.profile_image_url) {
      console.log('📸 Moving profile image...');
      console.log('📸 Original path:', pendingProfessor.profile_image_url);
      
      try {
        // Download from pending bucket
        const { data: profileFile, error: downloadError } = await freshSupabase.storage
          .from('pending_professoraccounts')
          .download(pendingProfessor.profile_image_url);

        if (downloadError) {
          console.error('❌ Profile image download error:', downloadError);
        } else if (profileFile) {
          console.log('✅ Profile image downloaded, size:', profileFile.size);
          
          // Create new path with Auth user ID
          const fileName = pendingProfessor.profile_image_url.split('/').pop();
          const newPath = `${authUser.user.id}/profile_${fileName}`;
          console.log('📸 New path:', newPath);
          
          // Upload to approved bucket
          const { data: uploadData, error: uploadError } = await freshSupabase.storage
            .from('professoraccounts')
            .upload(newPath, profileFile, {
              contentType: profileFile.type || 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('❌ Profile image upload error:', uploadError);
          } else {
            console.log('✅ Profile image uploaded successfully');
            newProfileImageUrl = newPath;
            
            // Delete from pending bucket
            const { error: deleteError } = await freshSupabase.storage
              .from('pending_professoraccounts')
              .remove([pendingProfessor.profile_image_url]);
            
            if (deleteError) {
              console.error('⚠️ Failed to delete old profile image:', deleteError);
            } else {
              console.log('🗑️ Old profile image deleted');
            }
          }
        }
      } catch (profileError) {
        console.error('💥 Profile image migration error:', profileError);
      }
    }

    // Move registration card
    if (pendingProfessor.registration_card_url) {
      console.log('📄 Moving registration card...');
      console.log('📄 Original path:', pendingProfessor.registration_card_url);
      
      try {
        // Download from pending bucket
        const { data: regCardFile, error: downloadError } = await freshSupabase.storage
          .from('pending_professoraccounts')
          .download(pendingProfessor.registration_card_url);

        if (downloadError) {
          console.error('❌ Registration card download error:', downloadError);
        } else if (regCardFile) {
          console.log('✅ Registration card downloaded, size:', regCardFile.size);
          
          // Create new path with Auth user ID
          const fileName = pendingProfessor.registration_card_url.split('/').pop();
          const newPath = `${authUser.user.id}/registration_${fileName}`;
          console.log('📄 New path:', newPath);
          
          // Upload to approved bucket
          const { data: uploadData, error: uploadError } = await freshSupabase.storage
            .from('professoraccounts')
            .upload(newPath, regCardFile, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error('❌ Registration card upload error:', uploadError);
          } else {
            console.log('✅ Registration card uploaded successfully');
            newRegistrationCardUrl = newPath;
            
            // Delete from pending bucket
            const { error: deleteError } = await freshSupabase.storage
              .from('pending_professoraccounts')
              .remove([pendingProfessor.registration_card_url]);
            
            if (deleteError) {
              console.error('⚠️ Failed to delete old registration card:', deleteError);
            } else {
              console.log('🗑️ Old registration card deleted');
            }
          }
        }
      } catch (regCardError) {
        console.error('💥 Registration card migration error:', regCardError);
      }
    }

    console.log('📁 === FILE MIGRATION COMPLETE ===');
    console.log('📁 New profile URL:', newProfileImageUrl);
    console.log('📁 New registration URL:', newRegistrationCardUrl);

    // Insert into approved professoraccounts table
    const approvedData = {
      id: authUser.user.id,
      first_name: pendingProfessor.first_name,
      middle_name: pendingProfessor.middle_name,
      last_name: pendingProfessor.last_name,
      employee_number: pendingProfessor.employee_number,
      college: pendingProfessor.college,
      email: pendingProfessor.email,
      password: pendingProfessor.password, // Keep hashed password for legacy auth
      class_position: pendingProfessor.class_position,
      profile_image_url: newProfileImageUrl,
      registration_card_url: newRegistrationCardUrl,
      approved_by: req.admin.id,
      approved_at: new Date().toISOString(),
      created_at: pendingProfessor.created_at
    };

    console.log('💾 Inserting into professoraccounts table...');
    const { error: insertError } = await freshSupabase
      .from('professoraccounts')
      .insert([approvedData]);

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create approved account: ' + insertError.message });
    }

    console.log('✅ Professor moved to approved accounts');

    // Delete from pending table
    const { error: deleteError } = await freshSupabase
      .from('pending_professoraccounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
    } else {
      console.log('✅ Professor removed from pending accounts');
    }

    // Send approval email
    await sendApprovalEmail(
      pendingProfessor.email,
      `${pendingProfessor.first_name} ${pendingProfessor.last_name}`,
      'professor'
    );

    console.log('🎉 === PROFESSOR APPROVAL COMPLETE ===');

    res.json({ 
      message: 'Professor account approved successfully',
      authUserId: authUser.user.id,
      profileMigrated: !!newProfileImageUrl,
      registrationMigrated: !!newRegistrationCardUrl
    });

  } catch (error) {
    console.error('💥 Professor approval error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Admin reject student account endpoint
app.post('/api/admin/reject-student/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    console.log('👎 Rejecting student account:', id);

    const freshSupabase = getFreshSupabaseClient();

    // Get pending student data before deletion
    const { data: pendingStudent, error: fetchError } = await freshSupabase
      .from('pending_studentaccounts')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Found pending student for rejection:', !!pendingStudent);

    if (fetchError || !pendingStudent) {
      console.error('❌ Student not found for rejection:', fetchError);
      return res.status(404).json({ error: 'Pending student account not found' });
    }

    console.log(`🗑️  Rejecting student account: ${pendingStudent.email}`);

    // Clean up files from storage bucket
    const filesCleanedUp = await cleanupUserFiles('pending_studentaccounts', pendingStudent.email);
    
    if (!filesCleanedUp) {
      console.warn(`⚠️  Warning: Could not clean up all files for ${pendingStudent.email}`);
    }

    // Delete from pending table
    const { error: deleteError } = await freshSupabase
      .from('pending_studentaccounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting from pending table:', deleteError);
      throw deleteError;
    }

    console.log('✅ Student removed from pending accounts');

    // Send rejection email
    const emailSent = await sendRejectionEmail(
      pendingStudent.email,
      `${pendingStudent.first_name} ${pendingStudent.last_name}`,
      'student',
      reason
    );

    if (!emailSent) {
      console.warn(`⚠️  Warning: Could not send rejection email to ${pendingStudent.email}`);
    }

    console.log(`✅ Successfully rejected student account: ${pendingStudent.email}`);

    res.json({ 
      message: 'Student account rejected successfully',
      filesCleanedUp,
      emailSent
    });

  } catch (error) {
    console.error('Reject student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin reject professor account endpoint
app.post('/api/admin/reject-professor/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    console.log('👎 Rejecting professor account:', id);

    const freshSupabase = getFreshSupabaseClient();

    // Get pending professor data before deletion
    const { data: pendingProfessor, error: fetchError } = await freshSupabase
      .from('pending_professoraccounts')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Found pending professor for rejection:', !!pendingProfessor);

    if (fetchError || !pendingProfessor) {
      console.error('❌ Professor not found for rejection:', fetchError);
      return res.status(404).json({ error: 'Pending professor account not found' });
    }

    console.log(`🗑️  Rejecting professor account: ${pendingProfessor.email}`);

    // Clean up files from storage bucket
    const filesCleanedUp = await cleanupUserFiles('pending_professoraccounts', pendingProfessor.email);
    
    if (!filesCleanedUp) {
      console.warn(`⚠️  Warning: Could not clean up all files for ${pendingProfessor.email}`);
    }

    // Delete from pending table
    const { error: deleteError } = await freshSupabase
      .from('pending_professoraccounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting from pending table:', deleteError);
      throw deleteError;
    }

    console.log('✅ Professor removed from pending accounts');

    // Send rejection email
    const emailSent = await sendRejectionEmail(
      pendingProfessor.email,
      `${pendingProfessor.first_name} ${pendingProfessor.last_name}`,
      'professor',
      reason
    );

    if (!emailSent) {
      console.warn(`⚠️  Warning: Could not send rejection email to ${pendingProfessor.email}`);
    }

    console.log(`✅ Successfully rejected professor account: ${pendingProfessor.email}`);

    res.json({ 
      message: 'Professor account rejected successfully',
      filesCleanedUp,
      emailSent
    });

  } catch (error) {
    console.error('Reject professor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =================== SIGNIN ENDPOINT ===================

// Replace your entire /api/signin endpoint with this:
app.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Signin attempt for:', email);

    // Step 1: Try Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authData?.user && authData?.session && !authError) {
      console.log('✅ Supabase Auth successful for:', authData.user.email);
      
      // Check user type by looking in database tables
      const freshSupabase = getFreshSupabaseClient();
      
      // Check if admin
      const { data: adminData } = await freshSupabase
        .from('adminaccounts')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (adminData) {
        return res.json({
          message: 'Admin signin successful',
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          user: {
            id: adminData.id,
            email: adminData.email,
            firstName: adminData.first_name,
            lastName: adminData.last_name,
            userType: 'admin'
          }
        });
      }

      // Check if student
      const { data: studentData } = await freshSupabase
        .from('studentaccounts')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (studentData) {
        return res.json({
          message: 'Student signin successful',
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          user: {
            id: studentData.id,
            email: studentData.email,
            firstName: studentData.first_name,
            lastName: studentData.last_name,
            userType: 'student',
            studentNumber: studentData.student_number,
            program: studentData.program,
            yearLevel: studentData.year_level
          }
        });
      }

      // Check if professor
      const { data: professorData } = await freshSupabase
        .from('professoraccounts')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (professorData) {
        return res.json({
          message: 'Professor signin successful',
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          user: {
            id: professorData.id,
            email: professorData.email,
            firstName: professorData.first_name,
            lastName: professorData.last_name,
            userType: 'professor',
            employeeNumber: professorData.employee_number,
            college: professorData.college
          }
        });
      }

      // User exists in Supabase Auth but not in any table
      return res.status(401).json({ 
        error: 'Account not found in system. Please contact administrator.' 
      });
    }

    // Supabase Auth failed - check if account is still pending
    const freshSupabase = getFreshSupabaseClient();
    
    // Check pending students
    const { data: pendingStudent } = await freshSupabase
      .from('pending_studentaccounts')
      .select('email')
      .eq('email', email)
      .single();

    if (pendingStudent) {
      return res.status(401).json({ 
        error: 'Your account is still pending approval. Please wait for admin approval.' 
      });
    }

    // Check pending professors
    const { data: pendingProfessor } = await freshSupabase
      .from('pending_professoraccounts')
      .select('email')
      .eq('email', email)
      .single();

    if (pendingProfessor) {
      return res.status(401).json({ 
        error: 'Your account is still pending approval. Please wait for admin approval.' 
      });
    }

    // Account doesn't exist anywhere
    console.log('❌ Signin failed for:', email);
    return res.status(401).json({ 
      error: 'Invalid email or password. Please check your credentials.' 
    });

  } catch (error) {
    console.error('💥 Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =================== FILE DOWNLOAD ENDPOINTS ===================

// Download file endpoint
app.get('/api/admin/download-file/:id/:type/:fileType', authenticateAdmin, async (req, res) => {
  try {
    const { id, type, fileType } = req.params;
    console.log('🔍 === FILE DOWNLOAD DEBUG START ===');
    console.log('📥 Download request params:', { id, type, fileType });
    console.log('👤 Admin user:', req.admin.email);
    
    const freshSupabase = getFreshSupabaseClient();
    
    // Determine table and bucket
    const tableName = type === 'student' ? 'pending_studentaccounts' : 'pending_professoraccounts';
    const bucketName = type === 'student' ? 'pending_studentaccounts' : 'pending_professoraccounts';
    
    console.log('🗂️ Table:', tableName);
    console.log('🪣 Bucket:', bucketName);
    
    // Get account data
    const { data: account, error } = await freshSupabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    console.log('👤 Account query result:');
    console.log('- Found:', !!account);
    console.log('- Error:', error);
    if (account) {
      console.log('- Email:', account.email);
      console.log('- Profile URL:', account.profile_image_url);
      console.log('- Registration URL:', account.registration_card_url);
    }

    if (error || !account) {
      console.error('❌ Account not found');
      return res.status(404).json({ error: 'Account not found', details: error });
    }

    // Determine file path
    let fileUrl;
    if (fileType === 'profile' && account.profile_image_url) {
      fileUrl = account.profile_image_url;
    } else if (fileType === 'registration' && account.registration_card_url) {
      fileUrl = account.registration_card_url;
    } else {
      console.error('❌ File URL not found:', {
        requestedType: fileType,
        profileExists: !!account.profile_image_url,
        registrationExists: !!account.registration_card_url,
        profileUrl: account.profile_image_url,
        registrationUrl: account.registration_card_url
      });
      return res.status(404).json({ error: 'File not found in account' });
    }

    console.log('📁 File path to download:', fileUrl);
    console.log('🪣 From bucket:', bucketName);

    // Try to download the file
    const { data: file, error: downloadError } = await freshSupabase.storage
      .from(bucketName)
      .download(fileUrl);

    console.log('📥 Download result:');
    console.log('- Success:', !!file);
    console.log('- Error:', downloadError);
    console.log('- File size:', file ? file.size : 'N/A');

    if (downloadError || !file) {
      console.error('❌ Storage download failed');
      
      // Let's also try to list files in the bucket to see what's there
      const emailFolder = account.email;
      console.log('🔍 Checking bucket contents for email folder:', emailFolder);
      
      const { data: folderContents, error: listError } = await freshSupabase.storage
        .from(bucketName)
        .list(emailFolder);
      
      console.log('📂 Folder contents:', folderContents);
      console.log('📂 List error:', listError);
      
      return res.status(404).json({ 
        error: 'File not found in storage',
        details: downloadError?.message,
        path: fileUrl,
        bucket: bucketName,
        folderContents: folderContents
      });
    }

    // Set headers and send file
    const fileName = fileUrl.split('/').pop();
    console.log('📄 Sending file:', fileName);
    
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    if (fileType === 'profile') {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 
                      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                      ext === 'gif' ? 'image/gif' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      console.log('🖼️ Image MIME type:', mimeType);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      console.log('📄 PDF MIME type set');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('✅ File sent successfully, size:', buffer.length, 'bytes');
    console.log('🔍 === FILE DOWNLOAD DEBUG END ===');
    
    res.send(buffer);

  } catch (error) {
    console.error('💥 Download endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
});

// =================== DEBUG ENDPOINTS ===================

// Debug endpoints
app.get('/api/debug/check-database', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔍 Debug: Checking database contents...');
    
    const freshSupabase = getFreshSupabaseClient();
    
    console.log('🔧 Supabase URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
    console.log('🔧 Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Check pending students with detailed logging
    console.log('📊 Querying pending_studentaccounts...');
    const { data: students, error: studentsError, count } = await freshSupabase
      .from('pending_studentaccounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    console.log('📊 Students query result:');
    console.log('- Data:', students);
    console.log('- Error:', studentsError);
    console.log('- Count:', count);
    console.log('- Raw length:', students?.length);

    // Check pending professors
    const { data: professors, error: professorsError } = await freshSupabase
      .from('pending_professoraccounts')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Professors query result:');
    console.log('- Data:', professors);
    console.log('- Error:', professorsError);
    console.log('- Length:', professors?.length);

    res.json({
      supabaseUrl: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      pendingStudents: {
        count: students?.length || 0,
        data: students || [],
        error: studentsError,
        exactCount: count
      },
      pendingProfessors: {
        count: professors?.length || 0,
        data: professors || [],
        error: professorsError
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check approved students
app.get('/api/debug/approved-students', authenticateAdmin, async (req, res) => {
  try {
    const freshSupabase = getFreshSupabaseClient();
    
    const { data: approvedStudents, error } = await freshSupabase
      .from('studentaccounts')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Approved students count:', approvedStudents?.length || 0);

    res.json({
      count: approvedStudents?.length || 0,
      students: approvedStudents || [],
      error: error?.message || null
    });
  } catch (error) {
    console.error('Debug approved students error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check approved professors
app.get('/api/debug/approved-professors', authenticateAdmin, async (req, res) => {
  try {
    const freshSupabase = getFreshSupabaseClient();
    
    const { data: approvedProfessors, error } = await freshSupabase
      .from('professoraccounts')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Approved professors count:', approvedProfessors?.length || 0);

    res.json({
      count: approvedProfessors?.length || 0,
      professors: approvedProfessors || [],
      error: error?.message || null
    });
  } catch (error) {
    console.error('Debug approved professors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Replace the storage debug endpoint with this enhanced version
app.get('/api/debug/storage/:type/:email', authenticateAdmin, async (req, res) => {
  try {
    const { type, email } = req.params;
    const freshSupabase = getFreshSupabaseClient();
    
    const bucketName = type === 'student' ? 'pending_studentaccounts' : 'pending_professoraccounts';
    const tableName = type === 'student' ? 'pending_studentaccounts' : 'pending_professoraccounts';
    
    console.log('🔍 === STORAGE DEBUG START ===');
    console.log('🔍 Checking storage bucket:', bucketName);
    console.log('📧 For email folder:', email);
    console.log('📊 Table:', tableName);
    
    // Get account data from database
    const { data: account, error: accountError } = await freshSupabase
      .from(tableName)
      .select('*')
      .eq('email', email)
      .single();
    
    console.log('👤 Account in database:', !!account);
    if (account) {
      console.log('- Profile URL:', account.profile_image_url);
      console.log('- Registration URL:', account.registration_card_url);
    }
    
    // List files in the email folder
    const { data: files, error: listError } = await freshSupabase.storage
      .from(bucketName)
      .list(email);
    
    console.log('📂 Files in email folder:', files);
    console.log('📂 List error:', listError);
    
    // List the root of the bucket to see structure
    const { data: rootFiles, error: rootError } = await freshSupabase.storage
      .from(bucketName)
      .list();
    
    console.log('📂 Root bucket files:', rootFiles);
    console.log('🔍 === STORAGE DEBUG END ===');
    
    res.json({
      bucket: bucketName,
      table: tableName,
      emailFolder: email,
      account: account ? {
        id: account.id,
        email: account.email,
        profile_image_url: account.profile_image_url,
        registration_card_url: account.registration_card_url,
        first_name: account.first_name,
        last_name: account.last_name
      } : null,
      accountError: accountError?.message || null,
      filesInEmailFolder: files || [],
      listError: listError?.message || null,
      rootFiles: rootFiles || [],
      rootError: rootError?.message || null,
      bucketExists: !rootError,
      folderExists: !listError
    });
    
  } catch (error) {
    console.error('💥 Storage debug error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('adminaccounts')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add this to your signup_handler.js (after your existing endpoints)
app.get('/api/debug/professor-auth', async (req, res) => {
  try {
    console.log('🔍 Debug Professor Auth Request:');
    console.log('Headers:', req.headers);
    console.log('Authorization:', req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Extracted token:', token ? 'EXISTS' : 'MISSING');
    
    if (!token) {
      return res.json({ error: 'No token provided', headers: req.headers });
    }

    // Try Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('Supabase auth result:', { user: !!user, error: error?.message });
    
    if (user && !error) {
      // Check professoraccounts
      const { data: professor, error: profErr } = await supabase
        .from('professoraccounts')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('Professor lookup result:', { professor: !!professor, error: profErr?.message });
      
      return res.json({
        tokenExists: true,
        supabaseUser: !!user,
        supabaseError: error?.message,
        professorFound: !!professor,
        professorError: profErr?.message,
        professorData: professor ? {
          id: professor.id,
          email: professor.email,
          name: `${professor.first_name} ${professor.last_name}`
        } : null
      });
    }

    res.json({
      tokenExists: true,
      supabaseUser: false,
      supabaseError: error?.message
    });

  } catch (err) {
    console.error('Debug auth error:', err);
    res.status(500).json({ error: err.message });
  }
});




// Course Groups Endpoints

// Enhanced Group Creation Endpoint
app.post('/api/professor/course/:courseId/create-groups', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { 
      groupType, 
      numberOfGroups, 
      minMembers, 
      maxMembers, 
      groupNames 
    } = req.body;
    
    console.log('🎯 Creating groups:', {
      groupType,
      numberOfGroups,
      minMembers,
      maxMembers,
      groupNames: groupNames?.length
    });
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get enrolled students
    const { data: students, error: studentsError } = await supabase
      .from('course_students')
      .select('student_id, studentaccounts!inner(first_name, last_name)')
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (studentsError) {
      return res.status(500).json({ error: studentsError.message });
    }

    const totalStudents = students.length;
    console.log('👨‍🎓 Total students:', totalStudents);

    // Validation
    if (totalStudents < numberOfGroups * minMembers) {
      return res.status(400).json({ 
        error: `Not enough students. Need at least ${numberOfGroups * minMembers} students for ${numberOfGroups} groups with minimum ${minMembers} members each.` 
      });
    }

    if (groupType === 'automatic') {
      // Automatic grouping with balanced distribution
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      
      // Calculate optimal distribution
      const studentsPerGroup = Math.floor(totalStudents / numberOfGroups);
      const extraStudents = totalStudents % numberOfGroups;
      
      console.log('📊 Distribution:', {
        studentsPerGroup,
        extraStudents,
        totalStudents,
        numberOfGroups
      });

      let studentIndex = 0;
      
      for (let i = 0; i < numberOfGroups; i++) {
        // Calculate members for this group (distribute extra students among first groups)
        const membersInThisGroup = studentsPerGroup + (i < extraStudents ? 1 : 0);
        
        // Skip if this group would have fewer than minimum members
        if (membersInThisGroup < minMembers) {
          console.log(`⚠️ Skipping group ${i + 1} - would have ${membersInThisGroup} members (min: ${minMembers})`);
          continue;
        }

        // Cap at maximum members
        const finalMembersCount = Math.min(membersInThisGroup, maxMembers);
        const groupStudents = shuffledStudents.slice(studentIndex, studentIndex + finalMembersCount);
        studentIndex += finalMembersCount;

        // Create group
        const { data: group, error: groupError } = await supabase
          .from('course_groups')
          .insert([{
            course_id: courseId,
            group_number: i + 1,
            group_name: `Group ${i + 1}`,
            min_members: minMembers,
            max_members: maxMembers,
            current_member_count: groupStudents.length,
            created_by: req.user.id
          }])
          .select()
          .single();

        if (groupError) {
          console.error('Group creation error:', groupError);
          return res.status(500).json({ error: groupError.message });
        }

        console.log(`✅ Created group ${i + 1} with ${groupStudents.length} members`);

        // Randomly select leader from group members
        const leaderIndex = Math.floor(Math.random() * groupStudents.length);
        
        // Add members to group
        const groupMembers = groupStudents.map((student, index) => ({
          group_id: group.id,
          student_id: student.student_id,
          role: index === leaderIndex ? 'leader' : 'member',
          position: index === leaderIndex ? 'leader' : 'member',
          assigned_by: req.user.id,
          assigned_at: new Date().toISOString()
        }));

        const { error: membersError } = await supabase
          .from('course_group_members')
          .insert(groupMembers);

        if (membersError) {
          console.error('Members insertion error:', membersError);
          return res.status(500).json({ error: membersError.message });
        }

        console.log(`👑 Leader assigned: ${groupStudents[leaderIndex].studentaccounts.first_name} ${groupStudents[leaderIndex].studentaccounts.last_name}`);
      }
      
      // Handle remaining students if any
      const remainingStudents = shuffledStudents.slice(studentIndex);
      if (remainingStudents.length > 0) {
        console.log(`⚠️ ${remainingStudents.length} students could not be assigned to groups due to constraints`);
      }
      
      const actualGroupsCreated = Math.min(numberOfGroups, Math.floor(totalStudents / minMembers));
      res.json({ 
        message: `Created ${actualGroupsCreated} groups automatically with ${totalStudents - remainingStudents.length} students assigned`,
        studentsAssigned: totalStudents - remainingStudents.length,
        studentsUnassigned: remainingStudents.length,
        groupsCreated: actualGroupsCreated
      });
    } else {
      // Manual grouping - create empty groups for professor to assign
      const groups = [];
      
      for (let i = 0; i < numberOfGroups; i++) {
        const groupName = groupNames && groupNames[i] ? groupNames[i] : `Group ${i + 1}`;
        
        const { data: group, error: groupError } = await supabase
          .from('course_groups')
          .insert([{
            course_id: courseId,
            group_number: i + 1,
            group_name: groupName,
            min_members: minMembers,
            max_members: maxMembers,
            current_member_count: 0,
            created_by: req.user.id
          }])
          .select()
          .single();

        if (groupError) {
          console.error('Manual group creation error:', groupError);
          return res.status(500).json({ error: groupError.message });
        }
        
        groups.push(group);
        console.log(`📝 Created empty group: ${groupName}`);
      }
      
      res.json({ 
        message: `Created ${groups.length} empty groups for manual assignment`,
        groups,
        totalStudents: totalStudents
      });
    }
  } catch (error) {
    console.error('Create groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Replace your existing groups endpoint with this fixed version

app.get('/api/professor/course/:courseId/groups', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('👥 === GET COURSE GROUPS START (FIXED) ===');
    console.log('👥 Course ID:', courseId);
    console.log('👥 Professor ID:', req.user.id);
    
    // Create fresh connection
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-request-id': `groups-fixed-${Date.now()}`
          }
        }
      }
    );

    // Verify professor owns the course
    const { data: course, error: courseError } = await freshSupabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get groups first
    const { data: rawGroups, error: groupsError } = await freshSupabase
      .from('course_groups')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('group_number');

    if (groupsError) {
      console.error('❌ Groups query error:', groupsError);
      return res.status(500).json({ error: groupsError.message });
    }

    console.log(`📝 Found ${rawGroups?.length || 0} groups`);

    // Process each group individually with proper member counting
    const processedGroups = await Promise.all(
      (rawGroups || []).map(async (group) => {
        console.log(`🔍 Processing group: ${group.group_name}`);
        
        // Get members with student details
        const { data: members, error: membersError } = await freshSupabase
          .from('course_group_members')
          .select(`
            *,
            studentaccounts!inner(
              id, first_name, last_name, student_number, 
              program, year_level, email, profile_image_url
            )
          `)
          .eq('group_id', group.id)
          .eq('is_active', true);

        if (membersError) {
          console.error(`❌ Members error for group ${group.id}:`, membersError);
          return {
            ...group,
            course_group_members: [],
            current_member_count: 0,
            actual_member_count: 0
          };
        }

        const actualMemberCount = members?.length || 0;
        console.log(`✅ Group ${group.group_name}: ${actualMemberCount} members found`);

        // Update the group's member count in database if it's wrong
        if (group.current_member_count !== actualMemberCount) {
          console.log(`🔄 Updating member count for ${group.group_name}: ${group.current_member_count} -> ${actualMemberCount}`);
          
          await freshSupabase
            .from('course_groups')
            .update({ current_member_count: actualMemberCount })
            .eq('id', group.id);
        }

        return {
          ...group,
          course_group_members: members || [],
          current_member_count: actualMemberCount,
          actual_member_count: actualMemberCount
        };
      })
    );

    console.log('📝 Groups processed successfully');
    console.log('👥 === GET COURSE GROUPS END ===');
    
    res.json(processedGroups);
    
  } catch (error) {
    console.error('💥 Get groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific group members with full details (for reports modal)
app.get('/api/professor/course/:courseId/groups/:groupId/members', authenticateProfessor, async (req, res) => {
  try {
    const { courseId, groupId } = req.params;
    
    console.log('👥 Fetching group members - Course:', courseId, 'Group:', groupId);
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Verify the group belongs to this course
    const { data: group, error: groupError } = await supabase
      .from('course_groups')
      .select('*')
      .eq('id', groupId)
      .eq('course_id', courseId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found in this course' });
    }

    // Get members with full student details
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        studentaccounts!inner(
          id, first_name, last_name, student_number, 
          program, year_level, email, profile_image_url
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return res.status(500).json({ error: 'Failed to fetch group members' });
    }

    // Format the response to flatten student data
    const formattedMembers = (members || []).map(member => ({
      student_id: member.student_id,
      id: member.studentaccounts.id,
      first_name: member.studentaccounts.first_name,
      last_name: member.studentaccounts.last_name,
      full_name: `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`,
      email: member.studentaccounts.email,
      student_number: member.studentaccounts.student_number,
      program: member.studentaccounts.program,
      year_level: member.studentaccounts.year_level,
      profile_image_url: member.studentaccounts.profile_image_url,
      role: member.role,
      joined_at: member.created_at
    }));

    console.log(`✅ Found ${formattedMembers.length} members in group`);
    res.json(formattedMembers);
    
  } catch (error) {
    console.error('💥 Get group members error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Assign Student to Group (Professor)
app.post('/api/professor/course/:courseId/assign-student', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId, groupId, role } = req.body;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Check if student is already in a group for this course
    const { data: existingMember } = await supabase
      .from('course_group_members')
      .select('*, course_groups!inner(course_id)')
      .eq('student_id', studentId)
      .eq('course_groups.course_id', courseId)
      .eq('is_active', true)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'Student is already assigned to a group' });
    }

    // Add student to group
    const { error: assignError } = await supabase
      .from('course_group_members')
      .insert([{
        group_id: groupId,
        student_id: studentId,
        role: role || 'member',
        position: role || 'member',
        assigned_by: req.user.id,
        assigned_at: new Date().toISOString()
      }]);

    if (assignError) {
      return res.status(500).json({ error: assignError.message });
    }

    // Update group member count
    const { error: updateError } = await supabase
      .rpc('increment_group_member_count', { group_id: groupId });

    res.json({ message: 'Student assigned to group successfully' });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Group Member Role (for manual assignment)
app.post('/api/professor/course/:courseId/update-member-role', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { memberId, newRole } = req.body; // memberId is the course_group_members.id
    
    // Verify professor owns the course
    const { data: member, error: memberError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          course_id,
          courses!inner(professor_id)
        )
      `)
      .eq('id', memberId)
      .single();
    
    if (memberError || !member) {
      return res.status(404).json({ error: 'Group member not found' });
    }

    if (member.course_groups.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // If setting as leader, remove leader role from other members in the same group
    if (newRole === 'leader') {
      await supabase
        .from('course_group_members')
        .update({ 
          role: 'member',
          position: 'member'
        })
        .eq('group_id', member.group_id)
        .eq('is_active', true);
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('course_group_members')
      .update({
        role: newRole,
        position: newRole
      })
      .eq('id', memberId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Unassigned Students for Manual Assignment
app.get('/api/professor/course/:courseId/unassigned-students', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get all enrolled students
    const { data: allStudents, error: studentsError } = await supabase
      .from('course_students')
      .select(`
        student_id,
        studentaccounts!inner(first_name, last_name, student_number, program, year_level)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (studentsError) {
      return res.status(500).json({ error: studentsError.message });
    }

    // Get students already in groups
    const { data: assignedStudents, error: assignedError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        course_groups!inner(course_id)
      `)
      .eq('course_groups.course_id', courseId)
      .eq('is_active', true);

    if (assignedError) {
      return res.status(500).json({ error: assignedError.message });
    }

    // Filter out assigned students
    const assignedStudentIds = new Set(assignedStudents.map(s => s.student_id));
    const unassignedStudents = allStudents.filter(s => !assignedStudentIds.has(s.student_id));

    // Format response
    const formattedStudents = unassignedStudents.map(student => ({
      student_id: student.student_id,
      student_name: `${student.studentaccounts.first_name} ${student.studentaccounts.last_name}`,
      student_number: student.studentaccounts.student_number,
      program: student.studentaccounts.program,
      year_level: student.studentaccounts.year_level
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error('Get unassigned students error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Quick student verification endpoint
app.get('/api/debug/verify-students', authenticateAdmin, async (req, res) => {
  try {
    const studentIds = [
      'b7c6af2a-1fcb-4b72-ae69-088672884006',
      '1236a30d-544c-451f-8a05-0ad41fc27822'
    ];
    
    console.log('🔍 Verifying student accounts...');
    
    const results = [];
    for (const studentId of studentIds) {
      const { data: student, error } = await supabase
        .from('studentaccounts')
        .select('*')
        .eq('id', studentId)
        .single();
      
      results.push({
        studentId,
        exists: !!student,
        error: error?.message || 'none',
        student: student ? {
          email: student.email,
          name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number
        } : null
      });
      
      console.log(`👤 Student ${studentId}:`, !!student ? 'EXISTS' : 'NOT FOUND');
    }
    
    res.json({
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Add these endpoints to your server file


app.get('/api/professor/course/:courseId/unassigned-students-detailed', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('🔍 === UNASSIGNED STUDENTS FIXED START ===');
    console.log('🔍 Course ID:', courseId);
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get ALL enrolled students with proper join
    const { data: allEnrollments, error: enrollmentsError } = await supabase
      .from('course_students')
      .select(`
        student_id,
        studentaccounts!inner(
          id, first_name, last_name, student_number, 
          program, year_level, profile_image_url, email
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (enrollmentsError) {
      console.error('❌ Enrollments query error:', enrollmentsError);
      return res.status(500).json({ error: enrollmentsError.message });
    }

    console.log('📝 Total enrolled students:', allEnrollments?.length || 0);

    // Get students already assigned to groups
    const { data: assignedStudents, error: assignedError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        course_groups!inner(course_id)
      `)
      .eq('course_groups.course_id', courseId)
      .eq('is_active', true);

    if (assignedError) {
      console.error('❌ Assigned students query error:', assignedError);
      return res.status(500).json({ error: assignedError.message });
    }

    console.log('📝 Already assigned students:', assignedStudents?.length || 0);

    // Create set of assigned student IDs for fast lookup
    const assignedStudentIds = new Set(assignedStudents?.map(s => s.student_id) || []);

    // Filter unassigned students and format properly
    const unassignedStudents = allEnrollments
      ?.filter(enrollment => !assignedStudentIds.has(enrollment.student_id))
      ?.map(enrollment => {
        const student = enrollment.studentaccounts;
        return {
          id: student.id,
          student_id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          full_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number,
          program: student.program,
          year_level: student.year_level,
          profile_image_url: student.profile_image_url,
          email: student.email,
          display_name: `${student.last_name}, ${student.first_name}`,
          _data_source: 'proper_join'
        };
      }) || [];

    // Sort by last name
    unassignedStudents.sort((a, b) => a.last_name.localeCompare(b.last_name));

    console.log('📝 Final unassigned students:', unassignedStudents.length);
    console.log('🔍 === UNASSIGNED STUDENTS FIXED END ===');

    res.json(unassignedStudents);
  } catch (error) {
    console.error('💥 Get unassigned students error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Enhanced group creation with drag and drop support - FIXED
app.post('/api/professor/course/:courseId/create-groups-enhanced', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { 
      groupType, 
      numberOfGroups, 
      minMembers, 
      maxMembers, 
      groupAssignments // For manual: [{ groupName, leaders: [], members: [] }]
    } = req.body;
    
    console.log('🎯 Enhanced group creation:', {
      groupType,
      numberOfGroups,
      minMembers,
      maxMembers,
      assignmentsCount: groupAssignments?.length
    });
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    if (groupType === 'manual') {
      // Manual grouping with drag and drop assignments
      const createdGroups = [];
      let totalStudentsAssigned = 0;
      
      for (let i = 0; i < groupAssignments.length; i++) {
        const assignment = groupAssignments[i];
        const allMembers = [...(assignment.leaders || []), ...(assignment.members || [])];
        
        if (allMembers.length === 0) {
          continue; // Skip empty groups
        }

        // Validate group has at least one leader
        if (!assignment.leaders || assignment.leaders.length === 0) {
          return res.status(400).json({ 
            error: `Group ${i + 1} (${assignment.groupName}) must have at least one leader` 
          });
        }

        // Validate member count
        if (allMembers.length < minMembers) {
          return res.status(400).json({ 
            error: `Group ${i + 1} (${assignment.groupName}) needs at least ${minMembers} members, has ${allMembers.length}` 
          });
        }

               if (allMembers.length > maxMembers) {
          return res.status(400).json({ 
            error: `Group ${i + 1} (${assignment.groupName}) exceeds maximum ${maxMembers} members, has ${allMembers.length}` 
          });
        }

        // Create group
        const { data: group, error: groupError } = await supabase
          .from('course_groups')
          .insert([{
            course_id: courseId,
            group_number: i + 1,
            group_name: assignment.groupName || `Group ${i + 1}`,
            min_members: minMembers,
            max_members: maxMembers,
            current_member_count: allMembers.length,
            created_by: req.user.id
          }])
          .select()
          .single();

        if (groupError) {
          console.error('Manual group creation error:', groupError);
          return res.status(500).json({ error: groupError.message });
        }

        // Add members with their assigned roles
        const groupMembers = [
          ...(assignment.leaders || []).map(student => ({
            group_id: group.id,
            student_id: student.student_id,
            role: 'leader',
            position: 'leader',
            assigned_by: req.user.id,
            assigned_at: new Date().toISOString()
          })),
          ...(assignment.members || []).map(student => ({
            group_id: group.id,
            student_id: student.student_id,
            role: 'member',
            position: 'member',
            assigned_by: req.user.id,
            assigned_at: new Date().toISOString()
          }))
        ];

        if (groupMembers.length > 0) {
          const { error: membersError } = await supabase
            .from('course_group_members')
            .insert(groupMembers);

          if (membersError) {
            console.error('Manual members insertion error:', membersError);
            return res.status(500).json({ error: membersError.message });
          }
        }

        createdGroups.push({
          ...group,
          leaders: assignment.leaders.length,
          members: assignment.members.length
        });
        
        totalStudentsAssigned += allMembers.length;
        
        console.log(`📝 Created manual group: ${assignment.groupName} with ${allMembers.length} members (${assignment.leaders.length} leaders, ${assignment.members.length} members)`);
      }
      
      res.json({ 
        message: `Successfully created ${createdGroups.length} groups with ${totalStudentsAssigned} students assigned`,
        groups: createdGroups,
        totalStudentsAssigned
      });

    } else {
      // Automatic grouping logic (existing code but enhanced)
      
      // Get all unassigned students for automatic assignment
      const { data: allEnrollments, error: enrollmentsError } = await supabase
        .from('course_students')
        .select(`
          student_id,
          studentaccounts!inner(id, first_name, last_name, student_number)
        `)
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (enrollmentsError) {
        return res.status(500).json({ error: enrollmentsError.message });
      }

      // Get students already assigned to groups
      const { data: assignedStudents, error: assignedError } = await supabase
        .from('course_group_members')
        .select(`student_id, course_groups!inner(course_id)`)
        .eq('course_groups.course_id', courseId)
        .eq('is_active', true);

      if (assignedError) {
        return res.status(500).json({ error: assignedError.message });
      }

      const assignedIds = new Set(assignedStudents?.map(s => s.student_id) || []);
      const availableStudents = allEnrollments?.filter(s => !assignedIds.has(s.student_id)) || [];
      
      const totalStudents = availableStudents.length;
      
      if (totalStudents === 0) {
        return res.status(400).json({ error: 'No unassigned students available' });
      }

      // Smart balancing logic
      let studentsToAssign = [...availableStudents];
      
      if (smartBalancing) {
        console.log('🧠 Applying smart balancing...');
        
        // Sort students by balancing criteria
        studentsToAssign = studentsToAssign.sort((a, b) => {
          const studentA = a.studentaccounts;
          const studentB = b.studentaccounts;
          
          // Prefer students with leadership experience (class_position)
          if (preferLeaders) {
            const aIsLeader = studentA.class_position && 
              (studentA.class_position.toLowerCase().includes('leader') || 
               studentA.class_position.toLowerCase().includes('president') ||
               studentA.class_position.toLowerCase().includes('captain'));
            const bIsLeader = studentB.class_position && 
              (studentB.class_position.toLowerCase().includes('leader') || 
               studentB.class_position.toLowerCase().includes('president') ||
               studentB.class_position.toLowerCase().includes('captain'));
            
            if (aIsLeader && !bIsLeader) return -1;
            if (!aIsLeader && bIsLeader) return 1;
          }
          
          // Balance by year level
          if (balanceByYear) {
            const aYear = studentA.year_level || 0;
            const bYear = studentB.year_level || 0;
            if (aYear !== bYear) return aYear - bYear;
          }
          
          return 0;
        });
      } else {
        // Simple random shuffle
        studentsToAssign = studentsToAssign.sort(() => Math.random() - 0.5);
      }
      
      // Calculate distribution
      const baseStudentsPerGroup = Math.floor(totalStudents / numberOfGroups);
      const studentsRemainder = totalStudents % numberOfGroups;
      
      let studentIndex = 0;
      let createdGroups = 0;
      
      for (let i = 0; i < numberOfGroups && studentIndex < totalStudents; i++) {
        // Calculate members for this group
        let membersInThisGroup = baseStudentsPerGroup;
        if (i < studentsRemainder) {
          membersInThisGroup++; // Distribute remainder students to first groups
        }
        
        // Ensure we don't exceed remaining students
        membersInThisGroup = Math.min(membersInThisGroup, totalStudents - studentIndex);
        
        // Skip if this group would have fewer than minimum members
        if (membersInThisGroup < minMembers) {
          break;
        }

        // Cap at maximum members
        const finalMembersCount = Math.min(membersInThisGroup, maxMembers);
        const groupStudents = studentsToAssign.slice(studentIndex, studentIndex + finalMembersCount);
        studentIndex += finalMembersCount;

        // Create group
        const { data: group, error: groupError } = await supabase
          .from('course_groups')
          .insert([{
            course_id: courseId,
            group_number: i + 1,
            group_name: `Group ${i + 1}`,
            min_members: minMembers,
            max_members: maxMembers,
            current_member_count: groupStudents.length,
            created_by: req.user.id
          }])
          .select()
          .single();

        if (groupError) {
          console.error('Group creation error:', groupError);
          return res.status(500).json({ error: groupError.message });
        }

        // Smart leader selection
        let leaderIndex;
        if (preferLeaders) {
          // Find students with leadership experience first
          const potentialLeaders = groupStudents.filter((enrollment, index) => {
            const student = enrollment.studentaccounts;
            return student.class_position && 
              (student.class_position.toLowerCase().includes('leader') || 
               student.class_position.toLowerCase().includes('president') ||
               student.class_position.toLowerCase().includes('captain'));
          });
          
          if (potentialLeaders.length > 0) {
            // Select randomly from potential leaders
            const randomLeader = potentialLeaders[Math.floor(Math.random() * potentialLeaders.length)];
            leaderIndex = groupStudents.findIndex(s => s.student_id === randomLeader.student_id);
          } else {
            // No leaders found, select randomly
            leaderIndex = Math.floor(Math.random() * groupStudents.length);
          }
        } else {
          // Random leader selection
          leaderIndex = Math.floor(Math.random() * groupStudents.length);
        }
        
        // Add members to group
        const groupMembers = groupStudents.map((enrollment, index) => ({
          group_id: group.id,
          student_id: enrollment.student_id,
          role: index === leaderIndex ? 'leader' : 'member',
          position: index === leaderIndex ? 'leader' : 'member',
          assigned_by: req.user.id,
          assigned_at: new Date().toISOString()
        }));

        const { error: membersError } = await supabase
          .from('course_group_members')
          .insert(groupMembers);

        if (membersError) {
          console.error('Members insertion error:', membersError);
          return res.status(500).json({ error: membersError.message });
        }

        createdGroups++;
        const leaderName = `${groupStudents[leaderIndex].studentaccounts.first_name} ${groupStudents[leaderIndex].studentaccounts.last_name}`;
        console.log(`✅ Created group ${i + 1} with ${groupStudents.length} members, leader: ${leaderName}`);
      }
      
      const remainingStudents = totalStudents - studentIndex;
      res.json({ 
        message: `Created ${createdGroups} groups automatically`,
        studentsAssigned: studentIndex,
        studentsUnassigned: remainingStudents,
        groupsCreated: createdGroups
      });
    }
    
  } catch (error) {
    console.error('Enhanced create groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all groups for a course
app.delete('/api/professor/course/:courseId/delete-all-groups', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const professorId = req.user.id;

    console.log('🗑️ === DELETE ALL GROUPS START ===');
    console.log('🗑️ Course ID:', courseId);
    console.log('🗑️ Professor ID:', professorId);

    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', professorId)
      .single();

    if (courseError || !course) {
      console.error('Course verification error:', courseError);
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get all groups for this course
    const { data: groups, error: groupsError } = await supabase
      .from('course_groups')
      .select('id')
      .eq('course_id', courseId);

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    if (!groups || groups.length === 0) {
      return res.json({ 
        message: 'No groups to delete',
        deletedCount: 0
      });
    }

    const groupIds = groups.map(g => g.id);
    console.log(`🗑️ Found ${groupIds.length} groups to delete`);

    // Delete all group members first (due to foreign key constraints)
    const { error: membersDeleteError } = await supabase
      .from('course_group_members')
      .delete()
      .in('group_id', groupIds);

    if (membersDeleteError) {
      console.error('Error deleting group members:', membersDeleteError);
      return res.status(500).json({ error: 'Failed to delete group members' });
    }

    console.log('✅ Deleted all group members');

    // Now delete all groups
    const { error: groupsDeleteError } = await supabase
      .from('course_groups')
      .delete()
      .eq('course_id', courseId);

    if (groupsDeleteError) {
      console.error('Error deleting groups:', groupsDeleteError);
      return res.status(500).json({ error: 'Failed to delete groups' });
    }

    console.log(`✅ Successfully deleted ${groupIds.length} groups`);

    res.json({ 
      message: `Successfully deleted ${groupIds.length} group(s)`,
      deletedCount: groupIds.length
    });

  } catch (error) {
    console.error('Delete all groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/student', (req, res, next) => {
  console.log(`📍 Student API called: ${req.method} ${req.path}`);
  console.log('📍 Headers:', req.headers.authorization ? 'Token present' : 'No token');
  next();
});

// ✅ CORRECTED: File serving route - add this to your server.js
// File serving endpoint - REMOVED (using Supabase bucket endpoints instead)

// ✅ ALTERNATIVE: More flexible file serving (if you need nested paths) - REMOVED (using Supabase bucket endpoints instead)
app.use('/api/student-leader', authenticateStudent, require('./student-leader-api'));
app.use('/api/tasks', authenticateStudent, require('./task-submission-api'));
app.use('/api/task-assignment', authenticateStudent, require('./task-assignment-api'));
app.use('/api/professor-grading', require('./professor-grading-api'));
// app.use('/api/grading', require('./grading-api')); // Temporarily disabled due to syntax error
app.use('/api/grading-clean', require('./grading-clean-api'));
app.use('/api/announcements', require('./announcements-api'));
app.use('/api/evaluations', authenticateStudent, require('./routes/evaluations'));
app.use('/api/grade-submissions', require('./routes/grade_submissions')(supabase));
app.use('/api/notifications', authenticateStudent, require('./routes/notifications'));

// =============== COURSE ANALYTICS ===============
// Comprehensive course analytics endpoint for professor dashboard
app.get('/api/professor/course/:courseId/analytics', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const professorId = req.user.id;

    console.log('📊 === COURSE ANALYTICS START ===');
    console.log('📊 Course ID:', courseId);
    console.log('📊 Professor ID:', professorId);

    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        professoraccounts!courses_professor_id_fkey(first_name, last_name)
      `)
      .eq('id', courseId)
      .eq('professor_id', professorId)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get student analytics
    const { data: students, error: studentsError } = await supabase
      .from('course_students')
      .select(`
        *,
        studentaccounts(student_number, first_name, last_name, email)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    // Get projects analytics
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(count),
        project_submissions(count),
        phase_submissions(count)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    // Get groups analytics
    const { data: groups, error: groupsError } = await supabase
      .from('course_groups')
      .select(`
        *,
        course_group_members(count)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    // Get recent submissions for activity chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentSubmissions, error: submissionsError } = await supabase
      .from('project_submissions')
      .select(`
        submission_date,
        projects!inner(course_id)
      `)
      .eq('projects.course_id', courseId)
      .gte('submission_date', sevenDaysAgo.toISOString())
      .order('submission_date', { ascending: false });

    // Get phase submissions
    const { data: recentPhaseSubmissions, error: phaseSubmissionsError } = await supabase
      .from('phase_submissions')
      .select(`
        submitted_at,
        project_phases!inner(
          projects!inner(course_id)
        )
      `)
      .eq('project_phases.projects.course_id', courseId)
      .gte('submitted_at', sevenDaysAgo.toISOString())
      .order('submitted_at', { ascending: false });

    // Calculate project phase analytics
    const projectPhaseData = projects?.map(project => {
      const dueDate = new Date(project.due_date);
      const isOverdue = dueDate < new Date();
      const daysLeft = Math.max(0, Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)));
      
      return {
        id: project.id,
        title: project.title,
        dueDate: project.due_date,
        daysLeft,
        isOverdue,
        phaseCount: project.project_phases[0]?.count || 0,
        submissionCount: project.project_submissions[0]?.count || 0
      };
    }) || [];

    // Calculate submission activity for last 7 days
    const activityData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const dayProjectSubmissions = recentSubmissions?.filter(sub => 
        new Date(sub.submission_date).toDateString() === dateStr
      ).length || 0;
      
      const dayPhaseSubmissions = recentPhaseSubmissions?.filter(sub => 
        new Date(sub.submitted_at).toDateString() === dateStr
      ).length || 0;
      
      activityData.push({
        date: dateStr,
        dateShort: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        projectSubmissions: dayProjectSubmissions,
        phaseSubmissions: dayPhaseSubmissions,
        totalSubmissions: dayProjectSubmissions + dayPhaseSubmissions
      });
    }

    // Calculate group analytics
    const unassignedStudents = students?.filter(student => 
      !groups?.some(group => 
        group.course_group_members?.some(member => member.student_id === student.student_id)
      )
    ) || [];

    const groupSizeDistribution = groups?.reduce((acc, group) => {
      const size = group.member_count || 0;
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {}) || {};

    // Calculate course engagement metrics
    const totalStudents = students?.length || 0;
    const groupedStudents = totalStudents - (unassignedStudents?.length || 0);
    const participationRate = totalStudents > 0 ? (groupedStudents / totalStudents) * 100 : 0;

    // Recent activity summary
    const totalRecentSubmissions = activityData.reduce((sum, day) => sum + day.totalSubmissions, 0);
    const activeProjects = projectPhaseData.filter(p => !p.isOverdue && p.daysLeft <= 30).length;

    const analytics = {
      course,
      summary: {
        totalStudents,
        totalGroups: groups?.length || 0,
        totalProjects: projects?.length || 0,
        activeProjects,
        unassignedStudents: unassignedStudents?.length || 0,
        participationRate: Math.round(participationRate * 100) / 100,
        recentSubmissions: totalRecentSubmissions
      },
      projects: projectPhaseData,
      activityData,
      groupSizeDistribution,
      upcomingDeadlines: projectPhaseData
        .filter(p => !p.isOverdue && p.daysLeft <= 14)
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5),
      overdueProjects: projectPhaseData.filter(p => p.isOverdue),
      timestamp: new Date().toISOString()
    };

    console.log('📊 Course analytics calculated:', analytics.summary);
    console.log('📊 === COURSE ANALYTICS COMPLETE ===');

    res.json(analytics);

  } catch (error) {
    console.error('💥 Course analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Get detailed unassigned students with proper image URLs
app.get('/api/professor/course/:courseId/unassigned-students-detailed', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('🔍 === ENHANCED UNASSIGNED STUDENTS START ===');
    console.log('🔍 Course ID:', courseId);
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    console.log('✅ Course verified:', course.course_name);

    // Get ALL enrolled students
    const { data: allEnrollments, error: enrollmentsError } = await supabase
      .from('course_students')
      .select(`
        student_id,
        studentaccounts!inner(
          id, first_name, last_name, student_number, 
          program, year_level, profile_image_url, email
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (enrollmentsError) {
      console.error('❌ Enrollments query error:', enrollmentsError);
      return res.status(500).json({ error: enrollmentsError.message });
    }

    console.log('📝 Total enrolled students:', allEnrollments?.length || 0);

    // Get students already assigned to groups
    const { data: assignedStudents, error: assignedError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        course_groups!inner(course_id)
      `)
      .eq('course_groups.course_id', courseId)
      .eq('is_active', true);

    if (assignedError) {
      console.error('❌ Assigned students query error:', assignedError);
      return res.status(500).json({ error: assignedError.message });
    }

    console.log('📝 Already assigned students:', assignedStudents?.length || 0);

    // Create set of assigned student IDs
    const assignedStudentIds = new Set(assignedStudents?.map(s => s.student_id) || []);

    // Filter and format unassigned students
    const unassignedStudents = allEnrollments
      ?.filter(enrollment => !assignedStudentIds.has(enrollment.student_id))
      ?.map(enrollment => {
        const student = enrollment.studentaccounts;
        
        // Enhanced profile image URL construction
        let profileImageUrl = null;
        if (student.profile_image_url) {
          // Use the enhanced file serving endpoint
          profileImageUrl = `/api/files/${student.id}/${student.profile_image_url}`;
        }
        
        return {
          id: student.id,
          student_id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          full_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number,
          program: student.program,
          year_level: student.year_level,
          profile_image_url: profileImageUrl,
          email: student.email,
          display_name: `${student.last_name}, ${student.first_name}`,
          sortKey: student.last_name.toLowerCase()
        };
      }) || [];

    // Sort by last name
    unassignedStudents.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    console.log('📝 Final unassigned students:', unassignedStudents.length);
    console.log('🔍 === ENHANCED UNASSIGNED STUDENTS END ===');

    res.json(unassignedStudents);
  } catch (error) {
    console.error('💥 Get unassigned students error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced endpoint to get student list with profile images
app.get('/api/professor/course/:courseId/students-with-images', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('👥 === GET STUDENTS WITH IMAGES START ===');
    console.log('👥 Course ID:', courseId);
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Create fresh connection for better reliability
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-request-id': `students-images-${Date.now()}`
          }
        }
      }
    );

    // Get enrolled students with proper join
    const { data: enrollments, error: enrollmentsError } = await freshSupabase
      .from('course_students')
      .select(`
        *,
        studentaccounts!inner(
          id, first_name, middle_name, last_name, student_number, 
          program, college, email, year_level, class_status, class_position,
          profile_image_url, registration_card_url
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (enrollmentsError) {
      console.error('❌ Enrollments query error:', enrollmentsError);
      return res.status(500).json({ error: enrollmentsError.message });
    }

    console.log('📝 Raw enrollments found:', enrollments?.length || 0);

    // Format students with enhanced image URLs
    const studentsWithImages = enrollments?.map(enrollment => {
      const student = enrollment.studentaccounts;
      
      return {
        enrollment_id: enrollment.id,
        student_id: student.id,
        enrolled_at: enrollment.enrolled_at,
        student_name: `${student.first_name} ${student.last_name}`,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        student_number: student.student_number,
        program: student.program,
        college: student.college,
        year_level: student.year_level,
        class_status: student.class_status,
        class_position: student.class_position,
        email: student.email,
        profile_image_url: student.profile_image_url, // Direct Supabase path
        registration_card_url: student.registration_card_url, // Direct Supabase path
        id: student.id // Make sure to include the ID for frontend selection
      };
    }) || [];

    console.log('👥 Students with images processed:', studentsWithImages.length);
    console.log('👥 === GET STUDENTS WITH IMAGES END ===');

    res.json(studentsWithImages);
  } catch (error) {
    console.error('💥 Get students with images error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get students with group information for Grade Sheet
app.get('/api/professor/course/:courseId/grade-sheet-students', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('📊 === GET GRADE SHEET STUDENTS START ===');
    console.log('📊 Course ID:', courseId);
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Create fresh connection
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false }
      }
    );

    // Get enrolled students
    const { data: enrollments, error: enrollmentsError } = await freshSupabase
      .from('course_students')
      .select(`
        *,
        studentaccounts!inner(
          id, first_name, middle_name, last_name, student_number, 
          program, college, email, year_level, profile_image_url
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (enrollmentsError) {
      console.error('❌ Enrollments query error:', enrollmentsError);
      return res.status(500).json({ error: enrollmentsError.message });
    }

    console.log('📝 Enrollments found:', enrollments?.length || 0);

    // Get all group memberships for this course
    const { data: groupMemberships, error: groupError } = await freshSupabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          id,
          group_name,
          group_number,
          course_id
        )
      `)
      .eq('course_groups.course_id', courseId)
      .eq('is_active', true);

    if (groupError) {
      console.error('❌ Group memberships query error:', groupError);
    }

    console.log('📝 Group memberships found:', groupMemberships?.length || 0);

    // Create a map of student_id to group info
    const studentGroupMap = {};
    if (groupMemberships) {
      groupMemberships.forEach(membership => {
        studentGroupMap[membership.student_id] = {
          group_id: membership.group_id,
          group_name: membership.course_groups.group_name,
          group_number: membership.course_groups.group_number,
          member_role: membership.role,
          position: membership.position
        };
      });
    }

    // Format students with group info
    const studentsWithGroups = enrollments?.map(enrollment => {
      const student = enrollment.studentaccounts;
      const groupInfo = studentGroupMap[student.id];
      
      return {
        student_id: student.id,
        student_first_name: student.first_name,
        student_middle_name: student.middle_name,
        student_last_name: student.last_name,
        student_number: student.student_number,
        student_email: student.email,
        student_program: student.program,
        student_college: student.college,
        student_year_level: student.year_level,
        student_profile_image_url: student.profile_image_url,
        enrolled_at: enrollment.enrolled_at,
        // Group information
        group_id: groupInfo?.group_id || null,
        group_name: groupInfo?.group_name || null,
        group_number: groupInfo?.group_number || null,
        member_role: groupInfo?.member_role || null,
        position: groupInfo?.position || null
      };
    }) || [];

    console.log('📊 Students with groups processed:', studentsWithGroups.length);
    console.log('📊 Sample student:', studentsWithGroups[0]);
    console.log('📊 === GET GRADE SHEET STUDENTS END ===');

    res.json(studentsWithGroups);
  } catch (error) {
    console.error('💥 Get grade sheet students error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile images for specific student IDs (for Grade Submissions)
app.get('/api/professor/students/profile-images', authenticateProfessor, async (req, res) => {
  try {
    const { ids } = req.query;
    
    console.log('📸 Backend: Received profile images request');
    console.log('📸 Backend: Raw IDs query param:', ids);
    
    if (!ids) {
      return res.status(400).json({ error: 'Student IDs required' });
    }

    // Parse comma-separated IDs
    const studentIds = ids.split(',').filter(id => id.trim());
    
    console.log('📸 Backend: Parsed student IDs:', studentIds);
    console.log('📸 Backend: Number of IDs:', studentIds.length);
    console.log('📸 Backend: First ID:', studentIds[0]);
    
    if (studentIds.length === 0) {
      return res.status(400).json({ error: 'No valid student IDs provided' });
    }

    // Use fresh Supabase client to avoid caching issues
    const freshSupabase = getFreshSupabaseClient();
    
    // First, let's test if we can find ANY students
    const { data: allStudents, error: allError } = await freshSupabase
      .from('studentaccounts')
      .select('id, email, first_name, last_name, profile_image_url')
      .limit(5);
    
    console.log('📸 Backend: Sample students in database:', allStudents);
    console.log('📸 Backend: Sample query error:', allError);

    // Now fetch profile images for the requested students
    const { data: students, error } = await freshSupabase
      .from('studentaccounts')
      .select('id, profile_image_url')
      .in('id', studentIds);

    console.log('📸 Backend: Supabase query result:', { 
      studentsFound: students?.length || 0, 
      students: students,
      error: error 
    });

    if (error) {
      console.error('❌ Error fetching student images:', error);
      return res.status(500).json({ error: 'Failed to fetch student images' });
    }

    // If no students found, log for debugging
    if (!students || students.length === 0) {
      console.warn('⚠️ No students found with the provided IDs');
      console.warn('⚠️ Requested IDs:', studentIds);
    }

    // Return array of {id, profile_image_url}
    console.log('📸 Backend: Sending response:', students);
    res.json(students || []);
  } catch (error) {
    console.error('💥 Get student profile images error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for profile image troubleshooting

// =================== COURSE OVERVIEW ENDPOINTS ===================

// Get join requests for course
app.get('/api/professor/course/:courseId/join-requests', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get join requests with student details
    const { data: joinRequests, error } = await supabase
      .from('course_join_requests')
      .select(`
        *,
        studentaccounts!inner(
          id, first_name, last_name, email, student_number
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Join requests fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Format the response
    const formattedRequests = joinRequests?.map(request => ({
      id: request.id,
      status: request.status,
      created_at: request.created_at,
      responded_at: request.responded_at,
      join_code_used: request.join_code_used,
      student_first_name: request.studentaccounts.first_name,
      student_last_name: request.studentaccounts.last_name,
      student_email: request.studentaccounts.email,
      student_number: request.studentaccounts.student_number,
      student_id: request.studentaccounts.id
    })) || [];

    res.json(formattedRequests);
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle join request (approve/reject)
app.put('/api/professor/course/:courseId/join-requests/:requestId', authenticateProfessor, async (req, res) => {
  try {
    const { courseId, requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('course_join_requests')
      .select('*')
      .eq('id', requestId)
      .eq('course_id', courseId)
      .single();

    if (requestError || !joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    // Update join request status
    const { error: updateError } = await supabase
      .from('course_join_requests')
      .update({
        status,
        responded_at: new Date().toISOString(),
        responded_by: req.user.id
      })
      .eq('id', requestId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // If approved, add student to course
    if (action === 'approve') {
      const { error: enrollError } = await supabase
        .from('course_students')
        .insert([{
          course_id: courseId,
          student_id: joinRequest.student_id,
          approved_by: req.user.id,
          enrolled_at: new Date().toISOString(),
          is_active: true
        }]);

      if (enrollError) {
        console.error('Error enrolling student:', enrollError);
        // Don't fail the whole request, just log the error
      }
    }

    res.json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error('Process join request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent submissions for grading overview
app.get('/api/professor/course/:courseId/recent-submissions', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get recent project submissions
    const { data: projectSubmissions, error: projectError } = await supabase
      .from('project_submissions')
      .select(`
        id, submission_date, grade, graded_at,
        projects!inner(id, title, course_id),
        course_groups!inner(id, group_number)
      `)
      .eq('projects.course_id', courseId)
      .order('submission_date', { ascending: false })
      .limit(10);

    // Get recent phase submissions
    const { data: phaseSubmissions, error: phaseError } = await supabase
      .from('phase_submissions')
      .select(`
        id, submitted_at, grade, graded_at,
        project_phases!inner(
          id, title, phase_number,
          projects!inner(id, title, course_id)
        ),
        course_groups!inner(id, group_number)
      `)
      .eq('project_phases.projects.course_id', courseId)
      .order('submitted_at', { ascending: false })
      .limit(10);

    // Combine and format submissions
    const allSubmissions = [];
    
    if (projectSubmissions) {
      projectSubmissions.forEach(sub => {
        allSubmissions.push({
          id: sub.id,
          type: 'project',
          project_title: sub.projects.title,
          phase_title: null,
          group_number: sub.course_groups.group_number,
          submitted_at: sub.submission_date,
          grade: sub.grade,
          graded_at: sub.graded_at
        });
      });
    }

    if (phaseSubmissions) {
      phaseSubmissions.forEach(sub => {
        allSubmissions.push({
          id: sub.id,
          type: 'phase',
          project_title: sub.project_phases.projects.title,
          phase_title: `Phase ${sub.project_phases.phase_number}: ${sub.project_phases.title}`,
          group_number: sub.course_groups.group_number,
          submitted_at: sub.submitted_at,
          grade: sub.grade,
          graded_at: sub.graded_at
        });
      });
    }

    // Sort by submission date
    allSubmissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    res.json(allSubmissions.slice(0, 10));
  } catch (error) {
    console.error('Get recent submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get submission activity for the last 7 days
app.get('/api/professor/course/:courseId/submission-activity', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get last 7 days of submission activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get project submissions count per day
    const { data: projectActivity, error: projectActivityError } = await supabase
      .from('project_submissions')
      .select(`
        submission_date,
        projects!inner(course_id)
      `)
      .eq('projects.course_id', courseId)
      .gte('submission_date', sevenDaysAgo.toISOString());

    // Get phase submissions count per day
    const { data: phaseActivity, error: phaseActivityError } = await supabase
      .from('phase_submissions')
      .select(`
        submitted_at,
        project_phases!inner(
          projects!inner(course_id)
        )
      `)
      .eq('project_phases.projects.course_id', courseId)
      .gte('submitted_at', sevenDaysAgo.toISOString());

    // Process activity data
    const activityMap = {};
    
    // Initialize with 0 for all days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toDateString();
      activityMap[dateKey] = 0;
    }

    // Count project submissions
    if (projectActivity) {
      projectActivity.forEach(sub => {
        const dateKey = new Date(sub.submission_date).toDateString();
        if (activityMap.hasOwnProperty(dateKey)) {
          activityMap[dateKey]++;
        }
      });
    }

    // Count phase submissions
    if (phaseActivity) {
      phaseActivity.forEach(sub => {
        const dateKey = new Date(sub.submitted_at).toDateString();
        if (activityMap.hasOwnProperty(dateKey)) {
          activityMap[dateKey]++;
        }
      });
    }

    // Format response
    const activityData = Object.keys(activityMap).map(dateKey => {
      const date = new Date(dateKey);
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: activityMap[dateKey]
      };
    });

    res.json(activityData);
  } catch (error) {
    console.error('Get submission activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DASHBOARD ANALYTICS ENDPOINTS
// ============================================================

// Test endpoint to verify auth middleware works
app.get('/api/professor/test-auth', authenticateProfessor, async (req, res) => {
  console.log('✅ TEST AUTH PASSED - req.user:', req.user?.id, req.user?.email);
  res.json({ success: true, user: req.user });
});

// Get phase deliverable submissions for dashboard graphs
// NOTE: Using authenticateProfessor middleware which handles all auth
app.get('/api/professor/courses/:courseId/phase-deliverable-submissions', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 [Phase Submissions] START');
    console.log('📊 [Phase Submissions] courseId:', courseId);
    console.log('📊 [Phase Submissions] professorId:', professorId);
    console.log('📊 [Phase Submissions] req.user:', JSON.stringify(req.user));
    console.log('📊 [Phase Submissions] req.professor:', JSON.stringify(req.professor));
    
    // Get the course directly from database using service role (bypasses RLS)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    console.log('📊 [Phase Submissions] Course lookup:', course?.id, 'professor_id:', course?.professor_id);
    console.log('📊 [Phase Submissions] Comparison:', {
      courseProfessorId: course?.professor_id,
      requestProfessorId: professorId,
      match: course?.professor_id === professorId,
      courseProfType: typeof course?.professor_id,
      reqProfType: typeof professorId
    });

    if (courseError || !course) {
      console.error('❌ [Phase Submissions] Course not found or error:', courseError?.message);
      return res.status(404).json({ error: 'Course not found' });
    }

    // Verify professor owns this course
    if (course.professor_id !== professorId) {
      console.error('❌ [Phase Submissions] Unauthorized - course owned by', course.professor_id, 'but requested by', professorId);
      return res.status(403).json({ 
        error: 'Unauthorized - not course owner',
        debug: {
          courseProfessorId: course.professor_id,
          requestProfessorId: professorId,
          match: course.professor_id === professorId
        }
      });
    }

    console.log('✅ [Phase Submissions] Authorization check passed');

    // Get all projects for this course
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('course_id', courseId);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ error: projectsError.message });
    }

    if (!projects || projects.length === 0) {
      console.log('📊 [Phase Submissions] No projects found');
      return res.json([]);
    }

    const projectIds = projects.map(p => p.id);
    console.log('📊 [Phase Submissions] Found projects:', projectIds.length);

    // Get all phase deliverable submissions for these projects
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_deliverable_submissions')
      .select('id, project_id, submitted_at, status')
      .in('project_id', projectIds);

    if (submissionsError) {
      console.error('Error fetching phase deliverable submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    console.log('✅ [Phase Submissions] Returning', submissions?.length || 0, 'submissions');
    res.json(submissions || []);
  } catch (error) {
    console.error('❌ Get phase deliverable submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project deliverable submissions for dashboard graphs
// NOTE: Using authenticateProfessor middleware which handles all auth
app.get('/api/professor/courses/:courseId/project-deliverable-submissions', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const professorId = req.user.id;
    
    console.log('📊 [Project Submissions] START');
    console.log('📊 [Project Submissions] courseId:', courseId);
    console.log('📊 [Project Submissions] professorId:', professorId);
    console.log('📊 [Project Submissions] req.user:', JSON.stringify(req.user));
    
    // Get the course directly from database using service role (bypasses RLS)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    console.log('📊 [Project Submissions] Course lookup:', course?.id, 'professor_id:', course?.professor_id);
    console.log('📊 [Project Submissions] Comparison:', {
      courseProfessorId: course?.professor_id,
      requestProfessorId: professorId,
      match: course?.professor_id === professorId,
      courseProfType: typeof course?.professor_id,
      reqProfType: typeof professorId
    });

    if (courseError || !course) {
      console.error('❌ [Project Submissions] Course not found or error:', courseError?.message);
      return res.status(404).json({ error: 'Course not found' });
    }

    // Verify professor owns this course
    if (course.professor_id !== professorId) {
      console.error('❌ [Project Submissions] Unauthorized - course owned by', course.professor_id, 'but requested by', professorId);
      return res.status(403).json({ 
        error: 'Unauthorized - not course owner',
        debug: {
          courseProfessorId: course.professor_id,
          requestProfessorId: professorId,
          match: course.professor_id === professorId
        }
      });
    }

    console.log('✅ [Project Submissions] Authorization check passed');

    // Get all projects for this course
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('course_id', courseId);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ error: projectsError.message });
    }

    if (!projects || projects.length === 0) {
      console.log('📊 [Project Submissions] No projects found');
      return res.json([]);
    }

    const projectIds = projects.map(p => p.id);
    console.log('📊 [Project Submissions] Found projects:', projectIds.length);

    // Get all project deliverable submissions for these projects
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_deliverable_submissions')
      .select('id, project_id, submitted_at, status')
      .in('project_id', projectIds);

    if (submissionsError) {
      console.error('Error fetching project deliverable submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    console.log('✅ [Project Submissions] Returning', submissions?.length || 0, 'submissions');
    res.json(submissions || []);
  } catch (error) {
    console.error('❌ Get project deliverable submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get task submissions for dashboard graphs
app.get('/api/professor/course/:courseId/task-submissions', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get all projects for this course
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('course_id', courseId);

    if (projectsError) {
      return res.status(500).json({ error: projectsError.message });
    }

    if (!projects || projects.length === 0) {
      return res.json([]);
    }

    const projectIds = projects.map(p => p.id);

    // Get all project phases
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id')
      .in('project_id', projectIds);

    if (phasesError) {
      return res.status(500).json({ error: phasesError.message });
    }

    if (!phases || phases.length === 0) {
      return res.json([]);
    }

    const phaseIds = phases.map(p => p.id);

    // Get all tasks for these phases
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .in('phase_id', phaseIds);

    if (tasksError) {
      return res.status(500).json({ error: tasksError.message });
    }

    if (!tasks || tasks.length === 0) {
      return res.json([]);
    }

    const taskIds = tasks.map(t => t.id);

    // Get all task submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('task_submissions')
      .select('*')
      .in('task_id', taskIds);

    if (submissionsError) {
      console.error('Error fetching task submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    res.json(submissions || []);
  } catch (error) {
    console.error('Get task submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get revision submissions for dashboard graphs
app.get('/api/professor/course/:courseId/revision-submissions', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get all projects for this course
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('course_id', courseId);

    if (projectsError) {
      return res.status(500).json({ error: projectsError.message });
    }

    if (!projects || projects.length === 0) {
      return res.json([]);
    }

    const projectIds = projects.map(p => p.id);

    // Get all project phases
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('id')
      .in('project_id', projectIds);

    if (phasesError) {
      return res.status(500).json({ error: phasesError.message });
    }

    if (!phases || phases.length === 0) {
      return res.json([]);
    }

    const phaseIds = phases.map(p => p.id);

    // Get all tasks for these phases
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .in('phase_id', phaseIds);

    if (tasksError) {
      return res.status(500).json({ error: tasksError.message });
    }

    if (!tasks || tasks.length === 0) {
      return res.json([]);
    }

    const taskIds = tasks.map(t => t.id);

    // Get all revision submissions for these tasks
    const { data: submissions, error: submissionsError } = await supabase
      .from('revision_submissions')
      .select('*')
      .in('task_id', taskIds);

    if (submissionsError) {
      console.error('Error fetching revision submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    res.json(submissions || []);
  } catch (error) {
    console.error('Get revision submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for profile image troubleshooting
app.get('/api/debug/student-image/:studentId', authenticateAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('🔍 Debug student image for ID:', studentId);
    
    // Get student record
    const { data: student, error: studentError } = await supabase
      .from('studentaccounts')
      .select('*')
      .eq('id', studentId)
      .single();
    
    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    console.log('👤 Student found:', {
      id: student.id,
      email: student.email,
      name: `${student.first_name} ${student.last_name}`,
      profile_image_url: student.profile_image_url
    });
    
    // Check storage buckets
    const buckets = ['studentaccounts', 'pending_studentaccounts'];
    const storageResults = {};
    
    for (const bucketName of buckets) {
      console.log(`📁 Checking bucket: ${bucketName}`);
      
      try {
        // List files in student folder
        const { data: files, error: listError } = await supabase.storage
          .from(bucketName)
          .list(studentId);
        
        storageResults[bucketName] = {
          success: !listError,
          error: listError?.message || null,
          files: files || [],
          fileCount: files?.length || 0
        };
        
        console.log(`📁 ${bucketName}:`, {
          success: !listError,
          fileCount: files?.length || 0,
          files: files?.map(f => f.name) || []
        });
        
        // If profile image URL exists, try to access it
        if (student.profile_image_url) {
          const testPath = `${studentId}/${student.profile_image_url}`;
          const { data: testFile, error: testError } = await supabase.storage
            .from(bucketName)
            .download(testPath);
          
          storageResults[bucketName].profileImageTest = {
            path: testPath,
            accessible: !testError,
            error: testError?.message || null,
            size: testFile?.size || null
          };
        }
        
      } catch (bucketError) {
        storageResults[bucketName] = {
          success: false,
          error: bucketError.message,
          files: [],
          fileCount: 0
        };
      }
    }
    
    // Test the file serving endpoint
    let fileServingTest = null;
    if (student.profile_image_url) {
      const testUrl = `/api/files/${studentId}/${student.profile_image_url}`;
      console.log('🔗 Testing file serving endpoint:', testUrl);
      
      try {
        const testResponse = await fetch(`${req.protocol}://${req.get('host')}${testUrl}`);
        fileServingTest = {
          url: testUrl,
          status: testResponse.status,
          accessible: testResponse.ok,
          contentType: testResponse.headers.get('content-type')
        };
      } catch (testError) {
        fileServingTest = {
          url: testUrl,
          error: testError.message,
          accessible: false
        };
      }
    }
    
    res.json({
      studentId,
      student: {
        id: student.id,
        email: student.email,
        name: `${student.first_name} ${student.last_name}`,
        profile_image_url: student.profile_image_url
      },
      storageResults,
      fileServingTest,
      recommendations: generateImageRecommendations(student, storageResults),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug image error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate recommendations
function generateImageRecommendations(student, storageResults) {
  const recommendations = [];
  
  if (!student.profile_image_url) {
    recommendations.push('Student has no profile image URL set in database');
  }
  
  const hasFilesInApproved = storageResults.studentaccounts?.fileCount > 0;
  const hasFilesInPending = storageResults.pending_studentaccounts?.fileCount > 0;
  
  if (!hasFilesInApproved && !hasFilesInPending) {
    recommendations.push('No files found in any storage bucket for this student');
  }
  
  if (hasFilesInPending && !hasFilesInApproved) {
    recommendations.push('Files exist in pending bucket but not in approved bucket - may need account approval migration');
  }
  
  if (student.profile_image_url) {
    const profileAccessible = storageResults.studentaccounts?.profileImageTest?.accessible || 
                             storageResults.pending_studentaccounts?.profileImageTest?.accessible;
    
    if (!profileAccessible) {
      recommendations.push('Profile image URL is set but file is not accessible - check file path and bucket location');
    }
  }
  
  return recommendations;
}

// Bulk fix profile images endpoint
app.post('/api/admin/fix-student-images', authenticateAdmin, async (req, res) => {
  try {
    const { studentIds } = req.body; // Array of student IDs to fix
    
    console.log('🔧 Bulk fixing student images for:', studentIds?.length || 'all students');
    
    let studentsToFix = [];
    
    if (studentIds && studentIds.length > 0) {
      // Fix specific students
      const { data: students, error: studentsError } = await supabase
        .from('studentaccounts')
        .select('id, email, first_name, last_name, profile_image_url')
        .in('id', studentIds);
      
      if (studentsError) {
        return res.status(500).json({ error: studentsError.message });
      }
      
      studentsToFix = students || [];
    } else {
      // Fix all students with image issues
      const { data: allStudents, error: allError } = await supabase
        .from('studentaccounts')
        .select('id, email, first_name, last_name, profile_image_url')
        .not('profile_image_url', 'is', null);
      
      if (allError) {
        return res.status(500).json({ error: allError.message });
      }
      
      studentsToFix = allStudents || [];
    }
    
    const results = {
      processed: 0,
      fixed: 0,
      errors: 0,
      details: []
    };
    
    for (const student of studentsToFix) {
      results.processed++;
      
      try {
        console.log(`🔧 Processing student: ${student.first_name} ${student.last_name} (${student.id})`);
        
        // Check if file exists in approved bucket
        const approvedPath = `${student.id}/${student.profile_image_url}`;
        const { data: approvedFile, error: approvedError } = await supabase.storage
          .from('studentaccounts')
          .download(approvedPath);
        
        if (approvedFile && !approvedError) {
          console.log(`✅ File already accessible in approved bucket for ${student.email}`);
          results.details.push({
            studentId: student.id,
            status: 'already_accessible',
            message: 'File already in correct location'
          });
          continue;
        }
        
        // Check if file exists in pending bucket
        const pendingPath = `${student.id}/${student.profile_image_url}`;
        const { data: pendingFile, error: pendingError } = await supabase.storage
          .from('pending_studentaccounts')
          .download(pendingPath);
        
        if (pendingFile && !pendingError) {
          console.log(`🔄 Moving file from pending to approved for ${student.email}`);
          
          // Upload to approved bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('studentaccounts')
            .upload(approvedPath, pendingFile, {
              contentType: pendingFile.type || 'image/jpeg',
              upsert: true
            });
          
          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          // Delete from pending bucket
          const { error: deleteError } = await supabase.storage
            .from('pending_studentaccounts')
            .remove([pendingPath]);
          
          if (deleteError) {
            console.warn(`⚠️ Failed to delete from pending bucket: ${deleteError.message}`);
          }
          
          results.fixed++;
          results.details.push({
            studentId: student.id,
            status: 'moved_from_pending',
            message: 'Successfully moved from pending to approved bucket'
          });
          
        } else {
          console.log(`❌ File not found in any bucket for ${student.email}`);
          results.errors++;
          results.details.push({
            studentId: student.id,
            status: 'file_not_found',
            message: 'Profile image file not found in any storage bucket'
          });
        }
        
      } catch (studentError) {
        console.error(`💥 Error processing ${student.email}:`, studentError);
        results.errors++;
        results.details.push({
          studentId: student.id,
          status: 'error',
          message: studentError.message
        });
      }
    }
    
    console.log('🔧 Bulk fix completed:', results);
    
    res.json({
      message: 'Bulk image fix completed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Bulk fix images error:', error);
    res.status(500).json({ error: error.message });
  }
});

































// Enhanced debug endpoint for course students
app.get('/api/debug/course-students-detailed/:courseId', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log('🔍 === DETAILED COURSE STUDENTS DEBUG ===');
    console.log('🔍 Course ID:', courseId);
    console.log('🔍 Professor ID:', req.user.id);
    
    // Step 1: Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    console.log('📚 Course check:', {
      found: !!course,
      error: courseError?.message || 'none'
    });

    // Step 2: Check raw course_students table
    const { data: rawEnrollments, error: enrollError } = await supabase
      .from('course_students')
      .select('*')
      .eq('course_id', courseId);
    
    console.log('👨‍🎓 Raw enrollments:', {
      count: rawEnrollments?.length || 0,
      data: rawEnrollments,
      error: enrollError?.message || 'none'
    });

    // Step 3: Check each student individually
    const studentChecks = [];
    if (rawEnrollments && rawEnrollments.length > 0) {
      for (const enrollment of rawEnrollments) {
        console.log(`🔍 Checking student ID: ${enrollment.student_id}`);
        
        const { data: student, error: studentError } = await supabase
          .from('studentaccounts')
          .select('*')
          .eq('id', enrollment.student_id)
          .single();
        
        studentChecks.push({
          enrollment_id: enrollment.id,
          student_id: enrollment.student_id,
          student_found: !!student,
          student_error: studentError?.message || 'none',
          student_data: student ? {
            id: student.id,
            email: student.email,
            name: `${student.first_name} ${student.last_name}`,
            student_number: student.student_number
          } : null
        });
        
        console.log(`👤 Student ${enrollment.student_id}:`, {
          found: !!student,
          error: studentError?.message || 'none'
        });
      }
    }

    // Step 4: Try the join query
    const { data: joinResult, error: joinError } = await supabase
      .from('course_students')
      .select(`
        *,
        studentaccounts!inner(first_name, last_name, student_number, program, year_level)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    console.log('🔗 Join query result:', {
      count: joinResult?.length || 0,
      error: joinError?.message || 'none',
      data: joinResult
    });

    // Step 5: Try left join to see what's missing
    const { data: leftJoinResult, error: leftJoinError } = await supabase
      .from('course_students')
      .select(`
        *,
        studentaccounts(first_name, last_name, student_number, program, year_level)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);

    console.log('🔗 Left join query result:', {
      count: leftJoinResult?.length || 0,
      error: leftJoinError?.message || 'none',
      data: leftJoinResult
    });

    console.log('🔍 === DEBUG COMPLETE ===');

    res.json({
      courseId,
      professorId: req.user.id,
      course: course || null,
      courseError: courseError?.message || null,
      rawEnrollments: rawEnrollments || [],
      enrollmentError: enrollError?.message || null,
      studentChecks,
      joinResult: joinResult || [],
      joinError: joinError?.message || null,
      leftJoinResult: leftJoinResult || [],
      leftJoinError: leftJoinError?.message || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});



// Add this debug endpoint right after your existing course endpoints
app.get('/api/debug/course-students/:courseId', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log('🔍 Debug: Checking course students for:', courseId);
    console.log('🔍 Professor ID:', req.user.id);
    
    // Check if course exists and belongs to professor
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    console.log('📚 Course found:', !!course);
    console.log('📚 Course error:', courseError?.message);
    
    if (course) {
      console.log('📚 Course details:', {
        id: course.id,
        name: course.course_name,
        professor_id: course.professor_id
      });
    }
    
    // Check course_students table
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_students')
      .select('*')
      .eq('course_id', courseId);
    
    console.log('👨‍🎓 Raw enrollments:', enrollments);
    console.log('👨‍🎓 Enrollment error:', enrollError?.message);
    
    // Check with join
    const { data: studentsWithInfo, error: joinError } = await supabase
      .from('course_students')
      .select(`
        *,
        studentaccounts!inner(first_name, last_name, student_number, program, year_level)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true);
    
    console.log('👨‍🎓 Students with info:', studentsWithInfo);
    console.log('👨‍🎓 Join error:', joinError?.message);
    
    res.json({
      courseId,
      professorId: req.user.id,
      course: course || null,
      courseError: courseError?.message || null,
      rawEnrollments: enrollments || [],
      enrollmentError: enrollError?.message || null,
      studentsWithInfo: studentsWithInfo || [],
      joinError: joinError?.message || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Serve profile images from storage - handle full path format
app.get('/api/files/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    const fullPath = `${userId}/${filename}`;
    
    console.log('📸 File request (full path):', { fullPath });
    
    // Define bucket priority order
    const buckets = [
      'studentaccounts',
      'pending_studentaccounts',
      'professoraccounts', 
      'pending_professoraccounts'
    ];
    
    let file = null;
    let successBucket = null;
    
    // Try each bucket in order
    for (const bucketName of buckets) {
      console.log(`📸 Trying: ${bucketName}/${fullPath}`);
      
      try {
        const result = await supabase.storage
          .from(bucketName)
          .download(fullPath);
        
        if (result.data && !result.error) {
          file = result.data;
          successBucket = bucketName;
          console.log(`✅ Found in: ${bucketName}`);
          break;
        }
      } catch (bucketError) {
        console.log(`❌ ${bucketName}: ${bucketError.message}`);
        continue;
      }
    }
    
    if (!file) {
      console.log('❌ File not found in any bucket:', fullPath);
      return res.status(404).json({ 
        error: 'File not found',
        path: fullPath,
        buckets: buckets
      });
    }
    
    // Set appropriate content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }[ext] || 'image/jpeg';
    
    console.log(`✅ Serving: ${filename} from ${successBucket}`);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('📸 File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Legacy endpoint removed - using the main endpoint above
  

// Debug endpoint to check storage structure
app.get('/api/debug/storage-files/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Checking storage for user:', userId);
    
    const buckets = ['studentaccounts', 'professoraccounts', 'pending_studentaccounts', 'pending_professoraccounts'];
    const results = {};
    
    for (const bucket of buckets) {
      console.log(`📁 Checking bucket: ${bucket}`);
      
      try {
        // List files in user folder
        const { data: files, error } = await supabase.storage
          .from(bucket)
          .list(userId);
        
        results[bucket] = {
          success: !error,
          error: error?.message || null,
          files: files || [],
          fileCount: files?.length || 0
        };
        
        console.log(`📁 ${bucket}:`, {
          success: !error,
          fileCount: files?.length || 0,
          files: files?.map(f => f.name) || []
        });
        
      } catch (bucketError) {
        results[bucket] = {
          success: false,
          error: bucketError.message,
          files: [],
          fileCount: 0
        };
      }
    }
    
    res.json({
      userId,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Storage debug error:', error);
    res.status(500).json({ error: error.message });
  }
});
































// Debug endpoint to check student data
app.get('/api/debug/check-student-data/:courseId', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('🔍 === STUDENT DATA DEBUG ===');
    
    // Get course_students entries
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_students')
      .select('*')
      .eq('course_id', courseId);
    
    console.log('📝 Course enrollments:', enrollments);
    
    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        console.log(`🔍 Checking student ID: ${enrollment.student_id}`);
        
        // Check in studentaccounts
        const { data: student, error: studentError } = await supabase
          .from('studentaccounts')
          .select('*')
          .eq('id', enrollment.student_id)
          .single();
        
        console.log(`👤 Student ${enrollment.student_id}:`, {
          exists: !!student,
          error: studentError?.message || 'none',
          data: student ? {
            name: `${student.first_name} ${student.last_name}`,
            student_number: student.student_number,
            email: student.email
          } : null
        });
        
        // If not found, check in pending_studentaccounts
        if (!student) {
          const { data: pendingStudent, error: pendingError } = await supabase
            .from('pending_studentaccounts')
            .select('*')
            .eq('id', enrollment.student_id)
            .single();
          
          console.log(`⏳ Pending student ${enrollment.student_id}:`, {
            exists: !!pendingStudent,
            error: pendingError?.message || 'none',
            data: pendingStudent ? {
              name: `${pendingStudent.first_name} ${pendingStudent.last_name}`,
              student_number: pendingStudent.student_number,
              email: pendingStudent.email
            } : null
          });
        }
      }
    }
    
    res.json({
      enrollments: enrollments || [],
      enrollmentCount: enrollments?.length || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Group Complete (including all related data AND the group itself)
app.delete('/api/professor/course/:courseId/groups/:groupId/delete-complete', authenticateProfessor, async (req, res) => {
  try {
    const { courseId, groupId } = req.params;
    
    console.log('🗑️ === DELETE GROUP COMPLETE START ===');
    console.log('🗑️ Course ID:', courseId);
    console.log('🗑️ Group ID:', groupId);
    console.log('🗑️ Professor ID:', req.user.id);
    
    // Create fresh connection
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-request-id': `delete-group-complete-${Date.now()}`
          }
        }
      }
    );

    // Verify professor owns the course and group exists
    const { data: group, error: groupError } = await freshSupabase
      .from('course_groups')
      .select(`
        *,
        courses!inner(course_id, professor_id)
      `)
      .eq('id', groupId)
      .eq('courses.course_id', courseId)
      .eq('courses.professor_id', req.user.id)
      .single();
    
    if (groupError || !group) {
      console.error('❌ Group not found or unauthorized:', groupError);
      return res.status(403).json({ error: 'Unauthorized or group not found' });
    }

    console.log('✅ Group found:', group.group_name);

    // Track deletion results
    const deletionResults = {
      phaseDeliverableSubmissions: 0,
      projectDeliverableSubmissions: 0,
      phaseEvaluationSubmissions: 0,
      projectEvaluationSubmissions: 0,
      taskSubmissions: 0,
      frozenTaskSubmissions: 0,
      revisionSubmissions: 0,
      taskAssignments: 0,
      taskGrades: 0,
      individualGrades: 0,
      notifications: 0,
      feedback: 0,
      groupMembers: 0,
      group: 0
    };

    // 1. Delete phase_deliverable_submissions (with their grades and evaluations embedded)
    const { data: phaseSubmissions, error: phaseSubError } = await freshSupabase
      .from('phase_deliverable_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!phaseSubError && phaseSubmissions) {
      deletionResults.phaseDeliverableSubmissions = phaseSubmissions.length;
      console.log(`🗑️ Deleted ${phaseSubmissions.length} phase deliverable submissions`);
    } else if (phaseSubError) {
      console.error('❌ Error deleting phase submissions:', phaseSubError);
    }

    // 2. Delete project_deliverable_submissions (with their grades and phase deliverables embedded)
    const { data: projectSubmissions, error: projectSubError } = await freshSupabase
      .from('project_deliverable_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!projectSubError && projectSubmissions) {
      deletionResults.projectDeliverableSubmissions = projectSubmissions.length;
      console.log(`🗑️ Deleted ${projectSubmissions.length} project deliverable submissions`);
    } else if (projectSubError) {
      console.error('❌ Error deleting project submissions:', projectSubError);
    }

    // 3. Delete phase_evaluation_submissions
    const { data: evalSubmissions, error: evalSubError } = await freshSupabase
      .from('phase_evaluation_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!evalSubError && evalSubmissions) {
      deletionResults.phaseEvaluationSubmissions = evalSubmissions.length;
      console.log(`🗑️ Deleted ${evalSubmissions.length} phase evaluation submissions`);
    } else if (evalSubError) {
      console.error('❌ Error deleting evaluation submissions:', evalSubError);
    }

    // 4. Delete project_evaluation_submissions (peer/self evaluations for entire project)
    const { data: projectEvalSubmissions, error: projectEvalSubError } = await freshSupabase
      .from('project_evaluation_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!projectEvalSubError && projectEvalSubmissions) {
      deletionResults.projectEvaluationSubmissions = projectEvalSubmissions.length;
      console.log(`🗑️ Deleted ${projectEvalSubmissions.length} project evaluation submissions`);
    } else if (projectEvalSubError) {
      console.error('❌ Error deleting project evaluation submissions:', projectEvalSubError);
    }

    // 5. Delete revision_submissions (linked to tasks assigned to group)
    const { data: revisionSubmissions, error: revisionError } = await freshSupabase
      .from('revision_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!revisionError && revisionSubmissions) {
      deletionResults.revisionSubmissions = revisionSubmissions.length;
      console.log(`🗑️ Deleted ${revisionSubmissions.length} revision submissions`);
    } else if (revisionError) {
      console.error('❌ Error deleting revision submissions:', revisionError);
    }

    // 6. Delete task_submissions (individual member submissions)
    const { data: taskSubmissions, error: taskSubError } = await freshSupabase
      .from('task_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!taskSubError && taskSubmissions) {
      deletionResults.taskSubmissions = taskSubmissions.length;
      console.log(`🗑️ Deleted ${taskSubmissions.length} task submissions`);
    } else if (taskSubError) {
      console.error('❌ Error deleting task submissions:', taskSubError);
    }

    // 7. Delete frozen_task_submissions
    const { data: frozenSubmissions, error: frozenError } = await freshSupabase
      .from('frozen_task_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!frozenError && frozenSubmissions) {
      deletionResults.frozenTaskSubmissions = frozenSubmissions.length;
      console.log(`🗑️ Deleted ${frozenSubmissions.length} frozen task submissions`);
    } else if (frozenError) {
      console.error('❌ Error deleting frozen submissions:', frozenError);
    }

    // 8. Delete task_grades (individual task grades for group members)
    const { data: taskGrades, error: taskGradesError } = await freshSupabase
      .from('task_grades')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!taskGradesError && taskGrades) {
      deletionResults.taskGrades = taskGrades.length;
      console.log(`🗑️ Deleted ${taskGrades.length} task grades`);
    } else if (taskGradesError) {
      console.error('❌ Error deleting task grades:', taskGradesError);
    }

    // 9. Delete individual_grades (if they have group_id or are linked to task_submissions)
    const { data: individualGrades, error: individualGradesError } = await freshSupabase
      .from('individual_grades')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!individualGradesError && individualGrades) {
      deletionResults.individualGrades = individualGrades.length;
      console.log(`🗑️ Deleted ${individualGrades.length} individual grades`);
    } else if (individualGradesError) {
      console.error('❌ Error deleting individual grades:', individualGradesError);
    }

    // 10. Delete task_assignments for the group
    const { data: taskAssignments, error: taskAssignError} = await freshSupabase
      .from('task_assignments')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!taskAssignError && taskAssignments) {
      deletionResults.taskAssignments = taskAssignments.length;
      console.log(`🗑️ Deleted ${taskAssignments.length} task assignments`);
    } else if (taskAssignError) {
      console.error('❌ Error deleting task assignments:', taskAssignError);
    }

    // 11. Delete notifications related to this group
    const { data: notifications, error: notifError } = await freshSupabase
      .from('notifications')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!notifError && notifications) {
      deletionResults.notifications = notifications.length;
      console.log(`🗑️ Deleted ${notifications.length} notifications`);
    } else if (notifError) {
      console.error('❌ Error deleting notifications:', notifError);
    }

    // 12. Delete feedback related to this group (if feedback table has group_id)
    const { data: feedback, error: feedbackError } = await freshSupabase
      .from('feedback')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!feedbackError && feedback) {
      deletionResults.feedback = feedback.length;
      console.log(`🗑️ Deleted ${feedback.length} feedback records`);
    } else if (feedbackError) {
      console.error('❌ Error deleting feedback:', feedbackError);
    }

    // 13. Delete course_group_members
    const { data: members, error: membersError } = await freshSupabase
      .from('course_group_members')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!membersError && members) {
      deletionResults.groupMembers = members.length;
      console.log(`🗑️ Deleted ${members.length} group members`);
    } else if (membersError) {
      console.error('❌ Error deleting group members:', membersError);
    }

    // 14. Finally, delete the group itself
    const { data: deletedGroup, error: deleteGroupError } = await freshSupabase
      .from('course_groups')
      .delete()
      .eq('id', groupId)
      .select('id');
    
    if (!deleteGroupError && deletedGroup) {
      deletionResults.group = deletedGroup.length;
      console.log(`🗑️ Deleted group: ${group.group_name}`);
    } else if (deleteGroupError) {
      console.error('❌ Error deleting group:', deleteGroupError);
      return res.status(500).json({ error: 'Failed to delete group structure', details: deleteGroupError });
    }

    const totalDeleted = Object.values(deletionResults).reduce((sum, count) => sum + count, 0);
    
    console.log('🎉 === DELETE GROUP COMPLETE FINISHED ===');
    console.log('🎉 Total records deleted:', totalDeleted);
    console.log('🎉 Deletion summary:', deletionResults);

    res.json({
      success: true,
      message: `Group "${group.group_name}" and all related data deleted successfully`,
      groupName: group.group_name,
      deletionSummary: deletionResults,
      totalDeleted: totalDeleted
    });

  } catch (error) {
    console.error('💥 Delete group complete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Group Related Data (but keep group structure)
app.delete('/api/professor/course/:courseId/groups/:groupId/delete-related-data', authenticateProfessor, async (req, res) => {
  try {
    const { courseId, groupId } = req.params;
    
    console.log('🗑️ === DELETE GROUP RELATED DATA START ===');
    console.log('🗑️ Course ID:', courseId);
    console.log('🗑️ Group ID:', groupId);
    console.log('🗑️ Professor ID:', req.user.id);
    
    // Create fresh connection
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-request-id': `delete-group-data-${Date.now()}`
          }
        }
      }
    );

    // Verify professor owns the course and group exists
    const { data: group, error: groupError } = await freshSupabase
      .from('course_groups')
      .select(`
        *,
        courses!inner(course_id, professor_id)
      `)
      .eq('id', groupId)
      .eq('courses.course_id', courseId)
      .eq('courses.professor_id', req.user.id)
      .single();
    
    if (groupError || !group) {
      return res.status(403).json({ error: 'Unauthorized or group not found' });
    }

    console.log('✅ Group found:', group.group_name);

    // Start transaction-like operations
    const deletionResults = {
      taskSubmissions: 0,
      frozenTaskSubmissions: 0,
      projectSubmissions: 0,
      revisionSubmissions: 0,
      notifications: 0,
      grades: 0,
      feedback: 0
    };

    // 1. Delete task submissions
    const { data: taskSubmissions, error: taskSubError } = await freshSupabase
      .from('task_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!taskSubError && taskSubmissions) {
      deletionResults.taskSubmissions = taskSubmissions.length;
      console.log(`🗑️ Deleted ${taskSubmissions.length} task submissions`);
    }

    // 2. Delete frozen task submissions
    const { data: frozenSubmissions, error: frozenError } = await freshSupabase
      .from('frozen_task_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!frozenError && frozenSubmissions) {
      deletionResults.frozenTaskSubmissions = frozenSubmissions.length;
      console.log(`🗑️ Deleted ${frozenSubmissions.length} frozen task submissions`);
    }

    // 3. Delete project submissions
    const { data: projectSubmissions, error: projectSubError } = await freshSupabase
      .from('project_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!projectSubError && projectSubmissions) {
      deletionResults.projectSubmissions = projectSubmissions.length;
      console.log(`🗑️ Deleted ${projectSubmissions.length} project submissions`);
    }

    // 4. Delete revision submissions
    const { data: revisionSubmissions, error: revisionError } = await freshSupabase
      .from('revision_submissions')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!revisionError && revisionSubmissions) {
      deletionResults.revisionSubmissions = revisionSubmissions.length;
      console.log(`🗑️ Deleted ${revisionSubmissions.length} revision submissions`);
    }

    // 5. Delete notifications related to this group
    const { data: notifications, error: notifError } = await freshSupabase
      .from('notifications')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!notifError && notifications) {
      deletionResults.notifications = notifications.length;
      console.log(`🗑️ Deleted ${notifications.length} notifications`);
    }

    // 6. Delete grades related to this group
    const { data: grades, error: gradesError } = await freshSupabase
      .from('grades')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!gradesError && grades) {
      deletionResults.grades = grades.length;
      console.log(`🗑️ Deleted ${grades.length} grades`);
    }

    // 7. Delete feedback related to this group
    const { data: feedback, error: feedbackError } = await freshSupabase
      .from('feedback')
      .delete()
      .eq('group_id', groupId)
      .select('id');
    
    if (!feedbackError && feedback) {
      deletionResults.feedback = feedback.length;
      console.log(`🗑️ Deleted ${feedback.length} feedback records`);
    }

    // Reset group member count to 0 (but keep the group structure)
    const { error: resetError } = await freshSupabase
      .from('course_groups')
      .update({ 
        current_member_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    if (resetError) {
      console.error('❌ Error resetting group member count:', resetError);
    } else {
      console.log('✅ Reset group member count to 0');
    }

    const totalDeleted = Object.values(deletionResults).reduce((sum, count) => sum + count, 0);
    
    console.log('🎉 === DELETE GROUP RELATED DATA COMPLETE ===');
    console.log('🎉 Total records deleted:', totalDeleted);
    console.log('🎉 Deletion summary:', deletionResults);

    res.json({
      message: 'Group related data deleted successfully',
      groupName: group.group_name,
      deletionSummary: deletionResults,
      totalDeleted: totalDeleted
    });

  } catch (error) {
    console.error('💥 Delete group data error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Add these endpoints to your existing server file

// =================== PROJECT MANAGEMENT ENDPOINTS ===================

// =================== PROFESSOR ENDPOINTS ===================

// Delete Project
app.delete('/api/professor/course/:courseId/projects/:projectId', authenticateProfessor, async (req, res) => {
  try {
    const { courseId, projectId } = req.params;
    
    console.log('🗑️ === DELETE PROJECT START ===');
    console.log('🗑️ Course ID:', courseId);
    console.log('🗑️ Project ID:', projectId);
    console.log('🗑️ Professor ID:', req.user.id);

    // Create fresh connection
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-request-id': `delete-project-${Date.now()}`
          }
        }
      }
    );

    console.log('🔍 Debug info:');
    console.log('🔍 Project ID:', projectId);
    console.log('🔍 Course ID:', courseId);
    console.log('🔍 Professor ID:', req.user.id);

    // Verify professor owns the course and project exists
    const { data: project, error: projectError } = await freshSupabase
      .from('projects')
      .select(`
        *,
        courses!inner(professor_id)
      `)
      .eq('id', projectId)
      .eq('course_id', courseId)
      .eq('courses.professor_id', req.user.id)
      .single();
    
    console.log('🔍 Project query result:', { project, projectError });
    
    if (projectError || !project) {
      console.log('❌ Authorization failed:', projectError);
      return res.status(403).json({ error: 'Unauthorized or project not found' });
    }

    console.log('✅ Project found:', project.title);

    // Check if project has submissions
    const { data: projectSubmissions, error: projectSubError } = await freshSupabase
      .from('project_submissions')
      .select('id')
      .eq('project_id', projectId);

    if (projectSubError) {
      console.warn('Warning checking project submissions:', projectSubError);
    }

    const hasProjectSubmissions = projectSubmissions && projectSubmissions.length > 0;

    // Check if project has phase submissions
    const { data: phaseSubmissions, error: phaseSubError } = await freshSupabase
      .from('phase_submissions')
      .select('id')
      .in('phase_id', 
        await freshSupabase
          .from('project_phases')
          .select('id')
          .eq('project_id', projectId)
          .then(result => result.data?.map(p => p.id) || [])
      );

    if (phaseSubError) {
      console.warn('Warning checking phase submissions:', phaseSubError);
    }

    const hasPhaseSubmissions = phaseSubmissions && phaseSubmissions.length > 0;

    // Check if project has task submissions
    const { data: taskSubmissions, error: taskSubError } = await freshSupabase
      .from('task_submissions')
      .select('id')
      .in('task_id',
        await freshSupabase
          .from('tasks')
          .select('id')
          .in('phase_id',
            await freshSupabase
              .from('project_phases')
              .select('id')
              .eq('project_id', projectId)
              .then(result => result.data?.map(p => p.id) || [])
          )
          .then(result => result.data?.map(t => t.id) || [])
      );

    if (taskSubError) {
      console.warn('Warning checking task submissions:', taskSubError);
    }

    const hasTaskSubmissions = taskSubmissions && taskSubmissions.length > 0;

    // Log submission counts for information (but don't block deletion)
    console.log('📊 Project submission counts:', {
      projectSubmissions: hasProjectSubmissions ? projectSubmissions.length : 0,
      phaseSubmissions: hasPhaseSubmissions ? phaseSubmissions.length : 0,
      taskSubmissions: hasTaskSubmissions ? taskSubmissions.length : 0
    });

    // Start deletion process
    const deletionResults = {
      taskFeedback: 0,
      individualGrades: 0,
      groupGrades: 0,
      taskGrades: 0,
      revisionSubmissions: 0,
      frozenTaskSubmissions: 0,
      taskSubmissions: 0,
      phaseSubmissions: 0,
      evaluationForms: 0,
      projectRubricCriteria: 0,
      projectEvaluationCriteria: 0,
      phaseRubricCriteria: 0,
      phaseEvaluationCriteria: 0,
      phaseRubrics: 0,
      phaseEvaluationForms: 0,
      projectRubrics: 0,
      projectEvaluationForms: 0,
      tasks: 0,
      projectPhases: 0,
      project: 0,
      fileStorageCleanup: 0
    };

    // Get all IDs we'll need for cascading deletions
    const { data: phaseIds, error: phaseIdsError } = await freshSupabase
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId);
    
    if (phaseIdsError) {
      console.warn('Warning getting phase IDs:', phaseIdsError);
    }
    
    const phaseIdList = phaseIds?.map(p => p.id) || [];
    
    // Get task IDs
    const { data: taskIds, error: taskIdsError } = await freshSupabase
      .from('tasks')
      .select('id')
      .in('phase_id', phaseIdList);
    
    if (taskIdsError) {
      console.warn('Warning getting task IDs:', taskIdsError);
    }
    
    const taskIdList = taskIds?.map(t => t.id) || [];
    
    // Get task submission IDs
    const { data: taskSubmissionIds, error: taskSubmissionIdsError } = await freshSupabase
      .from('task_submissions')
      .select('id')
      .in('task_id', taskIdList);
    
    if (taskSubmissionIdsError) {
      console.warn('Warning getting task submission IDs:', taskSubmissionIdsError);
    }
    
    const taskSubmissionIdList = taskSubmissionIds?.map(s => s.id) || [];
    
    // Get revision submission IDs
    const { data: revisionSubmissionIds, error: revisionSubmissionIdsError } = await freshSupabase
      .from('revision_submissions')
      .select('id')
      .in('task_id', taskIdList);
    
    if (revisionSubmissionIdsError) {
      console.warn('Warning getting revision submission IDs:', revisionSubmissionIdsError);
    }
    
    const revisionSubmissionIdList = revisionSubmissionIds?.map(r => r.id) || [];
    
    // Get phase submission IDs
    const { data: phaseSubmissionIds, error: phaseSubmissionIdsError } = await freshSupabase
      .from('phase_submissions')
      .select('id')
      .in('phase_id', phaseIdList);
    
    if (phaseSubmissionIdsError) {
      console.warn('Warning getting phase submission IDs:', phaseSubmissionIdsError);
    }
    
    const phaseSubmissionIdList = phaseSubmissionIds?.map(p => p.id) || [];
    
    // Get project submission IDs
    const { data: projectSubmissionIds, error: projectSubmissionIdsError } = await freshSupabase
      .from('project_submissions')
      .select('id')
      .eq('project_id', projectId);
    
    if (projectSubmissionIdsError) {
      console.warn('Warning getting project submission IDs:', projectSubmissionIdsError);
    }
    
    const projectSubmissionIdList = projectSubmissionIds?.map(p => p.id) || [];

    // 1. Delete task feedback (references task_submissions and revision_submissions)
    const { data: taskFeedback, error: taskFeedbackError } = await freshSupabase
      .from('task_feedback')
      .delete()
      .or(`submission_id.in.(${taskSubmissionIdList.join(',')}),revision_submission_id.in.(${revisionSubmissionIdList.join(',')})`)
      .select('id');
    
    if (!taskFeedbackError && taskFeedback) {
      deletionResults.taskFeedback = taskFeedback.length;
      console.log(`🗑️ Deleted ${taskFeedback.length} task feedback entries`);
    }

    // 2. Delete individual grades (references task_submissions, phase_submissions, project_submissions)
    const { data: individualGrades, error: individualGradesError } = await freshSupabase
      .from('individual_grades')
      .delete()
      .or(`project_id.eq.${projectId},phase_id.in.(${phaseIdList.join(',')}),task_submission_id.in.(${taskSubmissionIdList.join(',')}),phase_submission_id.in.(${phaseSubmissionIdList.join(',')}),project_submission_id.in.(${projectSubmissionIdList.join(',')})`)
      .select('id');
    
    if (!individualGradesError && individualGrades) {
      deletionResults.individualGrades = individualGrades.length;
      console.log(`🗑️ Deleted ${individualGrades.length} individual grades`);
    }

    // 3. Delete group grades (references phase_submissions, project_submissions)
    const { data: groupGrades, error: groupGradesError } = await freshSupabase
      .from('group_grades')
      .delete()
      .or(`project_id.eq.${projectId},phase_id.in.(${phaseIdList.join(',')}),phase_submission_id.in.(${phaseSubmissionIdList.join(',')}),project_submission_id.in.(${projectSubmissionIdList.join(',')})`)
      .select('id');
    
    if (!groupGradesError && groupGrades) {
      deletionResults.groupGrades = groupGrades.length;
      console.log(`🗑️ Deleted ${groupGrades.length} group grades`);
    }

    // 4. Delete task grades (references tasks)
    const { data: taskGrades, error: taskGradesError } = await freshSupabase
      .from('task_grades')
      .delete()
      .in('task_id', taskIdList)
      .select('id');
    
    if (!taskGradesError && taskGrades) {
      deletionResults.taskGrades = taskGrades.length;
      console.log(`🗑️ Deleted ${taskGrades.length} task grades`);
    }

    // 5. Delete revision submissions (references task_submissions)
    const { data: revisionSubmissions, error: revisionSubmissionsError } = await freshSupabase
      .from('revision_submissions')
      .delete()
      .in('task_id', taskIdList)
      .select('id');
    
    if (!revisionSubmissionsError && revisionSubmissions) {
      deletionResults.revisionSubmissions = revisionSubmissions.length;
      console.log(`🗑️ Deleted ${revisionSubmissions.length} revision submissions`);
    }

    // 6. Delete frozen task submissions (references task_submissions, phases)
    const { data: frozenTaskSubmissions, error: frozenTaskSubmissionsError } = await freshSupabase
      .from('frozen_task_submissions')
      .delete()
      .in('phase_id', phaseIdList)
      .select('id');
    
    if (!frozenTaskSubmissionsError && frozenTaskSubmissions) {
      deletionResults.frozenTaskSubmissions = frozenTaskSubmissions.length;
      console.log(`🗑️ Deleted ${frozenTaskSubmissions.length} frozen task submissions`);
    }

    // 7. Delete task submissions (references tasks)
    const { data: taskSubmissionsDeleted, error: taskSubmissionsError } = await freshSupabase
      .from('task_submissions')
      .delete()
      .in('task_id', taskIdList)
      .select('id');
    
    if (!taskSubmissionsError && taskSubmissionsDeleted) {
      deletionResults.taskSubmissions = taskSubmissionsDeleted.length;
      console.log(`🗑️ Deleted ${taskSubmissionsDeleted.length} task submissions`);
    }

    // 8. Delete phase submissions (references project_phases)
    const { data: phaseSubmissionsDeleted, error: phaseSubmissionsError } = await freshSupabase
      .from('phase_submissions')
      .delete()
      .in('phase_id', phaseIdList)
      .select('id');
    
    if (!phaseSubmissionsError && phaseSubmissionsDeleted) {
      deletionResults.phaseSubmissions = phaseSubmissionsDeleted.length;
      console.log(`🗑️ Deleted ${phaseSubmissionsDeleted.length} phase submissions`);
    }

    // 9. Delete evaluation forms (references project_phases)
    const { data: evaluationForms, error: evaluationFormsError } = await freshSupabase
      .from('evaluation_forms')
      .delete()
      .in('phase_id', phaseIdList)
      .select('id');
    
    if (!evaluationFormsError && evaluationForms) {
      deletionResults.evaluationForms = evaluationForms.length;
      console.log(`🗑️ Deleted ${evaluationForms.length} evaluation forms`);
    }

    // 10. Delete project submissions (references projects)
    const { data: projectSubmissionsDeleted, error: projectSubmissionsError } = await freshSupabase
      .from('project_submissions')
      .delete()
      .eq('project_id', projectId)
      .select('id');
    
    if (!projectSubmissionsError && projectSubmissionsDeleted) {
      deletionResults.projectSubmissions = projectSubmissionsDeleted.length;
      console.log(`🗑️ Deleted ${projectSubmissionsDeleted.length} project submissions`);
    }

    // 11. Delete project rubric criteria
    // First get project rubric IDs
    const { data: projectRubricIds, error: projectRubricIdsError } = await freshSupabase
      .from('project_rubrics')
      .select('id')
      .eq('project_id', projectId);
    
    if (projectRubricIdsError) {
      console.warn('Warning getting project rubric IDs:', projectRubricIdsError);
    }
    
    const projectRubricIdList = projectRubricIds?.map(r => r.id) || [];
    
    // Delete project rubric criteria
    const { data: projectRubricCriteria, error: projectRubricCriteriaError } = await freshSupabase
      .from('project_rubric_criteria')
      .delete()
      .in('project_rubric_id', projectRubricIdList)
      .select('id');
    
    if (!projectRubricCriteriaError && projectRubricCriteria) {
      deletionResults.projectRubricCriteria = projectRubricCriteria.length;
      console.log(`🗑️ Deleted ${projectRubricCriteria.length} project rubric criteria`);
    }

    // 12. Delete project evaluation criteria
    // Get project evaluation form IDs
    const { data: projectEvaluationFormIds, error: projectEvaluationFormIdsError } = await freshSupabase
      .from('project_evaluation_forms')
      .select('id')
      .eq('project_id', projectId);
    
    if (projectEvaluationFormIdsError) {
      console.warn('Warning getting project evaluation form IDs:', projectEvaluationFormIdsError);
    }
    
    const projectEvaluationFormIdList = projectEvaluationFormIds?.map(e => e.id) || [];
    
    // Delete project evaluation criteria
    const { data: projectEvaluationCriteria, error: projectEvaluationCriteriaError } = await freshSupabase
      .from('project_evaluation_criteria')
      .delete()
      .in('project_evaluation_form_id', projectEvaluationFormIdList)
      .select('id');
    
    if (!projectEvaluationCriteriaError && projectEvaluationCriteria) {
      deletionResults.projectEvaluationCriteria = projectEvaluationCriteria.length;
      console.log(`🗑️ Deleted ${projectEvaluationCriteria.length} project evaluation criteria`);
    }

    // 13. Delete phase rubric criteria
    // Get phase rubric IDs
    const { data: phaseRubricIds, error: phaseRubricIdsError } = await freshSupabase
      .from('phase_rubrics')
      .select('id')
      .in('phase_id', phaseIdList);
    
    if (phaseRubricIdsError) {
      console.warn('Warning getting phase rubric IDs:', phaseRubricIdsError);
    }
    
    const phaseRubricIdList = phaseRubricIds?.map(r => r.id) || [];
    
    // Delete phase rubric criteria
    const { data: phaseRubricCriteria, error: phaseRubricCriteriaError } = await freshSupabase
      .from('phase_rubric_criteria')
      .delete()
      .in('phase_rubric_id', phaseRubricIdList)
      .select('id');
    
    if (!phaseRubricCriteriaError && phaseRubricCriteria) {
      deletionResults.phaseRubricCriteria = phaseRubricCriteria.length;
      console.log(`🗑️ Deleted ${phaseRubricCriteria.length} phase rubric criteria`);
    }

    // 14. Delete phase evaluation criteria
    // Get phase evaluation form IDs
    const { data: phaseEvaluationFormIds, error: phaseEvaluationFormIdsError } = await freshSupabase
      .from('phase_evaluation_forms')
      .select('id')
      .in('phase_id', phaseIdList);
    
    if (phaseEvaluationFormIdsError) {
      console.warn('Warning getting phase evaluation form IDs:', phaseEvaluationFormIdsError);
    }
    
    const phaseEvaluationFormIdList = phaseEvaluationFormIds?.map(e => e.id) || [];
    
    // Delete phase evaluation criteria
    const { data: phaseEvaluationCriteria, error: phaseEvaluationCriteriaError } = await freshSupabase
      .from('phase_evaluation_criteria')
      .delete()
      .in('phase_evaluation_form_id', phaseEvaluationFormIdList)
      .select('id');
    
    if (!phaseEvaluationCriteriaError && phaseEvaluationCriteria) {
      deletionResults.phaseEvaluationCriteria = phaseEvaluationCriteria.length;
      console.log(`🗑️ Deleted ${phaseEvaluationCriteria.length} phase evaluation criteria`);
    }

    // 15. Delete phase rubrics
    const { data: phaseRubrics, error: phaseRubricsError } = await freshSupabase
      .from('phase_rubrics')
      .delete()
      .in('phase_id', phaseIdList)
      .select('id');
    
    if (!phaseRubricsError && phaseRubrics) {
      deletionResults.phaseRubrics = phaseRubrics.length;
      console.log(`🗑️ Deleted ${phaseRubrics.length} phase rubrics`);
    }

    // 16. Delete phase evaluation forms
    const { data: phaseEvaluationForms, error: phaseEvaluationFormsError } = await freshSupabase
      .from('phase_evaluation_forms')
      .delete()
      .in('phase_id', phaseIdList)
      .select('id');
    
    if (!phaseEvaluationFormsError && phaseEvaluationForms) {
      deletionResults.phaseEvaluationForms = phaseEvaluationForms.length;
      console.log(`🗑️ Deleted ${phaseEvaluationForms.length} phase evaluation forms`);
    }

    // 17. Delete project rubrics
    const { data: projectRubrics, error: projectRubricsError } = await freshSupabase
      .from('project_rubrics')
      .delete()
      .eq('project_id', projectId)
      .select('id');
    
    if (!projectRubricsError && projectRubrics) {
      deletionResults.projectRubrics = projectRubrics.length;
      console.log(`🗑️ Deleted ${projectRubrics.length} project rubrics`);
    }

    // 18. Delete project evaluation forms
    const { data: projectEvaluationForms, error: projectEvaluationFormsError } = await freshSupabase
      .from('project_evaluation_forms')
      .delete()
      .eq('project_id', projectId)
      .select('id');
    
    if (!projectEvaluationFormsError && projectEvaluationForms) {
      deletionResults.projectEvaluationForms = projectEvaluationForms.length;
      console.log(`🗑️ Deleted ${projectEvaluationForms.length} project evaluation forms`);
    }

    // 19. Delete tasks
    const { data: tasks, error: tasksError } = await freshSupabase
      .from('tasks')
      .delete()
      .in('phase_id', phaseIdList)
      .select('id');
    
    if (!tasksError && tasks) {
      deletionResults.tasks = tasks.length;
      console.log(`🗑️ Deleted ${tasks.length} tasks`);
    }

    // 20. Delete project phases
    const { data: projectPhases, error: projectPhasesError } = await freshSupabase
      .from('project_phases')
      .delete()
      .eq('project_id', projectId)
      .select('id');
    
    if (!projectPhasesError && projectPhases) {
      deletionResults.projectPhases = projectPhases.length;
      console.log(`🗑️ Deleted ${projectPhases.length} project phases`);
    }

    // 21. Finally, delete the project
    const { data: deletedProject, error: projectDeleteError } = await freshSupabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .select('id');
    
    if (projectDeleteError) {
      console.error('❌ Error deleting project:', projectDeleteError);
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    if (deletedProject && deletedProject.length > 0) {
      deletionResults.project = 1;
      console.log(`🗑️ Deleted project: ${project.title}`);
    }

    // 22. File storage cleanup
    try {
      console.log('📁 Starting file storage cleanup...');
      let totalFilesDeleted = 0;
      
      // Define buckets to check for project-related files
      const bucketsToCheck = [
        'task-submissions',
        'phase-submissions', 
        'project-submissions'
      ];
      
      // Get all file paths from submissions that were deleted
      const filePathsToDelete = [];
      
      // Collect file paths from task submissions
      if (taskSubmissionIdList.length > 0) {
        const { data: taskSubmissionFiles, error: taskFilesError } = await freshSupabase
          .from('task_submissions')
          .select('file_paths')
          .in('id', taskSubmissionIdList);
        
        if (!taskFilesError && taskSubmissionFiles) {
          taskSubmissionFiles.forEach(submission => {
            if (submission.file_paths && Array.isArray(submission.file_paths)) {
              submission.file_paths.forEach(filePath => {
                if (filePath) filePathsToDelete.push(`task-submissions/${filePath}`);
              });
            }
          });
        }
      }
      
      // Collect file paths from phase submissions
      if (phaseSubmissionIdList.length > 0) {
        const { data: phaseSubmissionFiles, error: phaseFilesError } = await freshSupabase
          .from('phase_submissions')
          .select('file_paths')
          .in('id', phaseSubmissionIdList);
        
        if (!phaseFilesError && phaseSubmissionFiles) {
          phaseSubmissionFiles.forEach(submission => {
            if (submission.file_paths && Array.isArray(submission.file_paths)) {
              submission.file_paths.forEach(filePath => {
                if (filePath) filePathsToDelete.push(`phase-submissions/${filePath}`);
              });
            }
          });
        }
      }
      
      // Collect file paths from project submissions
      if (projectSubmissionIdList.length > 0) {
        const { data: projectSubmissionFiles, error: projectFilesError } = await freshSupabase
          .from('project_submissions')
          .select('file_paths')
          .in('id', projectSubmissionIdList);
        
        if (!projectFilesError && projectSubmissionFiles) {
          projectSubmissionFiles.forEach(submission => {
            if (submission.file_paths && Array.isArray(submission.file_paths)) {
              submission.file_paths.forEach(filePath => {
                if (filePath) filePathsToDelete.push(`project-submissions/${filePath}`);
              });
            }
          });
        }
      }
      
      console.log(`📁 Found ${filePathsToDelete.length} files to delete from storage`);
      
      // Delete files from each bucket
      for (const bucketName of bucketsToCheck) {
        try {
          // Filter file paths for this bucket
          const bucketFiles = filePathsToDelete
            .filter(path => path.startsWith(`${bucketName}/`))
            .map(path => path.replace(`${bucketName}/`, ''));
          
          if (bucketFiles.length > 0) {
            console.log(`🗑️ Deleting ${bucketFiles.length} files from ${bucketName} bucket`);
            
            const { data: deleteResult, error: deleteError } = await freshSupabase.storage
              .from(bucketName)
              .remove(bucketFiles);
            
            if (deleteError) {
              console.warn(`⚠️ Error deleting files from ${bucketName}:`, deleteError);
            } else {
              const deletedCount = deleteResult?.length || bucketFiles.length;
              totalFilesDeleted += deletedCount;
              console.log(`✅ Deleted ${deletedCount} files from ${bucketName}`);
            }
          }
        } catch (bucketError) {
          console.warn(`⚠️ Error processing ${bucketName} bucket:`, bucketError);
        }
      }
      
      // Also check for any files with project-specific naming patterns
      for (const bucketName of bucketsToCheck) {
        try {
          // List all files in the bucket to find project-related files
          const { data: allFiles, error: listError } = await freshSupabase.storage
            .from(bucketName)
            .list('', { limit: 1000 });
          
          if (!listError && allFiles) {
            // Look for files that might be related to this project
            // This is a fallback for files that might not be properly tracked
            const projectRelatedFiles = allFiles.filter(file => {
              // Check if filename contains any task IDs or phase IDs from this project
              return taskIdList.some(taskId => file.name.includes(taskId)) ||
                     phaseIdList.some(phaseId => file.name.includes(phaseId)) ||
                     file.name.includes(projectId);
            });
            
            if (projectRelatedFiles.length > 0) {
              console.log(`🗑️ Found ${projectRelatedFiles.length} additional project-related files in ${bucketName}`);
              
              const { data: additionalDeleteResult, error: additionalDeleteError } = await freshSupabase.storage
                .from(bucketName)
                .remove(projectRelatedFiles.map(f => f.name));
              
              if (additionalDeleteError) {
                console.warn(`⚠️ Error deleting additional files from ${bucketName}:`, additionalDeleteError);
              } else {
                const additionalDeletedCount = additionalDeleteResult?.length || projectRelatedFiles.length;
                totalFilesDeleted += additionalDeletedCount;
                console.log(`✅ Deleted ${additionalDeletedCount} additional files from ${bucketName}`);
              }
            }
          }
        } catch (listError) {
          console.warn(`⚠️ Error listing files in ${bucketName}:`, listError);
        }
      }
      
      deletionResults.fileStorageCleanup = totalFilesDeleted;
      console.log(`📁 File storage cleanup complete: ${totalFilesDeleted} files deleted`);
      
    } catch (storageError) {
      console.warn('⚠️ Warning during file storage cleanup:', storageError);
      deletionResults.fileStorageCleanup = 0;
    }

    console.log('✅ === DELETE PROJECT COMPLETE ===');
    console.log('✅ Deletion results:', deletionResults);

    res.json({ 
      message: 'Project deleted successfully',
      projectTitle: project.title,
      deletionResults
    });

  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Project
app.post('/api/professor/course/:courseId/projects', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      startDate,
      dueDate,
      fileTypesAllowed,
      maxFileSizeMb,
      minTasksPerMember,
      maxTasksPerMember,
      breathePhaseDays,
      evaluationPhaseDays,
      projectRubricType,
      projectRubricFile,
      projectEvaluationType,
      projectEvaluationForm,
      projectEvaluationDeadline,
      project_evaluation_available_from,
      projectRubric,
      builtInEvaluation,
      phases
    } = req.body;

    console.log('🔍 Project creation request:', {
      courseId,
      title,
      startDate,
      dueDate,
      breathePhaseDays,
      evaluationPhaseDays,
      projectRubricType,
      projectEvaluationType,
      projectEvaluationDeadline,
      project_evaluation_available_from,
      phasesCount: phases?.length || 0,
      hasProjectRubricFile: !!projectRubricFile,
      hasProjectEvaluationForm: !!projectEvaluationForm
    });

    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      console.log('❌ Course verification failed:', { courseError, course });
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    console.log('✅ Course verified:', course.course_name);

    // Validate dates
    const now = new Date();
    let projectStartDate, projectDueDate;
    
    const hasTimezone = startDate.includes('Z') || /[+-]\d{2}:\d{2}$/.test(startDate) || /[+-]\d{4}$/.test(startDate);
    
    if (hasTimezone) {
      projectStartDate = new Date(startDate);
      projectDueDate = new Date(dueDate);
      
      console.log('🕐 ISO format detected (preserves timezone):', {
        inputStart: startDate,
        inputDue: dueDate,
        storedStart: projectStartDate.toISOString(),
        storedDue: projectDueDate.toISOString()
      });
    } else if (startDate.includes('T') && !startDate.includes('Z') && !startDate.includes('+') && !startDate.includes('-', 10)) {
      // Frontend sends datetime-local format like "2025-10-26T00:00:00.000"
      // Datetime-local format - store as-is without conversion
      projectStartDate = startDate;
      projectDueDate = dueDate;
      
      console.log('🕐 Datetime-local format (stored as local time, no conversion):', {
        inputStart: startDate,
        inputDue: dueDate,
        storedStart: projectStartDate,
        storedDue: projectDueDate
      });
    } else {
      projectStartDate = new Date(startDate);
      projectDueDate = new Date(dueDate);
      console.log('🕐 Using provided timezone info');
    }
    
    console.log('📅 Date validation:', {
      now: now.toISOString(),
      startDate: startDate,
      dueDate: dueDate,
      projectStartDate: projectStartDate,
      projectDueDate: projectDueDate
    });
    
    // For datetime-local strings, compare as strings
    if (typeof projectDueDate === 'string' && typeof projectStartDate === 'string') {
      if (projectDueDate <= projectStartDate) {
        console.log('❌ Due date validation failed');
        return res.status(400).json({ 
          error: 'Project due date must be after start date',
          startDate: startDate,
          dueDate: dueDate
        });
      }
    } else if (projectDueDate <= projectStartDate) {
      console.log('❌ Due date validation failed');
      return res.status(400).json({ 
        error: 'Project due date must be after start date',
        startDate: startDate,
        dueDate: dueDate
      });
    }

    console.log('✅ Date validation passed');

    // Create project
    const projectData = {
      course_id: courseId,
      title,
      description,
      // Convert to formatted datetime-local strings with Z (like breathe periods)
      // This prevents Supabase SDK from converting to Date object
      start_date: new Date(startDate).toLocaleString('sv-SE', { hour12: false }) + 'Z',
      due_date: new Date(dueDate).toLocaleString('sv-SE', { hour12: false }) + 'Z',
      breathe_phase_days: breathePhaseDays || 0,
      evaluation_phase_days: evaluationPhaseDays || 2,
      project_rubric_type: projectRubricType || 'builtin',
      project_evaluation_type: projectEvaluationType || 'builtin',
      file_types_allowed: JSON.stringify(fileTypesAllowed && fileTypesAllowed.length > 0 ? fileTypesAllowed : []),
      max_file_size_mb: maxFileSizeMb || 10,
      min_tasks_per_member: minTasksPerMember || 1,
      max_tasks_per_member: maxTasksPerMember || 5,
      evaluation_form_type: projectEvaluationType || 'builtin',
      created_by: req.user.id,
      rubric_file_url: null,
      evaluation_form_file_url: null
    };

    // Add project evaluation deadline if provided
    if (projectEvaluationDeadline && projectEvaluationDeadline.trim() !== '') {
      try {
        const deadlineDate = new Date(projectEvaluationDeadline);
        if (!isNaN(deadlineDate.getTime())) {
          projectData.project_evaluation_deadline = projectEvaluationDeadline;
          console.log('📅 Project evaluation deadline set:', projectData.project_evaluation_deadline);
        }
      } catch (dateError) {
        console.warn('Invalid project evaluation deadline format:', projectEvaluationDeadline);
      }
    }

    console.log('📝 Project data to insert:', projectData);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      return res.status(500).json({ error: projectError.message });
    }

    console.log('✅ Project created:', project.id);

    // ✅ USE FRONTEND-PROVIDED EVALUATION DATES FROM LAST PHASE
    console.log('📅 === SETTING PROJECT EVALUATION DATES ===');
    console.log('📅 Input data from frontend:', {
      project_evaluation_available_from,
      projectEvaluationDeadline,
      source: 'calculated from last phase on frontend'
    });

    let calculatedAvailableFrom = project_evaluation_available_from;
    let calculatedDeadline = projectEvaluationDeadline;
    
    // Fallback: Only recalculate if frontend didn't provide dates
    if (!calculatedAvailableFrom || !calculatedDeadline) {
      console.log('⚠️  Frontend dates missing, falling back to calculation based on project due date');
      
      const rawDueDate = dueDate;
      let dueDateForCalc;
      if (rawDueDate.includes('T')) {
        dueDateForCalc = new Date(rawDueDate.split('T')[0] + 'T00:00:00Z');
      } else {
        dueDateForCalc = new Date(rawDueDate + 'T00:00:00Z');
      }
      
      const breatheDays = breathePhaseDays || 0;
      const evaluationAvailableFrom = new Date(dueDateForCalc);
      evaluationAvailableFrom.setDate(evaluationAvailableFrom.getDate() + breatheDays);
      
      const evalPhaseDays = evaluationPhaseDays || 2;
      const evaluationDeadlineDate = new Date(evaluationAvailableFrom);
      evaluationDeadlineDate.setDate(evaluationDeadlineDate.getDate() + evalPhaseDays);
      evaluationDeadlineDate.setHours(23, 59, 59, 999);
      
      calculatedAvailableFrom = evaluationAvailableFrom.toISOString();
      calculatedDeadline = evaluationDeadlineDate.toISOString();
    } else {
      // Frontend provided datetime-local format (no timezone) - treat as UTC to preserve exact datetime
      console.log('📅 Frontend provided evaluation dates (datetime-local format):');
      console.log('  Input Available From:', calculatedAvailableFrom);
      console.log('  Input Deadline:', calculatedDeadline);
      
      // Append Z to treat as UTC (preserves exact datetime user entered)
      if (calculatedAvailableFrom && !calculatedAvailableFrom.includes('+') && !calculatedAvailableFrom.includes('Z')) {
        calculatedAvailableFrom = calculatedAvailableFrom + 'Z';
      }
      if (calculatedDeadline && !calculatedDeadline.includes('+') && !calculatedDeadline.includes('Z')) {
        calculatedDeadline = calculatedDeadline + 'Z';
      }
      
      console.log('📅 After appending Z (UTC):');
      console.log('  Available From:', calculatedAvailableFrom);
      console.log('  Deadline:', calculatedDeadline);
    }
    
    console.log('📅 PROJECT EVALUATION DATES (to be stored):');
    console.log('  Available From:', calculatedAvailableFrom);
    console.log('  Deadline:', calculatedDeadline);
    console.log('📅 === END DEADLINE SETUP ===');

    // Create project rubric if built-in
    console.log('🔍 Checking project rubric:', { 
      projectRubricType, 
      hasProjectRubric: !!projectRubric,
      projectRubricData: projectRubric 
    });
    
    if (projectRubricType === 'builtin' && projectRubric) {
      const { data: projectRubricData, error: rubricError } = await supabase
        .from('project_rubrics')
        .insert([{
          project_id: project.id,
          instructions: projectRubric.instructions || 'Use this rubric to evaluate student work.',
          total_points: projectRubric.totalPoints || 100
        }])
        .select()
        .single();

      if (rubricError) {
        console.error('Project rubric creation error:', rubricError);
        await supabase.from('projects').delete().eq('id', project.id);
        return res.status(500).json({ error: 'Failed to create project rubric' });
      }

      // Create rubric criteria
      if (projectRubric.criteria && projectRubric.criteria.length > 0) {
        const criteriaData = projectRubric.criteria.map((criterion, index) => ({
          project_rubric_id: projectRubricData.id,
          name: criterion.name,
          description: criterion.description || '',
          max_points: criterion.maxPoints || 0,
          order_index: index
        }));

        const { error: criteriaError } = await supabase
          .from('project_rubric_criteria')
          .insert(criteriaData);

        if (criteriaError) {
          console.error('Project rubric criteria creation error:', criteriaError);
          await supabase.from('projects').delete().eq('id', project.id);
          return res.status(500).json({ error: 'Failed to create project rubric criteria' });
        }
      }
    } else if (projectRubricType === 'upload' && projectRubricFile) {
      console.log('📝 Uploading custom rubric file to Supabase storage');
      
      // Upload base64 file to Supabase storage
      const base64Data = projectRubricFile.split(',')[1]; // Remove data:application/pdf;base64, prefix
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `project_${project.id}_rubric_${Date.now()}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-files')
        .upload(fileName, buffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        await supabase.from('projects').delete().eq('id', project.id);
        return res.status(500).json({ error: 'Failed to upload custom rubric file' });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('custom-files')
        .getPublicUrl(fileName);

      console.log('📝 Saving custom rubric to project_custom_rubrics table with URL:', urlData.publicUrl);
      const { error: customRubricError } = await supabase
        .from('project_custom_rubrics')
        .insert([{
          project_id: project.id,
          file_url: urlData.publicUrl,
          file_name: fileName
        }]);

      if (customRubricError) {
        console.error('Custom rubric save error:', customRubricError);
        await supabase.from('projects').delete().eq('id', project.id);
        return res.status(500).json({ error: 'Failed to save custom rubric' });
      }
      console.log('✅ Custom rubric saved to project_custom_rubrics');
    }

    // Create project evaluation form if built-in
    console.log('🔍 Checking project evaluation:', { 
      projectEvaluationType, 
      hasBuiltInEvaluation: !!builtInEvaluation,
      builtInEvaluationData: builtInEvaluation 
    });
    
    if (projectEvaluationType === 'builtin' && builtInEvaluation) {
      const { data: projectEvaluationData, error: evaluationError } = await supabase
        .from('project_evaluation_forms')
        .insert([{
          project_id: project.id,
          instructions: builtInEvaluation.instructions || 'Rate your groupmates according to the following criteria.',
          total_points: builtInEvaluation.totalPoints || 100,
          available_from: calculatedAvailableFrom,  // ✅ USE CALCULATED DATE
          due_date: calculatedDeadline              // ✅ USE CALCULATED DATE
        }])
        .select()
        .single();

      if (evaluationError) {
        console.error('Project evaluation form creation error:', evaluationError);
        await supabase.from('projects').delete().eq('id', project.id);
        return res.status(500).json({ error: 'Failed to create project evaluation form' });
      }

      // Create evaluation criteria
      if (builtInEvaluation.criteria && builtInEvaluation.criteria.length > 0) {
        const criteriaData = builtInEvaluation.criteria.map((criterion, index) => ({
          project_evaluation_form_id: projectEvaluationData.id,
          name: criterion.name,
          description: criterion.description || '',
          max_points: criterion.maxPoints || 0,
          order_index: index
        }));

        const { error: criteriaError } = await supabase
          .from('project_evaluation_criteria')
          .insert(criteriaData);

        if (criteriaError) {
          console.error('Project evaluation criteria creation error:', criteriaError);
          await supabase.from('projects').delete().eq('id', project.id);
          return res.status(500).json({ error: 'Failed to create project evaluation criteria' });
        }
      }
    } else if (projectEvaluationType === 'custom' && projectEvaluationForm) {
      console.log('📝 Uploading custom evaluation file to Supabase storage');
      
      // Upload base64 file to Supabase storage
      const base64Data = projectEvaluationForm.split(',')[1]; // Remove data:application/pdf;base64, prefix
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `project_${project.id}_evaluation_${Date.now()}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-files')
        .upload(fileName, buffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        await supabase.from('projects').delete().eq('id', project.id);
        return res.status(500).json({ error: 'Failed to upload custom evaluation file' });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('custom-files')
        .getPublicUrl(fileName);

      console.log('📝 Saving custom evaluation to project_evaluation_forms table with URL:', urlData.publicUrl);
      const { error: customEvalError } = await supabase
        .from('project_evaluation_forms')
        .insert([{
          project_id: project.id,
          custom_file_url: urlData.publicUrl,
          custom_file_name: fileName,
          is_custom_evaluation: true,
          instructions: 'Download and complete the custom evaluation form',
          total_points: 100,
          available_from: calculatedAvailableFrom,  // ✅ USE CALCULATED DATE
          due_date: calculatedDeadline              // ✅ USE CALCULATED DATE
        }]);

      if (customEvalError) {
        console.error('Custom evaluation save error:', customEvalError);
        await supabase.from('projects').delete().eq('id', project.id);
        return res.status(500).json({ error: 'Failed to save custom evaluation' });
      }
      console.log('✅ Custom evaluation saved to project_evaluation_forms');
    }

    // Create phases if provided
    if (phases && phases.length > 0) {
      const phaseInserts = await Promise.all(phases.map(async (phase, index) => {
        console.log(`🔍 PHASE ${index + 1} RECEIVED FROM FRONTEND:`, {
          startDate: phase.startDate,
          endDate: phase.endDate,
          startDateType: typeof phase.startDate,
          endDateType: typeof phase.endDate
        });
        let phaseStartDate, phaseEndDate;
        
        const hasTimezone = phase.startDate.includes('Z') || /[+-]\d{2}:\d{2}$/.test(phase.startDate) || /[+-]\d{4}$/.test(phase.startDate);
        
        if (hasTimezone) {
          // ISO format with timezone - strip the timezone since we're using timestamp without time zone
          phaseStartDate = phase.startDate.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
          phaseEndDate = phase.endDate.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
          console.log(`🕐 Phase ${index + 1} dates (stripped timezone):`, {
            inputStart: phase.startDate,
            inputEnd: phase.endDate,
            storedStart: phaseStartDate,
            storedEnd: phaseEndDate
          });
        } else if (phase.startDate.includes('T') && !phase.startDate.includes('Z') && !phase.startDate.includes('+') && !phase.startDate.includes('-', 10)) {
          // Datetime-local format (no timezone) - store as-is (local time, no conversion)
          phaseStartDate = phase.startDate;
          phaseEndDate = phase.endDate;
          console.log(`🕐 Phase ${index + 1} dates (datetime-local, stored as local time):`, {
            inputStart: phase.startDate,
            inputEnd: phase.endDate,
            storedStart: phaseStartDate,
            storedEnd: phaseEndDate
          });
        } else {
          phaseStartDate = phase.startDate;
          phaseEndDate = phase.endDate;
        }

        let phaseRubricFileUrl = null;
        let phaseEvaluationFormFileUrl = null;

        // Upload phase rubric file to Supabase storage if custom
        if (phase.rubricType === 'upload' && phase.rubricFileData) {
          console.log(`📤 Uploading custom rubric for phase ${index + 1} to Supabase storage`);
          const base64Data = phase.rubricFileData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `phase_${project.id}_${index + 1}_rubric_${Date.now()}.pdf`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('custom-files')
            .upload(fileName, buffer, {
              contentType: 'application/pdf',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Phase ${index + 1} rubric upload error:`, uploadError);
            throw new Error(`Failed to upload rubric for phase ${index + 1}`);
          }

          const { data: urlData } = supabase.storage
            .from('custom-files')
            .getPublicUrl(fileName);
          
          phaseRubricFileUrl = urlData.publicUrl;
          console.log(`✅ Phase ${index + 1} rubric uploaded:`, phaseRubricFileUrl);
        }

        // Upload phase evaluation form file to Supabase storage if custom
        if (phase.evaluation_form_type === 'custom' && phase.evaluationFormData) {
          console.log(`📤 Uploading custom evaluation form for phase ${index + 1} to Supabase storage`);
          const base64Data = phase.evaluationFormData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `phase_${project.id}_${index + 1}_evaluation_${Date.now()}.pdf`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('custom-files')
            .upload(fileName, buffer, {
              contentType: 'application/pdf',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error(`Phase ${index + 1} evaluation upload error:`, uploadError);
            throw new Error(`Failed to upload evaluation for phase ${index + 1}`);
          }

          const { data: urlData } = supabase.storage
            .from('custom-files')
            .getPublicUrl(fileName);
          
          phaseEvaluationFormFileUrl = urlData.publicUrl;
          console.log(`✅ Phase ${index + 1} evaluation uploaded:`, phaseEvaluationFormFileUrl);
        }
        
        return {
          project_id: project.id,
          phase_number: index + 1,
          title: phase.name,
          description: phase.description,
          // Store as datetime-local strings (no Z suffix)
          start_date: phaseStartDate,
          end_date: phaseEndDate,
          file_types_allowed: JSON.stringify(phase.file_types_allowed || []),
          max_attempts: phase.max_attempts || 3,
          evaluation_form_type: phase.evaluation_form_type || 'builtin',
          rubric_file_url: phaseRubricFileUrl,
          evaluation_form_file_url: phaseEvaluationFormFileUrl
        };
      }));

      // Insert phases using insert with castTo to prevent SDK date conversion
      const { data: createdPhases, error: phasesError } = await supabase
        .from('project_phases')
        .insert(phaseInserts.map((p, idx) => {
          console.log(`📝 Phase ${idx + 1} before conversion:`, {
            start_date: p.start_date,
            end_date: p.end_date
          });
          
          return {
            ...p,
            // Convert datetime-local strings to formatted strings with Z
            // Parse as local time: "2025-11-05T00:00:00.000" -> extract parts and format
            start_date: (() => {
              const match = p.start_date.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/);
              if (match) {
                const [, year, month, day, hours, minutes, seconds, ms] = match;
                const formatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms || '000'}Z`;
                console.log(`✅ Phase ${idx + 1} start matched regex:`, formatted);
                return formatted;
              }
              console.log(`❌ Phase ${idx + 1} start didn't match regex, using toLocaleString`);
              return new Date(p.start_date).toLocaleString('sv-SE', { hour12: false }) + 'Z';
            })(),
            end_date: (() => {
              const match = p.end_date.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/);
              if (match) {
                const [, year, month, day, hours, minutes, seconds, ms] = match;
                const formatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms || '000'}Z`;
                console.log(`✅ Phase ${idx + 1} end matched regex:`, formatted);
                return formatted;
              }
              console.log(`❌ Phase ${idx + 1} end didn't match regex, using toLocaleString`);
              return new Date(p.end_date).toLocaleString('sv-SE', { hour12: false }) + 'Z';
            })()
          };
        }))
        .select();

      if (phasesError) {
        console.error('Phases creation error:', phasesError);
      } else {
        // Create phase rubrics and evaluation forms
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          const createdPhase = createdPhases[i];

          // Create phase rubric if built-in
          if (phase.rubricType === 'builtin' && phase.rubric) {
            const { data: phaseRubricData, error: rubricError } = await supabase
              .from('phase_rubrics')
              .insert([{
                phase_id: createdPhase.id,
                instructions: phase.rubric.instructions || 'Use this rubric to evaluate student work for this phase.',
                total_points: phase.rubric.totalPoints || 100
              }])
              .select()
              .single();

            if (rubricError) {
              console.error('Phase rubric creation error:', rubricError);
              continue;
            }

            // Create phase rubric criteria
            if (phase.rubric.criteria && phase.rubric.criteria.length > 0) {
              const criteriaData = phase.rubric.criteria.map((criterion, index) => ({
                phase_rubric_id: phaseRubricData.id,
                name: criterion.name,
                description: criterion.description || '',
                max_points: criterion.maxPoints || 0,
                order_index: index
              }));

              const { error: criteriaError } = await supabase
                .from('phase_rubric_criteria')
                .insert(criteriaData);

              if (criteriaError) {
                console.error('Phase rubric criteria creation error:', criteriaError);
              }
            }
          } else if (phase.rubricType === 'upload' && phaseInserts[i].rubric_file_url) {
            console.log(`📝 Saving custom rubric for phase ${i + 1} to phase_custom_rubrics table`);
            const { error: customRubricError } = await supabase
              .from('phase_custom_rubrics')
              .insert([{
                phase_id: createdPhase.id,
                file_url: phaseInserts[i].rubric_file_url,
                file_name: `phase_${i + 1}_rubric_${Date.now()}.pdf`
              }]);

            if (customRubricError) {
              console.error('Custom phase rubric save error:', customRubricError);
            } else {
              console.log(`✅ Custom rubric saved to phase_custom_rubrics for phase ${i + 1}`);
            }
          }

          // Declare evaluation dates at this scope so they can be used for breathe period creation
          let phaseEvalAvailableFrom = null;
          let phaseEvalDueDate = null;

          // Create phase evaluation form if built-in
          if (phase.evaluation_form_type === 'builtin' && phase.builtInEvaluation) {
            // Use frontend-provided evaluation dates if available
            phaseEvalAvailableFrom = phase.evaluation_available_from;
            phaseEvalDueDate = phase.evaluation_due_date;
            
            if (!phaseEvalAvailableFrom || !phaseEvalDueDate) {
              console.log(`📅 Backend calculating phase ${i + 1} evaluation dates (shouldn't happen - frontend should provide these)...`);
              
              // This is a fallback - frontend should calculate and provide these dates
              // Parse the stored phase end date (which is in UTC)
              const phaseEndUTC = new Date(createdPhase.end_date);
              
              // We need to calculate "next day at midnight" in the USER'S timezone (Philippines)
              // Phase ends at: 2025-10-26T15:59:59.999Z (Oct 26, 11:59 PM Philippines)
              // Eval should start: Oct 27, 12:00 AM Philippines = Oct 26, 16:00 UTC
              
              // Add 1 second to phase end to get to next day, then round to start of that day in UTC
              const nextSecond = new Date(phaseEndUTC.getTime() + 1000);
              const nextDayUTC = new Date(nextSecond.toISOString().split('T')[0] + 'T16:00:00.000Z'); // Midnight Philippines = 16:00 UTC
              
              phaseEvalAvailableFrom = nextDayUTC.toISOString();
              
              // Due date: availableFrom + evaluationDays, at end of day Philippines (15:59:59 UTC)
              // If eval is 1 day: starts on Oct 28 and ends on Oct 28 (same calendar day)
              // If eval is 2 days: starts on Oct 28 and ends on Oct 29 (spans 2 calendar days)
              const evalPhaseDays = evaluationPhaseDays || 2;
              const dueDate = new Date(nextDayUTC);
              dueDate.setDate(dueDate.getDate() + evalPhaseDays - 1); // -1 because start day counts as day 1
              dueDate.setHours(15, 59, 59, 999); // 11:59 PM Philippines = 15:59 UTC
              
              phaseEvalDueDate = dueDate.toISOString();
              
              console.log(`📅 Phase ${i + 1} evaluation dates calculated (fallback):`, {
                phaseEndStored: createdPhase.end_date,
                availableFrom: phaseEvalAvailableFrom,
                dueDate: phaseEvalDueDate
              });
            } else {
              // Frontend provided dates in datetime-local format (no timezone)
              // These represent LOCAL time (Philippines), so we DON'T append Z
              // Instead, we store them as-is and let the database handle them as local timestamps
              console.log(`📅 Phase ${i + 1} evaluation dates from frontend (local time):`, {
                availableFrom: phaseEvalAvailableFrom,
                dueDate: phaseEvalDueDate
              });
            }
            
            const { data: phaseEvaluationData, error: evaluationError } = await supabase
              .from('phase_evaluation_forms')
              .insert([{
                phase_id: createdPhase.id,
                instructions: phase.builtInEvaluation.instructions || 'Rate your groupmates according to the following criteria.',
                total_points: phase.builtInEvaluation.totalPoints || 100,
                // Store as datetime-local strings (no Z suffix)
                available_from: phaseEvalAvailableFrom,
                due_date: phaseEvalDueDate
              }])
              .select()
              .single();

            if (evaluationError) {
              console.error('Phase evaluation form creation error:', evaluationError);
              continue;
            }

            // Create phase evaluation criteria
            if (phase.builtInEvaluation.criteria && phase.builtInEvaluation.criteria.length > 0) {
              const criteriaData = phase.builtInEvaluation.criteria.map((criterion, index) => ({
                phase_evaluation_form_id: phaseEvaluationData.id,
                name: criterion.name,
                description: criterion.description || '',
                max_points: criterion.maxPoints || 0,
                order_index: index
              }));

              const { error: criteriaError } = await supabase
                .from('phase_evaluation_criteria')
                .insert(criteriaData);

              if (criteriaError) {
                console.error('Phase evaluation criteria creation error:', criteriaError);
              }
            }
          } else if (phase.evaluation_form_type === 'custom' && phaseInserts[i].evaluation_form_file_url) {
            console.log(`📝 Saving custom evaluation for phase ${i + 1} to phase_evaluation_forms table`);
            const { data: phaseEvalData, error: customEvalError } = await supabase
              .from('phase_evaluation_forms')
              .insert([{
                phase_id: createdPhase.id,
                custom_file_url: phaseInserts[i].evaluation_form_file_url,
                custom_file_name: `phase_${i + 1}_evaluation_${Date.now()}.pdf`,
                is_custom_evaluation: true,
                instructions: 'Download and complete the custom evaluation form',
                total_points: 100,
                available_from: phase.evaluation_available_from || null,
                due_date: phase.evaluation_due_date || null
              }])
              .select()
              .single();

            if (customEvalError) {
              console.error('Custom phase evaluation save error:', customEvalError);
            } else {
              console.log(`✅ Custom evaluation saved to phase_evaluation_forms for phase ${i + 1}:`, phaseEvalData);
            }
          }

          // Create breathe period after this phase (if breathe_phase_days > 0)
          if (breathePhaseDays > 0) {
            console.log(`⏸️ Creating breathe period for phase ${i + 1}...`);
            
            let breatheStartDate, breatheEndDate;
            
            // Check if frontend provided breathe_phase_end (calculated precisely)
            if (phase.breathe_phase_end) {
              // Frontend calculated the exact breathe phase dates
              // Parse evaluation due date and breathe phase end from frontend
              const evalEndLocal = new Date(phaseEvalDueDate);
              const breatheEndLocal = new Date(phase.breathe_phase_end);
              
              // Breathe starts 1 minute after evaluation ends
              breatheStartDate = new Date(evalEndLocal);
              breatheStartDate.setMinutes(breatheStartDate.getMinutes() + 1);
              
              // Breathe ends at the time provided by frontend
              breatheEndDate = breatheEndLocal;
              
              console.log(`✅ Using frontend-calculated breathe dates for phase ${i + 1}:`, {
                evalEnd: evalEndLocal.toISOString(),
                breatheStart: breatheStartDate.toISOString(),
                breatheEnd: breatheEndDate.toISOString()
              });
            } else {
              // Fallback to old calculation if breathe_phase_end not provided
              // If we have evaluation form dates, use those; otherwise use phase end date
              if (phaseEvalDueDate) {
                // Parse the evaluation due date as a local timestamp
                const evalEndLocal = new Date(phaseEvalDueDate);
                
                // Breathe starts 1 minute after evaluation ends
                breatheStartDate = new Date(evalEndLocal);
                breatheStartDate.setMinutes(breatheStartDate.getMinutes() + 1);
              } else {
                // Fallback: use phase end date
                const phaseEndDate = new Date(createdPhase.end_date);
                breatheStartDate = new Date(phaseEndDate);
                breatheStartDate.setMinutes(breatheStartDate.getMinutes() + 1);
              }
              
              // Breathe ends after breathe_phase_days duration (full 24-hour periods)
              breatheEndDate = new Date(breatheStartDate);
              breatheEndDate.setTime(breatheEndDate.getTime() + (breathePhaseDays * 24 * 60 * 60 * 1000) - (60 * 1000)); // Add full days in milliseconds, minus 1 minute
            }
            
            // Format as datetime-local string (YYYY-MM-DDTHH:mm:ss.SSS) with 'Z' appended for Supabase
            const formatDatetimeLocal = (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const seconds = String(date.getSeconds()).padStart(2, '0');
              const ms = String(date.getMilliseconds()).padStart(3, '0');
              return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`;
            };
            
            const { error: breatheError } = await supabase
              .from('phase_breathe_periods')
              .insert([{
                phase_id: createdPhase.id,
                project_id: project.id,
                start_date: formatDatetimeLocal(breatheStartDate),
                end_date: formatDatetimeLocal(breatheEndDate),
                duration_days: breathePhaseDays
              }]);
            
            if (breatheError) {
              console.error(`❌ Breathe period creation error for phase ${i + 1}:`, breatheError);
            } else {
              console.log(`✅ Breathe period created for phase ${i + 1}:`, {
                startDate: formatDatetimeLocal(breatheStartDate),
                endDate: formatDatetimeLocal(breatheEndDate),
                durationDays: breathePhaseDays
              });
            }
          }
        }
      }

      // ✅ SYNC PROJECT EVALUATION FROM LAST PHASE
      // After all phases are created, sync project eval to match the last phase's evaluation dates
      // (Project evaluation happens after the FINAL/LAST phase ends, alongside final phase evaluation)
      if (phases && phases.length > 0 && createdPhases && createdPhases.length > 0) {
        console.log('📅 === SYNCING PROJECT EVALUATION FROM LAST PHASE ===');
        
        const { data: lastPhaseEval, error: lastPhaseError } = await supabase
          .from('phase_evaluation_forms')
          .select('available_from, due_date, phase_id')
          .eq('phase_id', createdPhases[createdPhases.length - 1]?.id)
          .single();
        
        if (lastPhaseError) {
          console.error('⚠️ Error fetching last phase evaluation:', lastPhaseError);
        } else if (lastPhaseEval) {
          console.log('📅 Found last phase evaluation:', {
            availableFrom: lastPhaseEval.available_from,
            dueDate: lastPhaseEval.due_date,
            phaseId: lastPhaseEval.phase_id
          });
          
          // Update project evaluation with last phase's dates
          const { error: syncError } = await supabase
            .from('project_evaluation_forms')
            .update({
              available_from: lastPhaseEval.available_from,
              due_date: lastPhaseEval.due_date,
              deadline_synced_from_phase_id: lastPhaseEval.phase_id,
              deadline_updated_at: new Date().toISOString()
            })
            .eq('project_id', project.id);
          
          if (syncError) {
            console.error('⚠️ Error syncing project evaluation:', syncError);
          } else {
            console.log('✅ Project evaluation synced from last phase successfully');
            console.log('📅 === END SYNC ===');
          }
        }
      }
    }

    res.json({ 
      message: 'Project created successfully with rubrics and evaluation forms',
      project,
      phasesCreated: phases?.length || 0
    });

    req.body = null;
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (global.gc) {
      global.gc();
    }
  }
});

// Get Course Projects
app.get('/api/professor/course/:courseId/projects', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Get projects with phases
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(*)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Get projects error:', projectsError);
      return res.status(500).json({ error: projectsError.message });
    }

    // Add ungraded submission counts for each project
    const projectsWithUngradedCounts = await Promise.all(projects.map(async (project) => {
      // Count ungraded project completions
      const { count: projectUngradedCount, error: projectCountError } = await supabase
        .from('project_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .is('grade', null);

      // Count ungraded phase submissions per phase
      const phaseUngradedCounts = {};
      if (project.project_phases && project.project_phases.length > 0) {
        await Promise.all(project.project_phases.map(async (phase) => {
          const { count: phaseUngradedCount, error: phaseCountError } = await supabase
            .from('phase_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('phase_id', phase.id)
            .is('grade', null);
          
          phaseUngradedCounts[phase.id] = phaseUngradedCount || 0;
        }));
      }

      // Calculate total ungraded for this project (project completion + all phases)
      const totalPhaseUngraded = Object.values(phaseUngradedCounts).reduce((sum, count) => sum + count, 0);
      const totalUngraded = (projectUngradedCount || 0) + totalPhaseUngraded;

      return {
        ...project,
        ungraded_counts: {
          project_completion: projectUngradedCount || 0,
          phases: phaseUngradedCounts,
          total: totalUngraded
        }
      };
    }));

    res.json(projectsWithUngradedCounts);
  } catch (error) {
    console.error('Get course projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Project Details with Phases
app.get('/api/professor/projects/:projectId', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project with phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        courses!inner(professor_id),
        project_phases(*)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify professor owns the project
    if (project.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Project
app.put('/api/professor/projects/:projectId', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    // Verify professor owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, courses!inner(professor_id)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // If updating due_date, check for existing project submissions
    if (updates.due_date) {
      // Handle datetime-local format
      if (updates.due_date.includes('T') && !updates.due_date.includes('Z') && !updates.due_date.includes('+') && !updates.due_date.includes('-', 10)) {
        updates.due_date = updates.due_date + ':00.000Z';
      }
      
      const { data: projectSubmissions, error: submissionsError } = await supabase
        .from('project_submissions')
        .select('submission_date')
        .eq('project_id', projectId);

      if (submissionsError) {
        console.error('Error checking project submissions:', submissionsError);
        return res.status(500).json({ error: 'Error checking existing submissions' });
      }

      if (projectSubmissions && projectSubmissions.length > 0) {
        const earliestSubmission = new Date(Math.min(...projectSubmissions.map(s => new Date(s.submission_date))));
        const newDueDate = new Date(updates.due_date);

        if (newDueDate < earliestSubmission) {
          return res.status(400).json({ 
            error: 'Cannot update project deadline to a date before existing submissions',
            earliest_submission: earliestSubmission.toISOString(),
            attempted_date: newDueDate.toISOString(),
            message: `Cannot set project deadline to ${newDueDate.toLocaleDateString()} because a student already submitted on ${earliestSubmission.toLocaleDateString()}`
          });
        }
      }
    }
    
    // Handle start_date if provided
    if (updates.start_date && updates.start_date.includes('T') && !updates.start_date.includes('Z') && !updates.start_date.includes('+') && !updates.start_date.includes('-', 10)) {
      updates.start_date = updates.start_date + ':00.000Z';
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Update project error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ 
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Phase
app.post('/api/professor/projects/:projectId/phases', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, startDate, endDate } = req.body;

    // Verify professor owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, courses!inner(professor_id)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get next phase number
    const { data: phases, error: phasesError } = await supabase
      .from('project_phases')
      .select('phase_number')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: false })
      .limit(1);

    const nextPhaseNumber = phases?.length > 0 ? phases[0].phase_number + 1 : 1;

    // Handle datetime-local format for phase dates
    let phaseStartDate = startDate;
    let phaseEndDate = endDate;
    
    if (startDate && startDate.includes('T') && !startDate.includes('Z') && !startDate.includes('+') && !startDate.includes('-', 10)) {
      phaseStartDate = startDate + ':00.000Z';
    }
    if (endDate && endDate.includes('T') && !endDate.includes('Z') && !endDate.includes('+') && !endDate.includes('-', 10)) {
      phaseEndDate = endDate + ':00.000Z';
    }

    // Create phase
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .insert([{
        project_id: projectId,
        phase_number: nextPhaseNumber,
        title,
        description,
        start_date: phaseStartDate,
        end_date: phaseEndDate
      }])
      .select()
      .single();

    if (phaseError) {
      console.error('Create phase error:', phaseError);
      return res.status(500).json({ error: phaseError.message });
    }

    res.json({ 
      message: 'Phase created successfully',
      phase
    });
  } catch (error) {
    console.error('Create phase error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Phase
app.put('/api/professor/phases/:phaseId', authenticateProfessor, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const updates = req.body;

    // Verify professor owns the phase
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select(`
        *,
        projects!inner(
          *,
          courses!inner(professor_id)
        )
      `)
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    if (phase.projects.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if previous phases have dates set (sequential validation)
    if (updates.start_date || updates.end_date) {
      const { data: previousPhases, error: prevPhasesError } = await supabase
        .from('project_phases')
        .select('phase_number, start_date, end_date')
        .eq('project_id', phase.project_id)
        .lt('phase_number', phase.phase_number)
        .order('phase_number', { ascending: false });

      if (prevPhasesError) {
        console.error('Error checking previous phases:', prevPhasesError);
        return res.status(500).json({ error: 'Error checking previous phases' });
      }

      // Check if any previous phase is missing dates
      const incompletePhase = previousPhases?.find(p => !p.start_date || !p.end_date);
      if (incompletePhase) {
        return res.status(400).json({ 
          error: 'Cannot edit phase dates until previous phases have complete dates',
          incomplete_phase: incompletePhase.phase_number,
          message: `Phase ${incompletePhase.phase_number} must have both start and end dates before editing Phase ${phase.phase_number}`
        });
      }
    }

    // If updating end_date, check for existing phase submissions
    if (updates.end_date) {
      // Handle datetime-local format
      if (updates.end_date.includes('T') && !updates.end_date.includes('Z') && !updates.end_date.includes('+') && !updates.end_date.includes('-', 10)) {
        updates.end_date = updates.end_date + ':00.000Z';
      }
      
      const { data: phaseSubmissions, error: submissionsError } = await supabase
        .from('phase_submissions')
        .select('submission_date')
        .eq('phase_id', phaseId);

      if (submissionsError) {
        console.error('Error checking phase submissions:', submissionsError);
        return res.status(500).json({ error: 'Error checking existing submissions' });
      }

      if (phaseSubmissions && phaseSubmissions.length > 0) {
        const earliestSubmission = new Date(Math.min(...phaseSubmissions.map(s => new Date(s.submission_date))));
        const newEndDate = new Date(updates.end_date);

        if (newEndDate < earliestSubmission) {
          return res.status(400).json({ 
            error: 'Cannot update phase deadline to a date before existing submissions',
            earliest_submission: earliestSubmission.toISOString(),
            attempted_date: newEndDate.toISOString(),
            message: `Cannot set Phase ${phase.phase_number} deadline to ${newEndDate.toLocaleDateString()} because a student already submitted on ${earliestSubmission.toLocaleDateString()}`
          });
        }
      }
    }
    
    // Handle start_date if provided
    if (updates.start_date && updates.start_date.includes('T') && !updates.start_date.includes('Z') && !updates.start_date.includes('+') && !updates.start_date.includes('-', 10)) {
      updates.start_date = updates.start_date + ':00.000Z';
    }

    // Update phase
    const { data: updatedPhase, error: updateError } = await supabase
      .from('project_phases')
      .update(updates)
      .eq('id', phaseId)
      .select()
      .single();

    if (updateError) {
      console.error('Update phase error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ 
      message: 'Phase updated successfully',
      phase: updatedPhase
    });
  } catch (error) {
    console.error('Update phase error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Project Submissions (for professor review)
app.get('/api/professor/projects/:projectId/submissions', authenticateProfessor, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify professor owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, courses!inner(professor_id)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get project submissions with group details
    const { data: projectSubmissions, error: projectSubError } = await supabase
      .from('project_submissions')
      .select(`
        *,
        course_groups!inner(group_name, group_number)
      `)
      .eq('project_id', projectId)
      .order('submission_date', { ascending: false });

    // Get phase submissions with group and student details
    const { data: phaseSubmissions, error: phaseSubError } = await supabase
      .from('phase_submissions')
      .select(`
        *,
        project_phases!inner(title, phase_number),
        course_groups!inner(group_name, group_number),
        studentaccounts!inner(first_name, last_name, student_number)
      `)
      .eq('project_phases.project_id', projectId)
      .order('submission_date', { ascending: false });

    if (projectSubError) {
      console.error('Get project submissions error:', projectSubError);
      return res.status(500).json({ error: projectSubError.message });
    }

    if (phaseSubError) {
      console.error('Get phase submissions error:', phaseSubError);
      return res.status(500).json({ error: phaseSubError.message });
    }

    res.json({
      projectSubmissions: projectSubmissions || [],
      phaseSubmissions: phaseSubmissions || []
    });
  } catch (error) {
    console.error('Get project submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Grade Phase Submission
app.post('/api/professor/submissions/:submissionId/grade', authenticateProfessor, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    // Verify professor owns the project
    const { data: submission, error: submissionError } = await supabase
      .from('phase_submissions')
      .select(`
        *,
        project_phases!inner(
          project_id,
          projects!inner(
            courses!inner(professor_id)
          )
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.project_phases.projects.courses.professor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update submission with grade
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('phase_submissions')
      .update({
        grade,
        feedback,
        status: 'graded',
        graded_by: req.user.id,
        graded_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Grade submission error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ 
      message: 'Submission graded successfully',
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== STUDENT LEADER ENDPOINTS ===================

// DEBUG ENDPOINT - Show what req.user contains
app.get('/api/student/debug-user', authenticateStudent, async (req, res) => {
  console.log('🔍 DEBUG USER ENDPOINT - Full req.user object:', req.user);
  console.log('🔍 DEBUG USER ENDPOINT - Full req.student object:', req.student);
  
  res.json({
    success: true,
    reqUser: req.user,
    reqStudent: req.student,
    timestamp: new Date().toISOString()
  });
});

// Get Leader Project Dashboard
// Simple test endpoint
app.get('/api/test', (req, res) => {
  console.log('🧪 TEST ENDPOINT HIT!');
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

app.get('/api/student/projects/:projectId/leader-dashboard', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Use fresh Supabase client to avoid caching issues
    const freshSupabase = getFreshSupabaseClient();

    console.log('🔍 LEADER DASHBOARD DEBUG - STARTING REQUEST');
    console.log('🔍 LEADER DASHBOARD DEBUG - Project ID:', projectId);
    console.log('🔍 LEADER DASHBOARD DEBUG - Auth User ID (from token):', req.user.authId || 'N/A');
    console.log('🔍 LEADER DASHBOARD DEBUG - DB User ID (student table):', req.user.id);
    console.log('🔍 LEADER DASHBOARD DEBUG - User Email:', req.user.email);
    console.log('🔍 LEADER DASHBOARD DEBUG - User Name:', req.user.fullName);
    console.log('🔍 LEADER DASHBOARD DEBUG - REQUEST RECEIVED!');

    // First, get the project to find its course
    const { data: project, error: projectError } = await freshSupabase
      .from('projects')
      .select('id, course_id, title')
      .eq('id', projectId)
      .single();

    console.log('🔍 LEADER DASHBOARD DEBUG - Project:', project);
    console.log('🔍 LEADER DASHBOARD DEBUG - Project Error:', projectError);

    if (projectError || !project) {
      console.log('❌ Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('🔍 LEADER DASHBOARD DEBUG - Project course_id:', project.course_id);

    // ENHANCED DEBUGGING: Check both user.id and student email lookup
    console.log('🔍 ENHANCED DEBUG - Checking user ID:', req.user.id);
    console.log('🔍 ENHANCED DEBUG - User email:', req.user.email);

    // First try with user.id
    let { data: leaderMemberships, error: membershipError } = await freshSupabase
      .from('course_group_members')
      .select('*, course_groups(*)')
      .eq('student_id', req.user.id)
      .eq('role', 'leader')
      .eq('is_active', true);

    console.log('🔍 LEADER DASHBOARD DEBUG - Direct ID lookup:', leaderMemberships);
    console.log('🔍 LEADER DASHBOARD DEBUG - Direct ID error:', membershipError);

    // If no results with user.id, try looking up by email
    if (!leaderMemberships || leaderMemberships.length === 0) {
      console.log('� Trying email-based lookup for user:', req.user.email);
      
      // Get student record by email
      const { data: studentByEmail, error: emailError } = await freshSupabase
        .from('studentaccounts')
        .select('id')
        .eq('email', req.user.email)
        .single();

      if (studentByEmail && !emailError) {
        console.log('✅ Found student by email, ID:', studentByEmail.id);
        
        // Now try the membership query with the correct student ID
        const { data: emailBasedMemberships, error: emailMembershipError } = await freshSupabase
          .from('course_group_members')
          .select('*, course_groups(*)')
          .eq('student_id', studentByEmail.id)
          .eq('role', 'leader')
          .eq('is_active', true);

        if (emailBasedMemberships && emailBasedMemberships.length > 0) {
          console.log('✅ Found memberships using email-based lookup!');
          leaderMemberships = emailBasedMemberships;
          membershipError = emailMembershipError;
          
          // Update req.user.id to the correct student ID for consistency
          req.user.id = studentByEmail.id;
        }
      } else {
        console.log('❌ Could not find student by email:', emailError?.message);
      }
    }

    console.log('🔍 LEADER DASHBOARD DEBUG - Leader memberships:', leaderMemberships);
    console.log('🔍 LEADER DASHBOARD DEBUG - Membership error:', membershipError);

    if (membershipError) {
      console.log('❌ Database error getting memberships:', membershipError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!leaderMemberships || leaderMemberships.length === 0) {
      console.log('❌ LEADER DASHBOARD - No leader memberships found for user:', req.user.id);
      return res.status(403).json({ error: 'Not authorized as leader for any course' });
    }

    // Detailed debugging of each membership
    console.log('🔍 DETAILED MEMBERSHIP CHECK:');
    leaderMemberships.forEach((membership, index) => {
      console.log(`  Membership ${index + 1}:`, {
        membershipId: membership.id,
        groupId: membership.group_id,
        role: membership.role,
        isActive: membership.is_active,
        courseGroupId: membership.course_groups?.id,
        courseId: membership.course_groups?.course_id,
        groupName: membership.course_groups?.group_name,
        groupIsActive: membership.course_groups?.is_active,
        matchesTargetCourse: membership.course_groups?.course_id === project.course_id
      });
    });

    // Check if any of the user's leader groups belong to this project's course
    let validMembership = null;
    for (const membership of leaderMemberships) {
      console.log('🔍 Checking membership:', {
        groupId: membership.group_id,
        courseId: membership.course_groups?.course_id,
        targetCourseId: project.course_id,
        isMatch: membership.course_groups?.course_id === project.course_id
      });
      
      if (membership.course_groups && 
          membership.course_groups.course_id === project.course_id &&
          membership.course_groups.is_active) {
        validMembership = membership;
        console.log('✅ Found valid membership:', validMembership);
        break;
      }
    }

    if (!validMembership) {
      console.log('❌ LEADER DASHBOARD - No valid leadership found for course:', project.course_id);
      console.log('❌ Available courses for this leader:', 
        leaderMemberships.map(m => m.course_groups?.course_id || 'null')
      );
      
      // ADDITIONAL DEBUG: Let's check if there's a course ID mismatch issue
      console.log('🔍 ADDITIONAL DEBUG - Checking course relationships...');
      
      // Check if the project actually exists and what course it belongs to
      const { data: projectDetails, error: projectDetailsError } = await freshSupabase
        .from('projects')
        .select(`
          id,
          title,
          course_id,
          courses (
            id,
            course_name,
            course_code
          )
        `)
        .eq('id', projectId)
        .single();
        
      console.log('🔍 Project details with course:', projectDetails);
      console.log('🔍 Project details error:', projectDetailsError);
      
      // Check what courses the user's groups belong to
      const { data: userCourses, error: userCoursesError } = await freshSupabase
        .from('course_group_members')
        .select(`
          role,
          course_groups (
            course_id,
            courses (
              id,
              course_name,
              course_code
            )
          )
        `)
        .eq('student_id', req.user.id)
        .eq('role', 'leader')
        .eq('is_active', true);
        
      console.log('🔍 User leader courses:', userCourses);
      console.log('🔍 User courses error:', userCoursesError);
      
      return res.status(403).json({ 
        error: 'Not authorized as leader for this course',
        debug: {
          projectCourse: project.course_id,
          userLeaderCourses: leaderMemberships.map(m => m.course_groups?.course_id || 'null'),
          projectDetails,
          userCourses
        }
      });
    }

    console.log('✅ LEADER DASHBOARD - Valid membership found:', validMembership);
    const groupId = validMembership.group_id;

    return await handleValidLeadershipAccess(req, res, projectId, groupId, validMembership.course_groups, freshSupabase);

  } catch (error) {
    console.error('💥 LEADER DASHBOARD - Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to handle valid leadership access
async function handleValidLeadershipAccess(req, res, projectId, groupId, courseGroup, freshSupabase) {
  try {
    // Get full project details with phases
    const { data: fullProject, error: fullProjectError } = await freshSupabase
      .from('projects')
      .select(`
        *,
        project_phases(*),
        courses(course_name, course_code)
      `)
      .eq('id', projectId)
      .single();

    if (fullProjectError) {
      console.error('❌ Error getting full project details:', fullProjectError);
      return res.status(500).json({ error: 'Failed to get project details' });
    }

    // Get group members
    const { data: groupMembers, error: membersError } = await freshSupabase
      .from('course_group_members')
      .select(`
        *,
        studentaccounts!inner(first_name, last_name, student_number, profile_image_url)
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Error getting group members:', membersError);
    }

    // Get current tasks for the group
    const { data: tasks, error: tasksError } = await freshSupabase
      .from('tasks')
      .select(`
        *,
        studentaccounts!tasks_assigned_to_fkey(first_name, last_name),
        task_submissions(*)
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Error getting tasks:', tasksError);
    }

    console.log('✅ LEADER DASHBOARD - Sending successful response');

    return res.json({
      project: fullProject,
      group: courseGroup,
      groupMembers: groupMembers || [],
      tasks: tasks || [],
      stats: {
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
        pendingTasks: tasks?.filter(t => t.status === 'pending').length || 0
      }
    });

  } catch (error) {
    console.error('💥 Helper function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Create Task (Leader Only)
app.post('/api/student/projects/:projectId/tasks', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { phaseId, assignedTo, title, description, dueDate, availableUntil, maxAttempts, fileTypesAllowed } = req.body;
    const freshSupabase = getFreshSupabaseClient();

    console.log('🔍 Creating task with data:', {
      projectId,
      phaseId,
      assignedTo,
      title,
      dueDate,
      availableUntil,
      maxAttempts,
      fileTypesAllowed
    });

    // First get the project to find the course_id
    const { data: project, error: projectError } = await freshSupabase
      .from('projects')
      .select('id, course_id, title')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is a leader in the project's course
    const { data: leaderMembership, error: leaderError } = await freshSupabase
      .from('course_group_members')
      .select('group_id, role, course_groups(*)')
      .eq('student_id', req.user.id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    if (leaderError || !leaderMembership || leaderMembership.course_groups.course_id !== project.course_id) {
      return res.status(403).json({ error: 'Not authorized as leader for this project' });
    }

    // Verify phase belongs to project and get phase dates
    const { data: phase, error: phaseError } = await freshSupabase
      .from('project_phases')
      .select('*')
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .single();

    if (phaseError || !phase) {
      return res.status(400).json({ error: 'Invalid phase for this project' });
    }

    // Validate due date is within phase dates
    const phaseStart = new Date(phase.start_date);
    const phaseEnd = new Date(phase.end_date);
    const taskDue = new Date(dueDate);
    const taskAvailable = new Date(availableUntil || dueDate);

    console.log('📅 Date validation:', {
      phaseStart: phaseStart.toISOString(),
      phaseEnd: phaseEnd.toISOString(),
      taskDue: taskDue.toISOString(),
      taskAvailable: taskAvailable.toISOString()
    });

    if (taskDue < phaseStart || taskDue > phaseEnd) {
      return res.status(400).json({ 
        error: 'Task due date must be within phase dates',
        phaseStart: phase.start_date,
        phaseEnd: phase.end_date
      });
    }

    if (availableUntil && taskAvailable < taskDue) {
      return res.status(400).json({ error: 'Available until date must be after due date' });
    }

    // Additional validation: if availableUntil is provided, ensure it's within phase bounds
    if (availableUntil && (taskAvailable < phaseStart || taskAvailable > phaseEnd)) {
      return res.status(400).json({ 
        error: 'Available until date must be within phase dates',
        phaseStart: phase.start_date,
        phaseEnd: phase.end_date
      });
    }

    // Check task limits for assigned student per PHASE (not per project)
    const { data: existingTasks, error: tasksError } = await freshSupabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)  // Changed: filter by phase_id instead of just project_id
      .eq('assigned_to', assignedTo)
      .eq('is_active', true);

    if (tasksError) {
      console.error('Error checking existing tasks:', tasksError);
    }

    const currentTaskCount = existingTasks?.length || 0;

    // Get project limits - we'll need to fetch these separately
    const { data: projectData, error: projectDataError } = await freshSupabase
      .from('projects')
      .select('max_tasks_per_member')
      .eq('id', projectId)
      .single();

    const maxTasksAllowed = projectData?.max_tasks_per_member || 5;

    if (currentTaskCount >= maxTasksAllowed) {
      return res.status(400).json({ 
        error: `Student already has maximum tasks (${maxTasksAllowed}) for this phase` 
      });
    }

    // Create task
    const { data: task, error: taskError } = await freshSupabase
      .from('tasks')
      .insert([{
        project_id: projectId,
        phase_id: phaseId,
        assigned_to: assignedTo,
        assigned_by: req.user.id,
        title,
        description,
        due_date: dueDate,
        available_until: availableUntil,
        max_attempts: maxAttempts || 2,
        file_types_allowed: JSON.stringify(fileTypesAllowed && fileTypesAllowed.length > 0 ? fileTypesAllowed : [])
      }])
      .select()
      .single();

    if (taskError) {
      console.error('Create task error:', taskError);
      return res.status(500).json({ error: taskError.message });
    }

    console.log('✅ Task created successfully:', task);

    res.json({ 
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== TASK MANAGEMENT ENDPOINTS ===================

// GET /api/student/projects/:projectId/assigned-tasks - Get all assigned tasks for a project
app.get('/api/student/projects/:projectId/assigned-tasks', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const freshSupabase = getFreshSupabaseClient();
    
    console.log('📋 Getting assigned tasks for project:', projectId, 'by leader:', req.user.id);
    
    // Verify user is a leader for this project
    const { data: project, error: projectError } = await freshSupabase
      .from('projects')
      .select('id, course_id, title')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is a leader in the project's course
    const { data: leaderMembership, error: leaderError } = await freshSupabase
      .from('course_group_members')
      .select('group_id, role, course_groups(*)')
      .eq('student_id', req.user.id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    if (leaderError || !leaderMembership || leaderMembership.course_groups.course_id !== project.course_id) {
      return res.status(403).json({ error: 'Access denied - must be group leader for this project' });
    }

    // Get all tasks assigned by this leader for the project
    const { data: tasks, error: tasksError } = await freshSupabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        available_until,
        max_attempts,
        file_types_allowed,
        status,
        created_at,
        updated_at,
        project_phases!tasks_phase_id_fkey(
          id,
          title,
          start_date,
          end_date
        ),
        studentaccounts!tasks_assigned_to_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .eq('assigned_by', req.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('🔍 Raw tasks from database:', tasks.map(t => ({
      id: t.id,
      title: t.title,
      phase_id: t.phase_id,
      project_phases: t.project_phases
    })));

    // Get submission counts for each task
    const taskIds = tasks.map(t => t.id);
    let submissionCountsMap = {};
    
    if (taskIds.length > 0) {
      const { data: submissionCounts, error: submissionError } = await freshSupabase
        .from('task_submissions')
        .select('task_id')
        .in('task_id', taskIds);

      if (submissionError) {
        console.warn('Warning getting submission counts:', submissionError);
      } else {
        submissionCountsMap = (submissionCounts || []).reduce((acc, sub) => {
          acc[sub.task_id] = (acc[sub.task_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // Format response
    const formattedTasks = tasks.map(task => {
      // Ensure file_types_allowed is always an array
      let fileTypesAllowed = task.file_types_allowed;
      if (typeof fileTypesAllowed === 'string') {
        try {
          fileTypesAllowed = JSON.parse(fileTypesAllowed);
        } catch (e) {
          fileTypesAllowed = [];
        }
      }
      if (!Array.isArray(fileTypesAllowed)) {
        fileTypesAllowed = fileTypesAllowed ? [fileTypesAllowed] : [];
      }

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        available_until: task.available_until,
        max_attempts: task.max_attempts,
        file_types_allowed: fileTypesAllowed,
        status: task.status,
        assigned_to_name: `${task.studentaccounts.first_name} ${task.studentaccounts.last_name}`,
        assigned_to_email: task.studentaccounts.email,
        assigned_to_id: task.studentaccounts.id,
        submissions_count: submissionCountsMap[task.id] || 0,
        phase_name: task.project_phases?.title || 'No phase assigned',
        phase_start_date: task.project_phases?.start_date,
        phase_end_date: task.project_phases?.end_date,
        project_phases: task.project_phases, // Include the full nested object too
        created_at: task.created_at,
        updated_at: task.updated_at
      };
    });

    console.log(`✅ Found ${formattedTasks.length} assigned tasks`);
    
    // Debug: Log first task's phase info
    if (formattedTasks.length > 0) {
      console.log('📋 Sample task phase info:', {
        title: formattedTasks[0].title,
        phase_name: formattedTasks[0].phase_name,
        phase_start_date: formattedTasks[0].phase_start_date,
        phase_end_date: formattedTasks[0].phase_end_date
      });
    }
    
    res.json({
      success: true,
      tasks: formattedTasks,
      count: formattedTasks.length
    });

  } catch (error) {
    console.error('Error getting assigned tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/student/tasks/:taskId/submissions - Get submissions for a specific task
app.get('/api/student/tasks/:taskId/submissions', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const freshSupabase = getFreshSupabaseClient();
    
    console.log('📄 Getting submissions for task:', taskId, 'by leader:', req.user.id);
    
    // Verify the task belongs to this leader
    const { data: task, error: taskError } = await freshSupabase
      .from('tasks')
      .select('id, assigned_by, title, project_id')
      .eq('id', taskId)
      .eq('assigned_by', req.user.id)
      .single();
    
    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or not assigned by you' });
    }

    // Get submissions for this task
    const { data: submissions, error: submissionError } = await freshSupabase
      .from('task_submissions')
      .select(`
        id,
        submission_text,
        file_urls,
        status,
        review_comments,
        submission_date,
        created_at,
        updated_at
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (submissionError) {
      console.error('❌ Error fetching submissions:', submissionError);
      return res.status(500).json({ error: submissionError.message });
    }

    console.log(`✅ Found ${submissions?.length || 0} submissions for task`);
    res.json({
      success: true,
      task: { id: task.id, title: task.title },
      submissions: submissions || [],
      count: submissions?.length || 0
    });

  } catch (error) {
    console.error('Error getting task submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/student/tasks/:taskId - Update a task
app.put('/api/student/tasks/:taskId', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const freshSupabase = getFreshSupabaseClient();
    const {
      title,
      description,
      due_date,
      available_until,
      max_attempts,
      file_types_allowed,
      has_existing_submissions
    } = req.body;
    
    console.log('✏️ Updating task:', taskId, 'by leader:', req.user.id);
    
    // Verify the task belongs to this leader
    const { data: existingTask, error: taskError } = await freshSupabase
      .from('tasks')
      .select(`
        id, 
        assigned_by, 
        assigned_to, 
        title, 
        project_id,
        phase_id,
        project_phases!inner(
          id,
          end_date,
          title
        ),
        studentaccounts!tasks_assigned_to_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', taskId)
      .eq('assigned_by', req.user.id)
      .single();
    
    if (taskError || !existingTask) {
      return res.status(404).json({ error: 'Task not found or not assigned by you' });
    }

    // Check if the phase has ended
    const phaseEndDate = new Date(existingTask.project_phases.end_date);
    const now = new Date();

    if (now > phaseEndDate) {
      return res.status(400).json({ 
        error: 'Cannot modify task - phase has ended',
        phase_title: existingTask.project_phases.title,
        phase_end_date: existingTask.project_phases.end_date
      });
    }

    // Update the task
    const { data: updatedTask, error: updateError } = await freshSupabase
      .from('tasks')
      .update({
        title,
        description,
        due_date,
        available_until,
        max_attempts,
        file_types_allowed,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating task:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // If task has existing submissions, create a notification for the assigned member
    if (has_existing_submissions) {
      try {
        // Create notification
        const notificationData = {
          user_id: existingTask.assigned_to,
          type: 'task_updated',
          title: 'Task Updated',
          message: `The task "${title}" has been updated by your group leader. Please review the changes.`,
          data: JSON.stringify({
            task_id: taskId,
            task_title: title,
            project_id: existingTask.project_id,
            updated_by: req.user.id,
            has_submissions: true
          }),
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { error: notificationError } = await freshSupabase
          .from('notifications')
          .insert(notificationData);

        if (notificationError) {
          console.warn('⚠️ Warning: Could not create notification:', notificationError);
        } else {
          console.log('✅ Notification sent to member about task update');
        }

      } catch (notificationErr) {
        console.warn('⚠️ Warning: Notification error:', notificationErr);
      }
    }

    console.log('✅ Task updated successfully:', updatedTask.id);
    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
      notification_sent: has_existing_submissions
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/student/tasks/:taskId - Soft delete a task
app.delete('/api/student/tasks/:taskId', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const freshSupabase = getFreshSupabaseClient();
    
    console.log('🗑️ Soft deleting task:', taskId, 'by leader:', req.user.id);
    
    // Verify the task belongs to this leader
    const { data: existingTask, error: taskError } = await freshSupabase
      .from('tasks')
      .select(`
        id, 
        assigned_by, 
        assigned_to, 
        title,
        project_id,
        studentaccounts!tasks_assigned_to_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', taskId)
      .eq('assigned_by', req.user.id)
      .eq('is_active', true)
      .single();
    
    if (taskError || !existingTask) {
      return res.status(404).json({ error: 'Task not found or already deleted' });
    }

    // Check if task has submissions
    const { data: submissions, error: submissionError } = await freshSupabase
      .from('task_submissions')
      .select('id')
      .eq('task_id', taskId);

    if (submissionError) {
      console.warn('Warning checking submissions:', submissionError);
    }

    const hasSubmissions = submissions && submissions.length > 0;

    // Check if the phase has ended
    const { data: phaseData, error: phaseError } = await freshSupabase
      .from('tasks')
      .select(`
        phase_id,
        project_phases!inner(
          id,
          end_date,
          title
        )
      `)
      .eq('id', taskId)
      .single();

    if (phaseError) {
      console.error('❌ Error checking phase:', phaseError);
      return res.status(500).json({ error: 'Unable to verify phase status' });
    }

    const phaseEndDate = new Date(phaseData.project_phases.end_date);
    const now = new Date();

    if (now > phaseEndDate) {
      return res.status(400).json({ 
        error: 'Cannot delete task - phase has ended',
        phase_title: phaseData.project_phases.title,
        phase_end_date: phaseData.project_phases.end_date
      });
    }

    // Soft delete the task (set is_active to false)
    const { data: deletedTask, error: deleteError } = await freshSupabase
      .from('tasks')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (deleteError) {
      console.error('❌ Error deleting task:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    // If task had submissions, notify the assigned member
    if (hasSubmissions) {
      try {
        // Create notification
        const notificationData = {
          user_id: existingTask.assigned_to,
          type: 'task_cancelled',
          title: 'Task Cancelled',
          message: `The task "${existingTask.title}" has been cancelled by your group leader.`,
          data: JSON.stringify({
            task_id: taskId,
            task_title: existingTask.title,
            project_id: existingTask.project_id,
            cancelled_by: req.user.id,
            had_submissions: true
          }),
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { error: notificationError } = await freshSupabase
          .from('notifications')
          .insert(notificationData);

        if (notificationError) {
          console.warn('⚠️ Warning: Could not create cancellation notification:', notificationError);
        } else {
          console.log('✅ Cancellation notification sent to member');
        }

      } catch (notificationErr) {
        console.warn('⚠️ Warning: Notification error:', notificationErr);
      }
    }

    console.log('✅ Task soft deleted successfully:', deletedTask.id);
    res.json({
      success: true,
      message: 'Task deleted successfully',
      task: deletedTask,
      had_submissions: hasSubmissions,
      notification_sent: hasSubmissions
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/submission-details - Get task submission details for deliverables view
app.get('/api/tasks/:taskId/submission-details', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    console.log('📋 Fetching submission details for task:', taskId);

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all original submissions for this task
    const { data: originalSubmissions, error: originalError } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    // Get all revision submissions for this task
    const { data: revisionSubmissions, error: revisionError } = await supabase
      .from('revision_submissions')
      .select('*')
      .eq('task_id', taskId)
      .order('revision_attempt_number', { ascending: false });

    let selectedSubmission = null;
    let submissionType = 'none';

    // PRIORITY 1: Approved revision (best outcome)
    if (revisionSubmissions && revisionSubmissions.length > 0) {
      const approvedRevision = revisionSubmissions.find(r => r.status === 'approved');
      if (approvedRevision) {
        selectedSubmission = approvedRevision;
        submissionType = 'approved_revision';
      }
    }

    // PRIORITY 2: Latest revision with leader action (revision_requested)
    if (!selectedSubmission && revisionSubmissions && revisionSubmissions.length > 0) {
      const revisionRequested = revisionSubmissions.find(r => r.status === 'revision_requested');
      if (revisionRequested) {
        selectedSubmission = revisionRequested;
        submissionType = 'revision_requested';
      }
    }

    // PRIORITY 3: Latest revision submission (any status)
    if (!selectedSubmission && revisionSubmissions && revisionSubmissions.length > 0) {
      selectedSubmission = revisionSubmissions[0];
      submissionType = 'latest_revision';
    }

    // PRIORITY 4: Approved original submission
    if (!selectedSubmission && originalSubmissions && originalSubmissions.length > 0) {
      const approvedOriginal = originalSubmissions.find(o => o.status === 'approved');
      if (approvedOriginal) {
        selectedSubmission = approvedOriginal;
        submissionType = 'approved_original';
      }
    }

    // PRIORITY 5: Original submission with leader action
    if (!selectedSubmission && originalSubmissions && originalSubmissions.length > 0) {
      const withLeaderAction = originalSubmissions.find(o => 
        o.status === 'revision_requested' || o.status === 'rejected'
      );
      if (withLeaderAction) {
        selectedSubmission = withLeaderAction;
        submissionType = 'leader_acted';
      }
    }

    // PRIORITY 6: Latest original submission
    if (!selectedSubmission && originalSubmissions && originalSubmissions.length > 0) {
      selectedSubmission = originalSubmissions[0];
      submissionType = 'latest_original';
    }

    if (!selectedSubmission) {
      return res.json({
        task: task,
        submission: null,
        submissionType: 'none',
        message: 'No submissions found for this task'
      });
    }

    // Parse file paths
    let files = [];
    if (submissionType.includes('revision')) {
      if (selectedSubmission.file_paths) {
        try {
          const parsed = typeof selectedSubmission.file_paths === 'string' 
            ? JSON.parse(selectedSubmission.file_paths) 
            : selectedSubmission.file_paths;
          files = Array.isArray(parsed) ? parsed : Object.values(parsed);
        } catch (e) {
          console.error('Error parsing revision file paths:', e);
        }
      }
    } else {
      if (selectedSubmission.file_urls) {
        try {
          const parsed = typeof selectedSubmission.file_urls === 'string' 
            ? JSON.parse(selectedSubmission.file_urls) 
            : selectedSubmission.file_urls;
          files = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('Error parsing original file URLs:', e);
        }
      }
    }

    res.json({
      task: task,
      submission: {
        id: selectedSubmission.id,
        status: selectedSubmission.status,
        submitted_at: selectedSubmission.submitted_at || selectedSubmission.created_at,
        submission_text: selectedSubmission.submission_text,
        files: files,
        reviewed_at: selectedSubmission.reviewed_at || selectedSubmission.evaluated_at,
        reviewed_by: selectedSubmission.reviewed_by || selectedSubmission.evaluated_by,
        review_comments: selectedSubmission.review_comments || selectedSubmission.leader_feedback || selectedSubmission.revision_message,
        revision_attempt_number: selectedSubmission.revision_attempt_number || null
      },
      submissionType: submissionType
    });

  } catch (error) {
    console.error('Error fetching task submission details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get phase member tasks for deliverable submission validation
app.get('/api/student/phase-member-tasks', authenticateStudent, async (req, res) => {
  try {
    const { projectId, phaseId } = req.query;
    const user = req.user;

    if (!projectId || !phaseId) {
      return res.status(400).json({ error: 'Project ID and Phase ID are required' });
    }

    // Get the phase details to retrieve min/max tasks per member
    const { data: phaseData, error: phaseError } = await supabase
      .from('project_phases')
      .select('phase_number, min_tasks_per_member, max_tasks_per_member')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phaseData) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Get the project to verify access and get group info
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, group_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all group members
    const { data: groupMembers, error: membersError } = await supabase
      .from('group_members')
      .select('student_id')
      .eq('group_id', projectData.group_id);

    if (membersError) {
      return res.status(500).json({ error: 'Failed to fetch group members' });
    }

    // Fetch tasks for each member in this phase
    const memberTasksData = [];
    
    console.log('🔍 Fetching tasks for group members:', groupMembers.map(m => m.student_id));
    
    for (const member of groupMembers) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          phase_id,
          project_phases!inner(phase_number)
        `)
        .eq('project_id', projectId)
        .eq('phase_id', phaseId)
        .eq('assigned_to', member.student_id);

      console.log(`🔍 Member ${member.student_id}: Found ${tasks?.length || 0} tasks`, tasksError ? `Error: ${tasksError.message}` : '');
      
      if (!tasksError && tasks) {
        // Add phase_number directly to each task for easier filtering on frontend
        const tasksWithPhaseNumber = tasks.map(task => {
          // Extract phase_number from the joined project_phases object
          const phaseNumber = task.project_phases?.phase_number || phaseData.phase_number;
          
          console.log(`🔍 Processing task "${task.title}":`, {
            raw_project_phases: task.project_phases,
            extracted_phase_number: phaseNumber,
            fallback_phase_number: phaseData.phase_number
          });
          
          return {
            ...task,
            phase_number: phaseNumber
          };
        });

        console.log(`✅ Tasks with phase_number for member ${member.student_id}:`, tasksWithPhaseNumber);

        memberTasksData.push({
          member_id: member.student_id,
          tasks: tasksWithPhaseNumber
        });
      } else {
        // Add empty array for members with no tasks
        memberTasksData.push({
          member_id: member.student_id,
          tasks: []
        });
      }
    }
    
    console.log('📊 Final memberTasksData:', JSON.stringify(memberTasksData, null, 2));

    const responseData = {
      success: true,
      projectId: projectId,
      phaseId: phaseId,
      phaseNumber: phaseData.phase_number,
      minTasksPerMember: phaseData.min_tasks_per_member || 1,
      maxTasksPerMember: phaseData.max_tasks_per_member || 10,
      data: memberTasksData
    };
    
    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching phase member tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Review Task Submission (Leader Only)
app.post('/api/student/submissions/:submissionId/review', authenticateStudent, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, reviewComments } = req.body; // 'approved', 'revision_requested', 'rejected'

    // Verify student is leader and submission belongs to their group
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select(`
        *,
        tasks!inner(
          project_id,
          assigned_to,
          assigned_by
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.tasks.assigned_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to review this submission' });
    }

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('task_submissions')
      .update({
        status,
        review_comments: reviewComments,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Review submission error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Update task status based on review
    let taskStatus = 'in_progress';
    if (status === 'approved') {
      taskStatus = 'completed';
    } else if (status === 'revision_requested') {
      taskStatus = 'to_revise';
    }

    await supabase
      .from('tasks')
      .update({ status: taskStatus })
      .eq('id', submission.task_id);

    res.json({ 
      message: 'Submission reviewed successfully',
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Phase submission (leaders only)
app.post('/api/student/phases/:phaseId/submit', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const student_id = req.user.id;
    const { submissionText, fileUrls } = req.body;

    console.log('📋 === PHASE SUBMISSION START ===');
    console.log('📋 Phase ID:', phaseId);
    console.log('📋 Leader ID:', student_id);

    // Verify student is a leader and get group
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(id, group_name)
      `)
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Only group leaders can submit phases' });
    }

    // Verify phase exists and get project info
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('*, projects!inner(course_id)')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from('phase_submissions')
      .select('id')
      .eq('phase_id', phaseId)
      .eq('group_id', membership.group_id)
      .single();

    if (existingSubmission) {
      return res.status(400).json({ error: 'Phase already submitted' });
    }

    // Check if late
    const now = new Date();
    const phaseEnd = new Date(phase.end_date);
    const isLate = now > phaseEnd;

    // Create phase submission
    const { data: phaseSubmission, error: submissionError } = await supabase
      .from('phase_submissions')
      .insert([{
        phase_id: phaseId,
        group_id: membership.group_id,
        submitted_by: student_id,
        submission_text: submissionText,
        file_urls: JSON.stringify(fileUrls || []),
        is_late: isLate,
        status: 'submitted'
      }])
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Phase submission error:', submissionError);
      return res.status(500).json({ error: submissionError.message });
    }

    console.log('✅ Phase submitted successfully:', phaseSubmission.id);
    console.log('📋 === PHASE SUBMISSION COMPLETE ===');

    res.json({ 
      message: 'Phase submitted successfully',
      submission: phaseSubmission,
      isLate
    });

  } catch (error) {
    console.error('💥 Phase submission error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =================== STUDENT MEMBER ENDPOINTS ===================

// Get My Tasks
// In your student_courses_dashboard.js
app.get('/api/student/my-tasks', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    const { status, projectId } = req.query;
    
    console.log('🔍 /api/student/my-tasks called with:');
    console.log('🔍 student_id:', student_id);
    console.log('🔍 projectId:', projectId);
    console.log('🔍 status filter:', status);

    // Use service-role client to bypass RLS and get latest data
    const freshSupabase = getFreshSupabaseClient();
    
    let query = freshSupabase
      .from('tasks')
      .select(`
        *,
        projects!inner(title, id, courses!inner(course_name)),
        project_phases!inner(title, phase_number, start_date, end_date),
        studentaccounts!tasks_assigned_by_fkey(first_name, last_name),
        task_submissions(*),
        revision_submissions(*)
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true);

    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: tasks, error: tasksError } = await query
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('Get my tasks error:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('🔍 Raw tasks from database:', tasks?.map(t => ({ 
      title: t.title, 
      status: t.status, 
      current_attempts: t.current_attempts,
      submissions: t.task_submissions?.length || 0,
      revision_submissions: t.revision_submissions?.length || 0,
      revision_submissions_data: t.revision_submissions
    })));
    
    // Check specifically for tasks with 'to_revise' status
    const reviseTasks = tasks?.filter(t => t.status === 'to_revise');
    console.log('🔍 Tasks with to_revise status:', reviseTasks?.length || 0, reviseTasks?.map(t => ({ 
      title: t.title, 
      status: t.status,
      id: t.id
    })));
    
    // Check specifically for the "TASK FOR MEMBER LEADER" task
    const specificTask = tasks?.find(t => t.id === '50eff75f-bb40-476b-b191-5babcb2d2a4f');
    console.log('🔍 Specific task "TASK FOR MEMBER LEADER":', specificTask ? {
      id: specificTask.id,
      title: specificTask.title,
      status: specificTask.status,
      assigned_to: specificTask.assigned_to,
      project_id: specificTask.project_id
    } : 'NOT FOUND');

    // ✅ ENHANCED: Add phase status calculation
    const enhancedTasks = tasks?.map(task => {
      const phase = task.project_phases;
      const now = new Date();
      const phaseStart = new Date(phase.start_date);
      const phaseEnd = new Date(phase.end_date);
      
      let phaseStatus = 'upcoming';
      if (now >= phaseStart && now <= phaseEnd) {
        phaseStatus = 'active';
      } else if (now > phaseEnd) {
        phaseStatus = 'completed';
      }
      
      return {
        ...task,
        phase_status: phaseStatus,
        phase_info: {
          title: phase.title,
          phase_number: phase.phase_number,
          status: phaseStatus,
          start_date: phase.start_date,
          end_date: phase.end_date
        }
      };
    }) || [];

    res.json(enhancedTasks);
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW ENDPOINT: Get all of the current user's tasks across all projects (for Course Overview)
app.get('/api/student/all-my-tasks', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('🔍 /api/student/all-my-tasks called for student:', student_id);

    // Use service-role client to bypass RLS
    const freshSupabase = getFreshSupabaseClient();
    
    const { data: tasks, error: tasksError } = await freshSupabase
      .from('tasks')
      .select(`
        *,
        projects(id, title),
        project_phases(id, title, phase_number, start_date, end_date)
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true)
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('❌ Error fetching all user tasks:', tasksError);
      return res.status(500).json({ 
        success: false,
        error: tasksError.message 
      });
    }

    console.log(`✅ Found ${tasks?.length || 0} tasks for user`);

    // Enhance tasks with phase information
    const enhancedTasks = tasks?.map(task => {
      const phase = task.project_phases;
      const now = new Date();
      const phaseStart = new Date(phase.start_date);
      const phaseEnd = new Date(phase.end_date);
      
      let phaseStatus = 'upcoming';
      if (now >= phaseStart && now <= phaseEnd) {
        phaseStatus = 'active';
      } else if (now > phaseEnd) {
        phaseStatus = 'completed';
      }
      
      return {
        ...task,
        project_name: task.projects?.title || 'Unknown Project',
        project_id: task.projects?.id || task.project_id,
        phase_info: {
          title: phase.title,
          phase_number: phase.phase_number,
          status: phaseStatus,
          start_date: phase.start_date,
          end_date: phase.end_date
        }
      };
    }) || [];

    res.json({
      success: true,
      tasks: enhancedTasks,
      count: enhancedTasks.length
    });
  } catch (error) {
    console.error('❌ Get all user tasks error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// NEW ENDPOINT: Get group members' tasks and submissions for Activities view
app.get('/api/student/group-tasks-submissions', authenticateStudent, async (req, res) => {
  try {
    const leader_id = req.user.id;
    const { projectId, phaseId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    console.log('🔍 /api/student/group-tasks-submissions called');
    console.log('🔍 leader_id:', leader_id);
    console.log('🔍 projectId:', projectId);
    console.log('🔍 phaseId:', phaseId);

    const freshSupabase = getFreshSupabaseClient();

    // STEP 1: Get the leader's group for this course/project
    const { data: project, error: projectError } = await freshSupabase
      .from('projects')
      .select('course_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // STEP 2: Get all groups in this course and find the leader's group
    const { data: courseGroups, error: groupsError } = await freshSupabase
      .from('course_groups')
      .select('id')
      .eq('course_id', project.course_id);

    if (groupsError || !courseGroups) {
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    const groupIds = courseGroups.map(g => g.id);

    // STEP 3: Find which group contains the leader
    const { data: leaderMembership, error: leaderError } = await freshSupabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', leader_id)
      .in('group_id', groupIds)
      .single();

    if (leaderError || !leaderMembership) {
      console.log('❌ Leader not in any group for this project');
      return res.json({ tasks: [] });
    }

    const leaderGroupId = leaderMembership.group_id;
    console.log('✅ Leader group ID:', leaderGroupId);

    // STEP 4: Get all members in the leader's group
    const { data: groupMembers, error: membersError } = await freshSupabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', leaderGroupId);

    if (membersError || !groupMembers) {
      return res.json({ tasks: [] });
    }

    const memberIds = groupMembers.map(m => m.student_id);
    console.log('✅ Group member count:', memberIds.length);

    // STEP 5: Get all tasks assigned to group members in this project
    let taskQuery = freshSupabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        created_at,
        assigned_to,
        project_id,
        phase_id,
        max_attempts,
        file_types_allowed,
        task_submissions(
          *,
          studentaccounts!task_submissions_submitted_by_fkey(
            profile_image_url
          )
        )
      `)
      .eq('project_id', projectId)
      .in('assigned_to', memberIds)
      .eq('is_active', true);

    if (phaseId) {
      taskQuery = taskQuery.eq('phase_id', phaseId);
    }

    const { data: tasks, error: tasksError } = await taskQuery
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('❌ Error fetching group member tasks:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('✅ Found tasks:', tasks?.length || 0);

    res.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('❌ /api/student/group-tasks-submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});




// Get Student Project Dashboard
// Student project dashboard with comprehensive data
app.get('/api/student/projects/:projectId/dashboard', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📊 === STUDENT PROJECT DASHBOARD START ===');
    console.log('📊 Project ID:', projectId);
    console.log('📊 Student ID:', student_id);

    // Verify student has access to this project through group membership
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(
            projects!inner(id)
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .eq('course_groups.courses.projects.id', projectId)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    console.log('✅ Student has access to project via group:', membership.course_groups.group_name);

    // Get complete project data WITH evaluation forms
    // ✅ FIX: Don't try to select non-existent fields from project_phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(
          *
        ),
        project_evaluation_forms(
          id,
          available_from,
          due_date,
          form_type
        ),
        courses(course_name, course_code, section)
      `)
      .eq('id', projectId)
      .single();

    console.log('📅 [PROJECT QUERY] Error:', projectError);
    console.log('📅 [PROJECT QUERY] Project found:', !!project);
    console.log('📅 [PROJECT QUERY] Project phases count:', project?.project_phases?.length);
    console.log('📅 [PROJECT QUERY] Project phases:', JSON.stringify(project?.project_phases, null, 2));

    if (projectError || !project) {
      console.error('❌ Project query failed or no project found');
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get group information
    const group = membership.course_groups;
    
    console.log('📅 [PRE-CHECK] project.project_phases exists:', !!project.project_phases);
    console.log('📅 [PRE-CHECK] project.project_phases is array:', Array.isArray(project.project_phases));
    console.log('📅 [PRE-CHECK] project.project_phases length:', project.project_phases?.length);
    
    // NOW fetch phase_evaluation_forms separately and merge them
    if (project.project_phases && Array.isArray(project.project_phases) && project.project_phases.length > 0) {
      console.log('📅 [FETCHING EVAL FORMS] Getting phase_evaluation_forms for phases:', project.project_phases.map(p => p.id).join(', '));
      
      const phaseIds = project.project_phases.map(p => p.id);
      console.log('📅 [FETCHING] Phase IDs to query:', phaseIds);
      
      const { data: phaseEvalForms, error: evalFormsError } = await supabase
        .from('phase_evaluation_forms')
        .select('id, phase_id, available_from, due_date')
        .in('phase_id', phaseIds);
      
      console.log('📅 [QUERY RESULT] Error:', evalFormsError);
      console.log('📅 [QUERY RESULT] Data count:', phaseEvalForms?.length || 0);
      console.log('📅 [QUERY RESULT] Raw data:', phaseEvalForms);
      
      if (evalFormsError) {
        console.error('❌ Error fetching phase evaluation forms:', evalFormsError);
      }
      
      if (phaseEvalForms && phaseEvalForms.length > 0) {
        console.log('📅 [EVAL FORMS RECEIVED]:', phaseEvalForms);
        
        // Create a map of phase_id -> evaluation form
        const evalFormsMap = {};
        (phaseEvalForms || []).forEach(form => {
          evalFormsMap[form.phase_id] = form;
        });
        
        console.log('📅 [EVAL FORMS MAP]:', evalFormsMap);
        
        // Merge the evaluation forms into project_phases
        project.project_phases = project.project_phases.map(phase => {
          const evalForm = evalFormsMap[phase.id];
          console.log(`📅 [MERGE PHASE ${phase.phase_number}] Found eval form:`, evalForm);
          return {
            ...phase,
            phase_evaluation_form_id: evalForm?.id || null, // ✅ ADD: Form ID for submissions
            evaluation_available_from: evalForm?.available_from || null,
            evaluation_due_date: evalForm?.due_date || null
          };
        });
      } else {
        console.warn('⚠️  No phase evaluation forms found - setting all to null');
        // Still set the fields to null so frontend knows they were checked
        project.project_phases = project.project_phases.map(phase => ({
          ...phase,
          phase_evaluation_form_id: null, // ✅ ADD: No form ID if no form exists
          evaluation_available_from: null,
          evaluation_due_date: null
        }));
      }
    }
    
    console.log('📅 [FLATTENED] After flattening:', project.project_phases.map(p => ({
      id: p.id,
      phase_number: p.phase_number,
      evaluation_available_from: p.evaluation_available_from,
      evaluation_due_date: p.evaluation_due_date
    })));

    // Get all group members
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        studentaccounts!inner(first_name, last_name, student_number, email, profile_image_url)
      `)
      .eq('group_id', group.id)
      .eq('is_active', true);

    // Get tasks based on role
    let tasks = [];
    if (membership.role === 'leader') {
      // Leaders see all group tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          studentaccounts!tasks_assigned_to_fkey(first_name, last_name, student_number),
          project_phases(title, phase_number),
          task_submissions(*)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!tasksError) {
        tasks = allTasks || [];
      }
    } else {
      // Members see only their tasks
      const { data: myTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project_phases(title, phase_number),
          task_submissions(*)
        `)
        .eq('project_id', projectId)
        .eq('assigned_to', student_id)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (!tasksError) {
        tasks = myTasks || [];
      }
    }

    // Calculate statistics
    const myTasks = tasks.filter(task => task.assigned_to === student_id);
    const stats = {
      totalTasks: myTasks.length,
      completedTasks: myTasks.filter(t => t.status === 'completed').length,
      pendingTasks: myTasks.filter(t => t.status === 'pending').length,
      inProgressTasks: myTasks.filter(t => t.status === 'in_progress').length
    };

    console.log('📊 Dashboard stats calculated:', stats);
    console.log('📊 === STUDENT PROJECT DASHBOARD COMPLETE ===');

    // 🔴 DEBUG: Show what's being returned
    console.log('📤 [RESPONSE] Project phases with evaluation dates:', project.project_phases?.map(p => ({
      phase_number: p.phase_number,
      evaluation_available_from: p.evaluation_available_from,
      evaluation_due_date: p.evaluation_due_date
    })));
    
    console.log('📤 [RESPONSE FULL PROJECT]:', JSON.stringify({
      title: project.title,
      breathe_phase_days: project.breathe_phase_days,
      project_evaluation_forms: project.project_evaluation_forms,
      phases: project.project_phases?.map(p => ({
        id: p.id,
        phase_number: p.phase_number,
        evaluation_available_from: p.evaluation_available_from,
        evaluation_due_date: p.evaluation_due_date
      }))
    }, null, 2));

    res.json({
      project,
      group,
      groupMembers: groupMembers || [],
      myTasks: tasks,
      userRole: membership.role,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Student project dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Task assignment (leaders only)

// Submit Evaluation Form
app.post('/api/student/phases/:phaseId/evaluate', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const { evaluationData } = req.body; // Object with ratings and comments

    // Get student's group for this phase
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        course_groups!inner(
          courses!inner(
            projects!inner(
              project_phases!inner(id)
            )
          )
        )
      `)
      .eq('student_id', req.user.id)
      .eq('is_active', true)
      .eq('course_groups.courses.projects.project_phases.id', phaseId)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Not authorized for this phase' });
    }

    // Check if already submitted
    const { data: existing } = await supabase
      .from('evaluation_forms')
      .select('id')
      .eq('phase_id', phaseId)
      .eq('evaluator_id', req.user.id)
      .eq('group_id', membership.group_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Evaluation already submitted' });
    }

    // Create evaluation
    const { data: evaluation, error: evaluationError } = await supabase
      .from('evaluation_forms')
      .insert([{
        phase_id: phaseId,
        evaluator_id: req.user.id,
        group_id: membership.group_id,
        evaluation_data: JSON.stringify(evaluationData)
      }])
      .select()
      .single();

    if (evaluationError) {
      console.error('Submit evaluation error:', evaluationError);
      return res.status(500).json({ error: evaluationError.message });
    }

    res.json({ 
      message: 'Evaluation submitted successfully',
      evaluation
    });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Course Projects (for students)
app.get('/api/student/course/:courseId/projects', authenticateStudent, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify student is enrolled in course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get projects for this course WITH evaluation forms
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(
          *,
          phase_evaluation_forms(id, available_from, due_date, phase_id)
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false});

    if (projectsError) {
      console.error('Get course projects error:', projectsError);
      return res.status(500).json({ error: projectsError.message });
    }

    // For each project, check if student has group and get their role
    const projectsWithStatus = await Promise.all(
      projects.map(async (project) => {
        const { data: membership } = await supabase
          .from('course_group_members')
          .select(`
            role,
            course_groups!inner(
              group_name,
              courses!inner(
                projects!inner(id)
              )
            )
          `)
          .eq('student_id', req.user.id)
          .eq('is_active', true)
          .eq('course_groups.courses.projects.id', project.id)
          .single();

        // ✅ Flatten phase evaluation forms data
        const phasesWithEvals = (project.project_phases || []).map(phase => {
          const phaseEvalForm = (phase.phase_evaluation_forms || [])[0]; // Get first (should be only one)
          return {
            ...phase,
            phase_evaluation_form_id: phaseEvalForm?.id || null, // ✅ ADD: Form ID for submissions
            evaluation_available_from: phaseEvalForm?.available_from || null,
            evaluation_due_date: phaseEvalForm?.due_date || null,
            phase_evaluation_forms: undefined // Remove nested array for cleaner response
          };
        });

        return {
          ...project,
          project_phases: phasesWithEvals,
          studentRole: membership?.role || null,
          groupName: membership?.course_groups?.group_name || null,
          hasGroup: !!membership
        };
      })
    );

    res.json(projectsWithStatus);
  } catch (error) {
    console.error('Get student course projects error:', error);
    res.status(500).json({ error: error.message });
  }
});




// =================== ENHANCED GROUP ENDPOINTS ===================

// Fixed student group dashboard - this addresses the main issue
// Enhanced student dashboard group detection with proper error handling
app.get('/api/student/dashboard/groups', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('🎓 === STUDENT DASHBOARD GROUPS START ===');
    console.log('🎓 Student ID:', student_id);
    console.log('🎓 Student email:', req.user.email);
    
    // Create fresh connection to ensure we get latest data
    const freshSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-request-id': `student-groups-${Date.now()}`
          }
        }
      }
    );

    // Get student's group memberships with enhanced data
    const { data: groupMemberships, error: membershipError } = await freshSupabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(*)
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true);

    if (membershipError) {
      console.error('❌ Group membership query error:', membershipError);
      return res.status(500).json({ error: membershipError.message });
    }

    console.log('📝 Group memberships found:', groupMemberships?.length || 0);

    if (!groupMemberships || groupMemberships.length === 0) {
      console.log('📝 No group memberships found for student');
      return res.json({
        success: true,
        data: [],
        message: 'No group assignments found'
      });
    }

    // Process each group membership
    const enhancedData = await Promise.all(
      groupMemberships.map(async (membership) => {
        const group = membership.course_groups;
        const course = group.courses;
        
        console.log(`🔍 Processing group: ${group.group_name} in course: ${course.course_name}`);

        // Get all group members
        const { data: allMembers, error: membersError } = await freshSupabase
          .from('course_group_members')
          .select(`
            *,
            studentaccounts!inner(first_name, last_name, student_number, email, profile_image_url)
          `)
          .eq('group_id', group.id)
          .eq('is_active', true);

        if (membersError) {
          console.error('⚠️ Members lookup error:', membersError);
        }

        // Get active projects for this course
        const { data: projects, error: projectsError } = await freshSupabase
          .from('projects')
          .select(`
            *,
            project_phases(*)
          `)
          .eq('course_id', course.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (projectsError) {
          console.error('⚠️ Projects lookup error:', projectsError);
        }

        return {
          id: membership.id,
          group_id: group.id,
          group_name: group.group_name,
          group_number: group.group_number,
          role: membership.role,
          position: membership.position,
          course_id: course.id,
          course_name: course.course_name,
          course_code: course.course_code,
          section: course.section,
          members: allMembers || [],
          projects: projects || [],
          assigned_at: membership.assigned_at,
          last_updated: new Date().toISOString()
        };
      })
    );

    console.log('✅ Enhanced dashboard data prepared:', enhancedData.length);
    console.log('🎓 === STUDENT DASHBOARD GROUPS COMPLETE ===');

    res.json({
      success: true,
      data: enhancedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Student dashboard groups error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch group data',
      details: error.message 
    });
  }
});

// Real-time group status endpoint
app.get('/api/student/group-status/:groupId', authenticateStudent, async (req, res) => {
  try {
    const { groupId } = req.params;
    const student_id = req.user.id;

    // Check if student is in this group
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get current group status
    const { data: groupData, error: groupError } = await supabase
      .from('course_groups')
      .select(`
        *,
        course_group_members!inner(
          *,
          studentaccounts!inner(first_name, last_name, student_number)
        )
      `)
      .eq('id', groupId)
      .single();

    if (groupError) {
      return res.status(500).json({ error: groupError.message });
    }

    res.json({
      group: groupData,
      userRole: membership.role,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Group status error:', error);
    res.status(500).json({ error: error.message });
  }
});



// =================== FILE UPLOAD VALIDATION ===================

// Enhanced file upload with phase-specific validation
app.post('/api/student/upload-file', authenticateStudent, upload.single('file'), async (req, res) => {
  try {
    const { projectId, phaseId, taskId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('📎 Enhanced file upload request:', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      projectId,
      phaseId,
      taskId
    });

    let allowedTypes = [];
    let maxSize = 10; // Default 10MB
    let context = 'project';

    // Priority: Phase-specific > Project-specific
    if (phaseId) {
      const { data: phase, error: phaseError } = await supabase
        .from('project_phases')
        .select('file_types_allowed, project_id')
        .eq('id', phaseId)
        .single();

      if (phaseError) {
        return res.status(404).json({ error: 'Phase not found' });
      }

      if (phase.file_types_allowed) {
        allowedTypes = JSON.parse(phase.file_types_allowed);
        context = `phase`;
      }

      // Get project info for max size
      const { data: project } = await supabase
        .from('projects')
        .select('max_file_size_mb')
        .eq('id', phase.project_id)
        .single();

      if (project) {
        maxSize = project.max_file_size_mb || 10;
      }
    } else if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('file_types_allowed, max_file_size_mb')
        .eq('id', projectId)
        .single();

      if (projectError) {
        return res.status(404).json({ error: 'Project not found' });
      }

      allowedTypes = JSON.parse(project.file_types_allowed || '["pdf"]');
      maxSize = project.max_file_size_mb || 10;
      context = 'project';
    }

    // Validate file type
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return res.status(400).json({ 
        error: `Invalid file type for ${context}. Allowed types: ${allowedTypes.join(', ')}`,
        provided: fileExtension,
        context: context
      });
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return res.status(400).json({ 
        error: `File too large for ${context}. Maximum size: ${maxSize}MB`,
        providedSize: Math.round(file.size / 1024 / 1024 * 100) / 100 + 'MB',
        context: context
      });
    }

    // Upload to storage
    const fileName = `${req.user.id}/${Date.now()}_${file.originalname}`;
    const bucketName = taskId ? 'task-submissions' : phaseId ? 'phase-submissions' : 'project-submissions';

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
    }

    console.log('✅ File uploaded successfully for', context, ':', fileName);

    res.json({ 
      message: `File uploaded successfully for ${context}`,
      fileName: fileName,
      originalName: file.originalname,
      fileSize: file.size,
      fileType: fileExtension,
      uploadedTo: context
    });

  } catch (error) {
    console.error('Enhanced file upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== REAL-TIME UPDATES ===================

// WebSocket-like endpoint for real-time group updates
app.get('/api/student/group-updates/:studentId', authenticateStudent, async (req, res) => {
  const { studentId } = req.params;
  
  // Verify student can only access their own updates
  if (studentId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial data
  const sendUpdate = async () => {
    try {
      const { data: dashboardData } = await supabase
        .rpc('get_student_dashboard_data', { student_uuid: studentId });
      
      res.write(`data: ${JSON.stringify({ 
        type: 'dashboard_update', 
        data: dashboardData,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      console.error('SSE update error:', error);
    }
  };

  // Send initial update
  sendUpdate();

  // Send updates every 30 seconds
  const interval = setInterval(sendUpdate, 30000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Enhanced group assignment endpoint with notifications
app.post('/api/professor/course/:courseId/assign-student-enhanced', authenticateProfessor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId, groupId, role } = req.body;
    
    // Verify professor owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', req.user.id)
      .single();
    
    if (courseError || !course) {
      return res.status(403).json({ error: 'Unauthorized or course not found' });
    }

    // Check if student is already in a group for this course
    const { data: existingMember } = await supabase
      .from('course_group_members')
      .select('*, course_groups!inner(course_id)')
      .eq('student_id', studentId)
      .eq('course_groups.course_id', courseId)
      .eq('is_active', true)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'Student is already assigned to a group in this course' });
    }

    // Assign student to group
    const { data: assignment, error: assignError } = await supabase
      .from('course_group_members')
      .insert([{
        group_id: groupId,
        student_id: studentId,
        role: role || 'member',
        position: role || 'member',
        assigned_by: req.user.id,
        assigned_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (assignError) {
      return res.status(500).json({ error: assignError.message });
    }

    // Update group member count
    await supabase.rpc('increment_group_member_count', { group_id: groupId });

    console.log('✅ Student assigned to group with real-time notification');

    res.json({ 
      message: 'Student assigned to group successfully',
      assignment,
      notificationSent: true
    });

  } catch (error) {
    console.error('Enhanced group assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Add this to your server file temporarily
app.get('/api/debug/specific-students', authenticateAdmin, async (req, res) => {
  try {
    const studentNames = ['Marshalle Nopi Soriano', 'Ivy Bumagat'];
    
    const results = [];
    
    for (const fullName of studentNames) {
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      // Find the student
      const { data: student, error } = await supabase
        .from('studentaccounts')
        .select('*')
        .or(`and(first_name.eq.${firstName},last_name.eq.${lastName}),full_name.eq.${fullName}`)
        .single();
      
      if (student) {
        // Check storage buckets
        const buckets = ['studentaccounts', 'pending_studentaccounts'];
        const storageCheck = {};
        
        for (const bucket of buckets) {
          try {
            // List files in student's folder
            const { data: files, error: listError } = await supabase.storage
              .from(bucket)
              .list(student.id);
            
            storageCheck[bucket] = {
              hasFolder: !listError,
              files: files || [],
              fileCount: files?.length || 0
            };
            
            // If profile_image_url exists, try to download it
            if (student.profile_image_url) {
              const { data: file, error: downloadError } = await supabase.storage
                .from(bucket)
                .download(`${student.id}/${student.profile_image_url}`);
              
              storageCheck[bucket].profileImageTest = {
                accessible: !downloadError,
                error: downloadError?.message || null,
                size: file?.size || null
              };
            }
          } catch (bucketError) {
            storageCheck[bucket] = { error: bucketError.message };
          }
        }
        
        results.push({
          fullName,
          student: {
            id: student.id,
            email: student.email,
            profile_image_url: student.profile_image_url
          },
          storageCheck
        });
      } else {
        results.push({
          fullName,
          error: 'Student not found in database'
        });
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student notifications
app.get('/api/student/notifications', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;

    console.log('🔔 === STUDENT NOTIFICATIONS START ===');
    console.log('🔔 Student ID:', student_id);

    // Get task-related notifications
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects(title),
        task_submissions(status, reviewed_at, review_comments)
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true);

    const notifications = [];

    if (tasks && !tasksError) {
      tasks.forEach(task => {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const isOverdue = dueDate < now && task.status !== 'completed';
        const dueSoon = (dueDate - now) / (1000 * 60 * 60 * 24) <= 2 && !isOverdue;

        if (isOverdue) {
          notifications.push({
            id: `overdue-${task.id}`,
            type: 'overdue',
            priority: 'high',
            title: 'Overdue Task',
            message: `Task "${task.title}" is overdue`,
            date: task.due_date,
            taskId: task.id
          });
        } else if (dueSoon) {
          notifications.push({
            id: `due-soon-${task.id}`,
            type: 'due_soon',
            priority: 'medium',
            title: 'Task Due Soon',
            message: `Task "${task.title}" is due soon`,
            date: task.due_date,
            taskId: task.id
          });
        }

        // Check for feedback
        if (task.task_submissions && task.task_submissions.length > 0) {
          const latestSubmission = task.task_submissions[task.task_submissions.length - 1];
          if (latestSubmission.status === 'reviewed' && latestSubmission.review_comments) {
            notifications.push({
              id: `feedback-${task.id}`,
              type: 'feedback',
              priority: 'medium',
              title: 'New Feedback',
              message: `You have new feedback on "${task.title}"`,
              date: latestSubmission.reviewed_at,
              taskId: task.id
            });
          }
        }
      });
    }

    // Sort by priority and date
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.date) - new Date(a.date);
    });

    console.log('🔔 Notifications generated:', notifications.length);
    console.log('🔔 === STUDENT NOTIFICATIONS COMPLETE ===');

    res.json(notifications);

  } catch (error) {
    console.error('💥 Student notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});


// All group tasks (leaders only)
app.get('/api/student/projects/:projectId/all-tasks', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📋 === ALL GROUP TASKS START ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Leader ID:', student_id);

    // Verify student is a leader in this project
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          courses!inner(
            projects!inner(id)
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true)
      .eq('course_groups.courses.projects.id', projectId)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Only group leaders can view all tasks' });
    }

    console.log('✅ Leader verification passed');

    // Get all tasks for this project and group
    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        studentaccounts!tasks_assigned_to_fkey(first_name, last_name, student_number, email),
        project_phases(title, phase_number),
        task_submissions(
          *,
          studentaccounts!task_submissions_submitted_by_fkey(first_name, last_name)
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Tasks query error:', tasksError);
      return res.status(500).json({ error: tasksError.message });
    }

    console.log('✅ All tasks retrieved:', allTasks?.length || 0);
    console.log('📋 === ALL GROUP TASKS COMPLETE ===');

    res.json(allTasks || []);

  } catch (error) {
    console.error('💥 All group tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Task review (leaders only)
app.post('/api/student/submissions/:submissionId/review', authenticateStudent, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const student_id = req.user.id;
    const { status, reviewComments } = req.body; // 'approved', 'revision_requested', 'rejected'

    console.log('👁️ === TASK REVIEW START ===');
    console.log('👁️ Submission ID:', submissionId);
    console.log('👁️ Reviewer ID:', student_id);
    console.log('👁️ Review status:', status);

    // Verify student is leader and submission belongs to their group
    const { data: submission, error: submissionError } = await supabase
      .from('task_submissions')
      .select(`
        *,
        tasks!inner(
          project_id,
          assigned_to,
          assigned_by
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.tasks.assigned_by !== student_id) {
      return res.status(403).json({ error: 'Not authorized to review this submission' });
    }

    console.log('✅ Leader authorization verified');

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('task_submissions')
      .update({
        status,
        review_comments: reviewComments,
        reviewed_by: student_id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Review submission error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Update task status based on review
    let taskStatus = 'in_progress';
    if (status === 'approved') {
      taskStatus = 'completed';
    } else if (status === 'revision_requested') {
      taskStatus = 'to_revise';
    }

    await supabase
      .from('tasks')
      .update({ status: taskStatus })
      .eq('id', submission.task_id);

    console.log('✅ Task review completed successfully');
    console.log('👁️ === TASK REVIEW COMPLETE ===');

    res.json({ 
      message: 'Submission reviewed successfully',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('💥 Task review error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for student authentication
app.get('/api/debug/student-auth', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    
    console.log('🔍 === STUDENT AUTH DEBUG START ===');
    console.log('🔍 Student ID from auth:', student_id);
    console.log('🔍 Student email:', req.user.email);

    // Check if student exists in database
    const { data: student, error: studentError } = await supabase
      .from('studentaccounts')
      .select('*')
      .eq('id', student_id)
      .single();

    console.log('👤 Student lookup result:', {
      found: !!student,
      error: studentError?.message || 'none'
    });

    // Check group memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups(group_name, course_id),
        courses(course_name)
      `)
      .eq('student_id', student_id)
      .eq('is_active', true);

    console.log('👥 Group memberships:', {
      count: memberships?.length || 0,
      error: membershipError?.message || 'none',
      memberships: memberships || []
    });

    console.log('🔍 === STUDENT AUTH DEBUG COMPLETE ===');

    res.json({
      authenticated: true,
      student: student ? {
        id: student.id,
        email: student.email,
        name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number
      } : null,
      groupMemberships: memberships || [],
      debugInfo: {
        authUserId: student_id,
        authUserEmail: req.user.email,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Student auth debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== ADDITIONAL STUDENT ENDPOINTS ===================




// Student evaluations endpoint
app.get('/api/student/evaluations', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;

    console.log('📝 === STUDENT EVALUATIONS START ===');
    console.log('📝 Student ID:', student_id);

    // Get student's evaluations
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('evaluation_forms')
      .select(`
        *,
        project_phases(title, phase_number, projects(title)),
        course_groups(group_name)
      `)
      .eq('evaluator_id', student_id)
      .order('created_at', { ascending: false });

    if (evaluationsError) {
      console.error('❌ Evaluations query error:', evaluationsError);
      return res.status(500).json({ error: evaluationsError.message });
    }

    // Format evaluations
    const formattedEvaluations = evaluations?.map(evaluation => ({
      id: evaluation.id,
      phase_name: evaluation.project_phases?.title || `Phase ${evaluation.project_phases?.phase_number}`,
      project_name: evaluation.project_phases?.projects?.title,
      evaluation_type: evaluation.evaluation_type || 'Peer Evaluation',
      status: evaluation.status || 'completed',
      submitted_at: evaluation.created_at,
      group_name: evaluation.course_groups?.group_name
    })) || [];

    console.log('✅ Evaluations retrieved:', formattedEvaluations.length);
    console.log('📝 === STUDENT EVALUATIONS COMPLETE ===');

    res.json(formattedEvaluations);

  } catch (error) {
    console.error('💥 Student evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get evaluations for a specific project (both phase-level and project-level)
app.get('/api/student/projects/:projectId/evaluations', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📝 === PROJECT EVALUATIONS START ===');
    console.log('📝 Project ID:', projectId);
    console.log('📝 Student ID:', student_id);

    // Get the project with its phases
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_phases(*)
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('❌ Project query error:', projectError);
      return res.status(500).json({ error: projectError.message });
    }

    const now = new Date();
    const evaluations = [];

    // Get phase-level evaluations for current/completed phases
    if (project.project_phases && project.project_phases.length > 0) {
      for (const phase of project.project_phases) {
        // Phase-level built-in evaluations
        const { data: phaseBuiltInForms, error: phaseFormError } = await supabase
          .from('phase_evaluation_forms')
          .select(`
            *,
            phase_evaluation_criteria(*)
          `)
          .eq('phase_id', phase.id);

        if (!phaseFormError && phaseBuiltInForms) {
          for (const form of phaseBuiltInForms) {
            const availableFrom = new Date(form.available_from);
            const dueDate = new Date(form.due_date);

            evaluations.push({
              id: `phase-builtin-${form.id}`,
              type: 'phase_builtin',
              phase_id: phase.id,
              phase_name: phase.title,
              phase_number: phase.phase_number,
              form_id: form.id,
              title: `Peer Evaluation - ${phase.title}`,
              description: form.instructions || 'Rate your team members on their contributions',
              available_from: form.available_from,
              due_date: form.due_date,
              total_points: form.total_points,
              criteria: form.phase_evaluation_criteria || [],
              status: now < availableFrom ? 'pending' : now > dueDate ? 'due' : 'active',
              is_available: now >= availableFrom,
              is_past_due: now > dueDate,
              evaluation_type: 'builtin'
            });
          }
        }

        // Phase-level custom evaluations
        const { data: phaseCustomForms, error: phaseCustomError } = await supabase
          .from('phase_custom_evaluations')
          .select('*')
          .eq('phase_id', phase.id);

        if (!phaseCustomError && phaseCustomForms) {
          for (const form of phaseCustomForms) {
            const availableFrom = new Date(form.available_from);
            const dueDate = new Date(form.due_date);

            evaluations.push({
              id: `phase-custom-${form.id}`,
              type: 'phase_custom',
              phase_id: phase.id,
              phase_name: phase.title,
              phase_number: phase.phase_number,
              form_id: form.id,
              title: `Peer Evaluation - ${phase.title}`,
              description: 'Download and complete the evaluation form',
              available_from: form.available_from,
              due_date: form.due_date,
              file_name: form.file_name,
              file_url: form.file_url,
              status: now < availableFrom ? 'pending' : now > dueDate ? 'due' : 'active',
              is_available: now >= availableFrom,
              is_past_due: now > dueDate,
              evaluation_type: 'custom'
            });
          }
        }
      }
    }

    // Get project-level evaluations (only show after all phases are complete)
    const allPhasesComplete = project.project_phases && project.project_phases.length > 0 && 
                              project.project_phases.every(p => new Date() > new Date(p.end_date));

    if (allPhasesComplete) {
      // Project-level built-in evaluations
      const { data: projectBuiltInForms, error: projectFormError } = await supabase
        .from('project_evaluation_forms')
        .select(`
          *,
          project_evaluation_criteria(*)
        `)
        .eq('project_id', projectId);

      if (!projectFormError && projectBuiltInForms) {
        for (const form of projectBuiltInForms) {
          const availableFrom = new Date(form.available_from);
          const dueDate = new Date(form.due_date);

          evaluations.push({
            id: `project-builtin-${form.id}`,
            type: 'project_builtin',
            project_id: projectId,
            form_id: form.id,
            title: 'Final Project Evaluation',
            description: form.instructions || 'Complete the final evaluation for this project',
            available_from: form.available_from,
            due_date: form.due_date,
            total_points: form.total_points,
            criteria: form.project_evaluation_criteria || [],
            status: now < availableFrom ? 'pending' : now > dueDate ? 'due' : 'active',
            is_available: now >= availableFrom,
            is_past_due: now > dueDate,
            evaluation_type: 'builtin'
          });
        }
      }

      // Project-level custom evaluations
      const { data: projectCustomForms, error: projectCustomError } = await supabase
        .from('project_evaluation_forms')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_custom_evaluation', true);

      if (!projectCustomError && projectCustomForms) {
        for (const form of projectCustomForms) {
          const availableFrom = new Date(form.available_from);
          const dueDate = new Date(form.due_date);

          evaluations.push({
            id: `project-custom-${form.id}`,
            type: 'project_custom',
            project_id: projectId,
            form_id: form.id,
            title: 'Final Project Evaluation',
            description: 'Download and complete the final evaluation form',
            available_from: form.available_from,
            due_date: form.due_date,
            file_name: form.custom_file_name,
            file_url: form.custom_file_url,
            status: now < availableFrom ? 'pending' : now > dueDate ? 'due' : 'active',
            is_available: now >= availableFrom,
            is_past_due: now > dueDate,
            evaluation_type: 'custom'
          });
        }
      }
    }

    // Filter to only show evaluations that are available or about to be due
    const availableEvaluations = evaluations.filter(e => e.is_available || e.status === 'active');

    console.log(`✅ Retrieved ${availableEvaluations.length} evaluations for project`);
    console.log('📝 === PROJECT EVALUATIONS COMPLETE ===');

    res.json(availableEvaluations);

  } catch (error) {
    console.error('💥 Project evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit evaluation (both custom and built-in)
app.post('/api/student/evaluations/:evaluationId/submit', authenticateStudent, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const student_id = req.user.id;
    const { file_data, file_name, evaluation_type, evaluated_member_id, scores } = req.body;

    console.log('📝 === EVALUATION SUBMISSION START ===');
    console.log('📝 Evaluation ID:', evaluationId);
    console.log('📝 Student ID:', student_id);
    console.log('📝 Evaluation Type:', evaluation_type);

    // Parse the evaluation ID to determine type and form ID
    const [typePrefix, dbId] = evaluationId.split('-').slice(0, 2).join('-').split('-');
    const actualFormId = evaluationId.split('-').pop();

    if (evaluation_type === 'custom') {
      // Handle custom evaluation submission (PDF form)
      if (!file_data || !file_name) {
        return res.status(400).json({ error: 'File data and name required for custom evaluation' });
      }

      const { data, error } = await supabase
        .from('evaluation_submissions')
        .insert({
          form_id: actualFormId,
          evaluated_by_user_id: student_id,
          submission_type: 'custom',
          file_data: file_data,
          file_name: file_name,
          submitted_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error inserting custom evaluation submission:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ Custom evaluation submitted');
      res.json({ success: true, message: 'Custom evaluation submitted' });

    } else if (evaluation_type === 'builtin') {
      // Handle built-in evaluation submission (form with scores)
      if (!evaluated_member_id || !scores) {
        return res.status(400).json({ error: 'Member ID and scores required for built-in evaluation' });
      }

      // Store individual criterion scores
      const scoreEntries = Object.entries(scores).map(([criterionId, points]) => ({
        evaluation_id: actualFormId,
        criterion_id: criterionId,
        evaluated_by_user_id: student_id,
        evaluated_member_id: evaluated_member_id,
        points: points,
        submitted_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('evaluation_submissions')
        .insert(scoreEntries);

      if (error) {
        console.error('❌ Error inserting built-in evaluation submission:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ Built-in evaluation submitted for member:', evaluated_member_id);
      res.json({ success: true, message: 'Built-in evaluation submitted' });

    } else {
      return res.status(400).json({ error: 'Invalid evaluation type' });
    }

  } catch (error) {
    console.error('💥 Evaluation submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Task submission with enhanced file handling
app.post('/api/student/tasks/:taskId/submit', authenticateStudent, upload.array('files', 5), async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    const { submissionText } = req.body;

    console.log('📤 === ENHANCED TASK SUBMISSION START ===');
    console.log('📤 Task ID:', taskId);
    console.log('📤 Student ID:', student_id);

    // Verify task is assigned to this student
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('assigned_to', student_id)
      .eq('is_active', true)
      .single();

    if (taskError || !task) {
      console.error('❌ Task not found or access denied:', taskError);
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    console.log('📤 Task found:', { 
      id: task.id, 
      title: task.title, 
      status: task.status, 
      current_attempts: task.current_attempts, 
      max_attempts: task.max_attempts 
    });

    // Check submission constraints
    const now = new Date();
    const availableUntil = new Date(task.available_until);

    if (now > availableUntil) {
      console.error('❌ Submission deadline passed:', { now, availableUntil });
      return res.status(400).json({ error: 'Submission deadline has passed' });
    }

    // Check if task is in revision status - allow resubmission
    const isRevisionRequested = task.status === 'to_revise';
    console.log('📤 Revision status check:', { 
      taskStatus: task.status, 
      isRevisionRequested,
      currentAttempts: task.current_attempts,
      maxAttempts: task.max_attempts
    });
    
    // Only check max attempts if it's not a revision resubmission
    if (!isRevisionRequested && (task.current_attempts || 0) >= task.max_attempts) {
      console.error('❌ Maximum attempts reached:', { 
        current_attempts: task.current_attempts, 
        max_attempts: task.max_attempts 
      });
      return res.status(400).json({ error: 'Maximum attempts reached' });
    }

    console.log('✅ Task submission validation passed');

    // Check existing submissions for this task
    const { data: existingSubmissions, error: existingError } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', taskId)
      .eq('submitted_by', student_id)
      .order('created_at', { ascending: false });

    if (existingError) {
      console.error('❌ Error checking existing submissions:', existingError);
    } else {
      console.log('📤 Existing submissions:', existingSubmissions?.length || 0);
      if (existingSubmissions && existingSubmissions.length > 0) {
        console.log('📤 Latest submission:', {
          id: existingSubmissions[0].id,
          status: existingSubmissions[0].status,
          attempt_number: existingSubmissions[0].attempt_number
        });
      }
    }

    // Handle file uploads with better error handling
    let fileUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const fileName = `${student_id}/${taskId}/${Date.now()}_${file.originalname}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task-submissions')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              upsert: false
            });

          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }

          fileUrls.push(fileName);
          console.log('✅ File uploaded:', fileName);
        } catch (fileError) {
          console.error('Individual file upload error:', fileError);
          continue;
        }
      }
    }

    // Handle revision submissions differently to avoid constraint conflicts
    if (isRevisionRequested) {
      console.log('📤 Processing REVISION SUBMISSION - using dedicated revision table');
      
      // Find the original submission that was marked for revision
      const originalSubmission = existingSubmissions && existingSubmissions.length > 0 
        ? existingSubmissions.find(s => s.status === 'revision_requested') || existingSubmissions[0]
        : null;
      
      if (!originalSubmission) {
        return res.status(400).json({ error: 'No original submission found for revision' });
      }
      
      // Check existing revision submissions for this original submission
      const { data: existingRevisions } = await supabase
        .from('revision_submissions')
        .select('*')
        .eq('original_submission_id', originalSubmission.id)
        .order('revision_attempt_number', { ascending: false });
      
      const nextRevisionAttempt = existingRevisions && existingRevisions.length > 0 
        ? Math.max(...existingRevisions.map(r => r.revision_attempt_number)) + 1
        : 1;
      
      console.log('📤 Creating revision submission - attempt:', nextRevisionAttempt);
      
      // Create revision submission
      const { data: revisionData, error: revisionError } = await supabase
        .from('revision_submissions')
        .insert([{
          original_submission_id: originalSubmission.id,
          task_id: taskId,
          submitted_by: student_id,
          revision_attempt_number: nextRevisionAttempt,
          submission_text: submissionText || '',
          file_paths: fileUrls,
          status: 'pending'
        }])
        .select()
        .single();

      if (revisionError) {
        console.error('❌ Revision submission creation error:', revisionError);
        return res.status(500).json({ error: `Revision submission failed: ${revisionError.message}` });
      }

      console.log('✅ Revision submission created successfully:', revisionData.id);
      
      return res.status(200).json({
        message: 'Revision submitted successfully',
        submission: {
          id: revisionData.id,
          type: 'revision',
          revision_attempt_number: nextRevisionAttempt,
          status: 'pending',
          submitted_at: revisionData.submitted_at,
          files: fileUrls
        }
      });
    }
    
    // Handle regular (new) submissions
    const newAttemptCount = (task.current_attempts || 0) + 1;
    
    // Validate before setting the update
    if (newAttemptCount > task.max_attempts) {
      console.error('❌ Would violate max_attempts constraint:', {
        new_attempts: newAttemptCount,
        max_attempts: task.max_attempts
      });
      return res.status(400).json({ error: 'Would exceed maximum attempts allowed' });
    }
    
    const nextAttempt = newAttemptCount;
    const taskUpdates = { 
      status: 'in_progress',
      current_attempts: nextAttempt
    };
    console.log('📤 New submission - incrementing to attempt:', nextAttempt);

    // Create regular submission (not a revision)
    console.log('📤 Creating regular submission:', {
      task_id: taskId,
      submitted_by: student_id,
      attempt_number: nextAttempt,
      filesCount: fileUrls.length,
      submission_text_length: (submissionText || '').length
    });

    // Validate submission data before inserting
    if (!taskId || !student_id) {
      return res.status(400).json({ error: 'Missing required submission data' });
    }

    if (nextAttempt < 1) {
      return res.status(400).json({ error: 'Invalid attempt number' });
    }

    let submission;
    try {
      const { data: submissionData, error: submissionError } = await supabase
        .from('task_submissions')
        .insert([{
          task_id: taskId,
          submitted_by: student_id,
          submission_text: submissionText || '',
          file_urls: JSON.stringify(fileUrls),
          attempt_number: nextAttempt,
          status: 'pending',
          is_late: now > new Date(task.due_date)
        }])
        .select()
        .single();

      if (submissionError) {
        console.error('❌ Task submission creation error:', submissionError);
        return res.status(500).json({ error: `Submission creation failed: ${submissionError.message}` });
      }
      
      submission = submissionData;
      console.log('✅ Submission created successfully:', submission.id);
    } catch (submissionCreateError) {
      console.error('❌ Submission creation exception:', submissionCreateError);
      return res.status(500).json({ error: `Submission creation failed: ${submissionCreateError.message}` });
    }

    // Update task attempt count and status for regular submissions
    console.log('📤 Updating task for new submission:', { taskId, updates: taskUpdates });
    
    try {
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update(taskUpdates)
        .eq('id', taskId);

      if (taskUpdateError) {
        console.error('❌ Task update error:', taskUpdateError);
        return res.status(500).json({ error: `Task update failed: ${taskUpdateError.message}` });
      }
      
      console.log('✅ Task updated successfully');
    } catch (taskUpdateException) {
      console.error('❌ Task update exception:', taskUpdateException);
      return res.status(500).json({ error: `Task update failed: ${taskUpdateException.message}` });
    }

    console.log('✅ Task submitted successfully:', submission.id);
    console.log('📤 === ENHANCED TASK SUBMISSION COMPLETE ===');

    res.json({ 
      message: 'Task submitted successfully',
      submission,
      filesUploaded: fileUrls.length
    });

  } catch (error) {
    console.error('💥 Enhanced task submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== TASK DEADLINE EXTENSION REQUESTS ===================

// Create extension request (Student)
app.post('/api/student/tasks/:taskId/request-extension', authenticateStudent, async (req, res) => {
  try {
    const { taskId } = req.params;
    const student_id = req.user.id;
    const { reason } = req.body;

    console.log('⏰ === EXTENSION REQUEST START ===');
    console.log('⏰ Task ID:', taskId);
    console.log('⏰ Student ID:', student_id);
    console.log('⏰ Reason:', reason);

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects!inner(id, course_id),
        project_phases!inner(id)
      `)
      .eq('id', taskId)
      .eq('assigned_to', student_id)
      .single();

    if (taskError || !task) {
      console.error('❌ Task not found:', taskError);
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    // Get student's group by joining through course_groups to get course_id
    const { data: groupMember, error: groupError } = await supabase
      .from('course_group_members')
      .select(`
        group_id,
        course_groups!inner(course_id)
      `)
      .eq('student_id', student_id)
      .eq('course_groups.course_id', task.projects.course_id)
      .single();

    if (groupError || !groupMember) {
      console.error('❌ Group not found:', groupError);
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if there's already a pending request for this task
    const { data: existingRequest, error: existingError } = await supabase
      .from('task_extension_requests')
      .select('id, status')
      .eq('task_id', taskId)
      .eq('student_id', student_id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending extension request for this task' });
    }

    // Create extension request
    const { data: extensionRequest, error: requestError } = await supabase
      .from('task_extension_requests')
      .insert([{
        task_id: taskId,
        student_id: student_id,
        phase_id: task.phase_id,
        project_id: task.project_id,
        group_id: groupMember.group_id,
        original_due_date: task.due_date,
        original_available_until: task.available_until,
        reason: reason.trim(),
        status: 'pending'
      }])
      .select()
      .single();

    if (requestError) {
      console.error('❌ Extension request creation error:', requestError);
      return res.status(500).json({ error: `Failed to create extension request: ${requestError.message}` });
    }

    // Update task status to indicate extension request
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ status: 'extension_requested' })
      .eq('id', taskId);

    if (taskUpdateError) {
      console.error('❌ Task status update error:', taskUpdateError);
    }

    console.log('✅ Extension request created:', extensionRequest.id);
    console.log('⏰ === EXTENSION REQUEST COMPLETE ===');

    res.json({
      message: 'Extension request submitted successfully',
      request: extensionRequest
    });

  } catch (error) {
    console.error('💥 Extension request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get extension requests for a student
app.get('/api/student/extension-requests', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;

    const { data: requests, error } = await supabase
      .from('task_extension_requests')
      .select(`
        *,
        tasks!inner(
          id,
          title,
          description,
          due_date,
          available_until
        ),
        project_phases!inner(
          phase_number,
          title
        ),
        projects!inner(
          title
        ),
        reviewed_by_student:studentaccounts!task_extension_requests_reviewed_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(requests || []);

  } catch (error) {
    console.error('💥 Get extension requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get extension requests for a group (Leader)
app.get('/api/student/group/:groupId/extension-requests', authenticateStudent, async (req, res) => {
  try {
    const { groupId } = req.params;
    const student_id = req.user.id;

    console.log('🔍 === CHECKING GROUP MEMBER ACCESS ===');
    console.log('🔍 Group ID:', groupId);
    console.log('🔍 Student ID:', student_id);

    // Verify the student is a member of this group (leader or regular member)
    const { data: memberCheck, error: groupError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .single();

    console.log('🔍 Member check result:', memberCheck);
    console.log('🔍 Member check error:', groupError);

    if (groupError || !memberCheck) {
      console.log('❌ Access denied - not a group member');
      return res.status(403).json({ error: 'Access denied. You must be a member of this group.' });
    }

    console.log('✅ Group member access verified');

    const { data: requests, error } = await supabase
      .from('task_extension_requests')
      .select(`
        *,
        tasks!inner(
          id,
          title,
          description,
          due_date,
          available_until
        ),
        project_phases!inner(
          id,
          phase_number,
          title,
          start_date,
          end_date
        ),
        projects!inner(
          id,
          title
        ),
        student:studentaccounts!task_extension_requests_student_id_fkey(
          id,
          first_name,
          last_name,
          student_number,
          profile_image_url
        ),
        reviewed_by_student:studentaccounts!task_extension_requests_reviewed_by_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('group_id', groupId)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(requests || []);

  } catch (error) {
    console.error('💥 Get group extension requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve extension request (Leader)
app.post('/api/student/extension-requests/:requestId/approve', authenticateStudent, async (req, res) => {
  try {
    const { requestId } = req.params;
    const student_id = req.user.id;
    const { new_due_date, new_available_until, leader_notes } = req.body;

    console.log('✅ === APPROVE EXTENSION REQUEST START ===');
    console.log('✅ Request ID:', requestId);
    console.log('✅ Leader ID:', student_id);
    console.log('✅ New due date:', new_due_date);
    console.log('✅ New available until:', new_available_until);

    if (!new_due_date) {
      return res.status(400).json({ error: 'New due date is required' });
    }

    // Get extension request with phase details
    const { data: request, error: requestError } = await supabase
      .from('task_extension_requests')
      .select(`
        *,
        project_phases!inner(
          start_date,
          end_date
        )
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Extension request not found' });
    }

    // Verify the student is the leader of the group
    const { data: leaderCheck, error: groupError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('group_id', request.group_id)
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .single();

    if (groupError || !leaderCheck) {
      return res.status(403).json({ error: 'Access denied. You must be the group leader.' });
    }

    // Validate new dates are within phase boundaries
    const phaseStart = new Date(request.project_phases.start_date);
    const phaseEnd = new Date(request.project_phases.end_date);
    const newDueDate = new Date(new_due_date);

    if (newDueDate < phaseStart || newDueDate > phaseEnd) {
      return res.status(400).json({ 
        error: 'New due date must be within the phase boundaries',
        phaseStart: request.project_phases.start_date,
        phaseEnd: request.project_phases.end_date
      });
    }

    // Validate available_until only if it's provided
    if (new_available_until) {
      const newAvailableUntil = new Date(new_available_until);
      
      if (newAvailableUntil < phaseStart || newAvailableUntil > phaseEnd) {
        return res.status(400).json({ 
          error: 'New available until date must be within the phase boundaries',
          phaseStart: request.project_phases.start_date,
          phaseEnd: request.project_phases.end_date
        });
      }

      if (newAvailableUntil < newDueDate) {
        return res.status(400).json({ error: 'Available until date must be after or equal to due date' });
      }
    }

    // Prepare update object
    const updateData = {
      status: 'approved',
      new_due_date: new_due_date,
      reviewed_by: student_id,
      reviewed_at: new Date().toISOString(),
      leader_notes: leader_notes || null
    };

    // Only include new_available_until if it's provided
    if (new_available_until) {
      updateData.new_available_until = new_available_until;
    }

    // Update extension request
    const { error: updateError } = await supabase
      .from('task_extension_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Extension request update error:', updateError);
      return res.status(500).json({ error: `Failed to approve extension: ${updateError.message}` });
    }

    // Prepare task update object
    const taskUpdateData = {
      due_date: new_due_date,
      status: 'pending' // Reset status to pending so student can submit
    };

    // Only update available_until if it's provided
    if (new_available_until) {
      taskUpdateData.available_until = new_available_until;
    }

    // Update task with new deadlines
    console.log('📝 Updating task with data:', taskUpdateData);
    console.log('📝 Task ID:', request.task_id);
    
    const { data: updatedTask, error: taskUpdateError } = await supabase
      .from('tasks')
      .update(taskUpdateData)
      .eq('id', request.task_id)
      .select()
      .single();

    if (taskUpdateError) {
      console.error('❌ Task update error:', taskUpdateError);
      return res.status(500).json({ error: `Failed to update task: ${taskUpdateError.message}` });
    }

    console.log('✅ Extension request approved and task updated');
    console.log('✅ Updated task:', updatedTask);
    console.log('✅ === APPROVE EXTENSION REQUEST COMPLETE ===');

    res.json({
      message: 'Extension request approved successfully',
      newDueDate: new_due_date,
      newAvailableUntil: new_available_until
    });

  } catch (error) {
    console.error('💥 Approve extension request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject extension request (Leader)
app.post('/api/student/extension-requests/:requestId/reject', authenticateStudent, async (req, res) => {
  try {
    const { requestId } = req.params;
    const student_id = req.user.id;
    const { rejection_reason } = req.body;

    console.log('❌ === REJECT EXTENSION REQUEST START ===');
    console.log('❌ Request ID:', requestId);
    console.log('❌ Leader ID:', student_id);

    // Get extension request
    const { data: request, error: requestError } = await supabase
      .from('task_extension_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Extension request not found' });
    }

    // Verify the student is the leader of the group
    const { data: leaderCheck, error: groupError } = await supabase
      .from('course_group_members')
      .select('role')
      .eq('group_id', request.group_id)
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .single();

    if (groupError || !leaderCheck) {
      return res.status(403).json({ error: 'Access denied. You must be the group leader.' });
    }

    // Update extension request
    const { error: updateError } = await supabase
      .from('task_extension_requests')
      .update({
        status: 'rejected',
        reviewed_by: student_id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Extension request update error:', updateError);
      return res.status(500).json({ error: `Failed to reject extension: ${updateError.message}` });
    }

    // Update task status back to missed
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ status: 'missed' })
      .eq('id', request.task_id);

    if (taskUpdateError) {
      console.error('❌ Task update error:', taskUpdateError);
    }

    console.log('❌ Extension request rejected');
    console.log('❌ === REJECT EXTENSION REQUEST COMPLETE ===');

    res.json({
      message: 'Extension request rejected'
    });

  } catch (error) {
    console.error('💥 Reject extension request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== END TASK DEADLINE EXTENSION REQUESTS ===================

// Enhanced notifications endpoint with better categorization
app.get('/api/student/notifications', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;

    console.log('🔔 === ENHANCED STUDENT NOTIFICATIONS START ===');
    console.log('🔔 Student ID:', student_id);

    const notifications = [];

    // Get task-related notifications
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects(title),
        task_submissions(status, reviewed_at, review_comments)
      `)
      .eq('assigned_to', student_id)
      .eq('is_active', true);

    if (tasks && !tasksError) {
      tasks.forEach(task => {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const isOverdue = dueDate < now && task.status !== 'completed';
        const dueSoon = (dueDate - now) / (1000 * 60 * 60 * 24) <= 2 && !isOverdue;

        if (isOverdue) {
          notifications.push({
            id: `overdue-${task.id}`,
            type: 'overdue',
            priority: 'high',
            title: 'Overdue Task',
            message: `Task "${task.title}" is overdue`,
            date: task.due_date,
            taskId: task.id,
            read: false
          });
        } else if (dueSoon) {
          notifications.push({
            id: `due-soon-${task.id}`,
            type: 'due_soon',
            priority: 'medium',
            title: 'Task Due Soon',
            message: `Task "${task.title}" is due soon`,
            date: task.due_date,
            taskId: task.id,
            read: false
          });
        }

        // Check for feedback
        if (task.task_submissions && task.task_submissions.length > 0) {
          const latestSubmission = task.task_submissions[task.task_submissions.length - 1];
          if (latestSubmission.status === 'reviewed' && latestSubmission.review_comments) {
            notifications.push({
              id: `feedback-${task.id}`,
              type: 'feedback',
              priority: 'medium',
              title: 'New Feedback',
              message: `You have new feedback on "${task.title}"`,
              date: latestSubmission.reviewed_at,
              taskId: task.id,
              read: false
            });
          }
        }
      });
    }

    // Get group-related notifications
    const { data: groupMemberships } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups(group_name, courses(course_name))
      `)
      .eq('student_id', student_id)
      .eq('is_active', true);

    if (groupMemberships) {
      groupMemberships.forEach(membership => {
        // Add any group-specific notifications here
        if (membership.assigned_at) {
          const assignedDate = new Date(membership.assigned_at);
          const timeSinceAssigned = (new Date() - assignedDate) / (1000 * 60 * 60 * 24);
          
          if (timeSinceAssigned < 1) { // Within last 24 hours
            notifications.push({
              id: `group-assigned-${membership.id}`,
              type: 'group_assignment',
              priority: 'medium',
              title: 'Group Assignment',
              message: `You've been assigned to ${membership.course_groups.group_name}`,
              date: membership.assigned_at,
              read: false
            });
          }
        }
      });
    }

    // Sort by priority and date
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.date) - new Date(a.date);
    });

    console.log('🔔 Enhanced notifications generated:', notifications.length);
    console.log('🔔 === ENHANCED STUDENT NOTIFICATIONS COMPLETE ===');

    res.json(notifications);

  } catch (error) {
    console.error('💥 Enhanced student notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ WORKING: Regex approach
// ✅ ENHANCED DEBUG: Task submission file serving with detailed logging
app.get(/^\/api\/files\/task-submissions\/(.*)$/, authenticateStudent, async (req, res) => {
  try {
    const filePath = req.params[0];
    const student_id = req.user.id;
    
    console.log('🔍 === TASK SUBMISSION FILE DEBUG START ===');
    console.log('🔍 Original URL:', req.originalUrl);
    console.log('🔍 Extracted file path:', filePath);
    console.log('🔍 Request method:', req.method);
    console.log('🔍 User agent:', req.get('User-Agent'));
    console.log('🔍 Student ID:', student_id);
    
    if (!filePath) {
      console.log('❌ No file path provided');
      return res.status(400).json({ error: 'File path is required' });
    }

    // Check if filePath looks valid
    if (filePath.includes('..') || filePath.startsWith('/')) {
      console.log('❌ Invalid file path detected:', filePath);
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Extract task ID from file path to verify ownership
    const pathParts = filePath.split('/');
    if (pathParts.length < 2) {
      console.log('❌ Invalid file path structure:', filePath);
      return res.status(400).json({ error: 'Invalid file path structure' });
    }
    
    const taskId = pathParts[0];
    console.log('🔍 Extracted task ID:', taskId);
    
    // Verify that the student has access to this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, assigned_to')
      .eq('id', taskId)
      .eq('assigned_to', student_id)
      .single();
    
    if (taskError || !task) {
      console.log('❌ Task access denied:', taskError?.message || 'Task not found');
      return res.status(403).json({ error: 'Access denied to this file' });
    }
    
    console.log('✅ Task access verified for student:', student_id);

    console.log('📁 Attempting to download from bucket: task-submissions');
    console.log('📁 File path:', filePath);

    const { data: file, error } = await supabase.storage
      .from('task-submissions')
      .download(filePath);
    
    if (error) {
      console.log('❌ Supabase storage error:', error);
      console.log('❌ Error code:', error.statusCode);
      console.log('❌ Error message:', error.message);
      return res.status(404).json({ 
        error: 'File not found in storage',
        details: error.message,
        filePath: filePath
      });
    }

    if (!file) {
      console.log('❌ No file data returned from storage');
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('✅ File downloaded successfully');
    console.log('✅ File size:', file.size);
    console.log('✅ File type:', file.type);

    // Set appropriate headers
    const fileName = filePath.split('/').pop();
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    console.log('📄 File name:', fileName);
    console.log('📄 File extension:', ext);
    
    const contentType = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'zip': 'application/zip',
      'txt': 'text/plain'
    }[ext] || 'application/octet-stream';
    
    console.log('📄 Content type set to:', contentType);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('✅ Buffer created, size:', buffer.length);
    
    res.send(buffer);
    console.log('✅ File sent successfully');
    console.log('🔍 === TASK SUBMISSION FILE DEBUG END ===');
    
  } catch (error) {
    console.error('💥 Task submission file serving error:', error);
    console.error('💥 Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to serve file',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});



// =================== STUDENT GRADES AND EVALUATIONS ===================

// ✅ NEW: Get grades overview from deliverable submissions (with individual grade extraction from member_tasks)
// ✅ TEST ENDPOINT - Check if we're querying the right table
app.get('/api/student/test-submissions-table', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    console.log('🧪 TEST: Querying project_deliverable_submissions table');
    
    const { data, error } = await supabase
      .from('project_deliverable_submissions')
      .select('*')
      .not('member_tasks', 'is', null)
      .limit(2);
    
    if (error) throw error;
    
    console.log('🧪 TEST: Found', data?.length || 0, 'submissions');
    console.log('🧪 TEST: First submission:', data?.[0] ? {
      id: data[0].id,
      project_id: data[0].project_id,
      grade: data[0].grade,
      member_tasks_count: data[0].member_tasks?.length,
      has_snapshot: !!data[0].project_snapshot
    } : 'NONE');
    
    res.json({ success: true, count: data?.length || 0, sample: data || [] });
  } catch (error) {
    console.error('🧪 TEST ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get grades overview for student (all projects with both phase and project deliverable grades)
app.get('/api/student/grades/overview', authenticateStudent, async (req, res) => {
  console.log('');
  console.log('🎯🎯🎯 ==================== GRADES OVERVIEW API CALLED ====================');
  console.log('🎯🎯🎯 Timestamp:', new Date().toISOString());
  console.log('');
  
  try {
    const student_id = req.user.id;

    console.log('📊 Fetching grades overview for student:', student_id);

    // Get all groups the student belongs to
    const { data: groupMemberships, error: groupError } = await supabase
      .from('course_group_members')
      .select('group_id')
      .eq('student_id', student_id);

    if (groupError) throw groupError;

    const groupIds = groupMemberships.map(g => g.group_id);
    if (groupIds.length === 0) {
      return res.json([]);
    }

    console.log('📊 Student belongs to groups:', groupIds);

    // ✅ DEBUG: First fetch ALL submissions for these groups (no filters)
    const { data: allProjectSubs, error: allSubsError } = await supabase
      .from('project_deliverable_submissions')
      .select(`
        id,
        project_id,
        grade,
        status,
        member_tasks,
        graded_at,
        projects!inner(title)
      `)
      .in('group_id', groupIds);

    console.log('');
    console.log('🔍 DEBUG: ALL project submissions (no filters):', allProjectSubs?.length || 0);
    if (allProjectSubs && allProjectSubs.length > 0) {
      allProjectSubs.forEach((sub, i) => {
        console.log(`  [${i + 1}] ${sub.projects?.title}:`);
        console.log(`      ID: ${sub.id}`);
        console.log(`      Grade: ${sub.grade}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Has member_tasks: ${!!sub.member_tasks}`);
        console.log(`      member_tasks is null: ${sub.member_tasks === null}`);
      });
    }
    console.log('');

    // Fetch ALL project deliverable submissions (graded) for these groups
    // ✅ Show submissions with GROUP grades (member_tasks can be null if no individual grades yet)
    // ❌ REMOVED: .not('member_tasks', 'is', null) - Allow submissions without individual grades
    const { data: projectSubmissions, error: projectError } = await supabase
      .from('project_deliverable_submissions')
      .select(`
        *,
        projects!inner(
          id,
          title,
          description,
          due_date,
          is_active
        )
      `)
      .in('group_id', groupIds)
      .not('grade', 'is', null)
      .eq('status', 'graded');

    if (projectError) throw projectError;

    // Fetch ALL phase deliverable submissions (graded) for these groups
    // ✅ Show submissions with GROUP grades (member_tasks can be null if no individual grades yet)
    // ❌ REMOVED: .not('member_tasks', 'is', null) - Allow submissions without individual grades
    const { data: phaseSubmissions, error: phaseError } = await supabase
      .from('phase_deliverable_submissions')
      .select(`
        *,
        project_phases!inner(
          id,
          phase_number,
          title,
          description,
          start_date,
          end_date,
          project_id,
          projects!inner(
            id,
            title
          )
        )
      `)
      .in('group_id', groupIds)
      .not('grade', 'is', null)
      .eq('status', 'graded');

    if (phaseError) throw phaseError;

    console.log('📊 Project submissions found:', projectSubmissions?.length || 0);
    console.log('📊 Phase submissions found:', phaseSubmissions?.length || 0);
    
    // ✅ DEBUG: Log each project submission details
    if (projectSubmissions && projectSubmissions.length > 0) {
      console.log('🔍 PROJECT SUBMISSION DETAILS:');
      projectSubmissions.forEach((sub, index) => {
        console.log(`  [${index + 1}] ID: ${sub.id}`);
        console.log(`      Project: ${sub.projects?.title} (${sub.project_id})`);
        console.log(`      Grade: ${sub.grade} / ${sub.max_grade}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Graded At: ${sub.graded_at}`);
        console.log(`      Has member_tasks: ${!!sub.member_tasks}`);
      });
    }

    const gradesOverview = [];

    // Process PROJECT deliverable submissions
    if (projectSubmissions && projectSubmissions.length > 0) {
      projectSubmissions.forEach(submission => {
        let individualGrade = null;
        
        if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
          const currentUserTask = submission.member_tasks.find(
            member => member.member_id === student_id
          );
          if (currentUserTask && currentUserTask.individual_grade !== undefined && currentUserTask.individual_grade !== null) {
            individualGrade = typeof currentUserTask.individual_grade === 'string'
              ? parseFloat(currentUserTask.individual_grade)
              : currentUserTask.individual_grade;
          }
        }

        gradesOverview.push({
          id: submission.id,
          type: 'project', // ✅ CRITICAL: Mark as project type
          projectId: submission.project_id,
          projectTitle: submission.projects?.title || 'Untitled Project',
          title: submission.projects?.title || 'Untitled Project',
          groupGrade: submission.grade ? parseFloat(submission.grade) : null,
          individualGrade: individualGrade,
          maxGrade: submission.max_grade ? parseFloat(submission.max_grade) : 100,
          status: submission.status,
          gradedAt: submission.graded_at,
          gradedBy: submission.graded_by,
          feedback: submission.instructor_feedback,
          rubric: submission.rubric_snapshot
        });
      });
    }

    // Process PHASE deliverable submissions
    if (phaseSubmissions && phaseSubmissions.length > 0) {
      phaseSubmissions.forEach(submission => {
        let individualGrade = null;
        
        if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
          const currentUserTask = submission.member_tasks.find(
            member => member.member_id === student_id
          );
          if (currentUserTask && currentUserTask.individual_grade !== undefined && currentUserTask.individual_grade !== null) {
            individualGrade = typeof currentUserTask.individual_grade === 'string'
              ? parseFloat(currentUserTask.individual_grade)
              : currentUserTask.individual_grade;
          }
        }

        gradesOverview.push({
          id: submission.id,
          type: 'phase', // ✅ CRITICAL: Mark as phase type
          phaseId: submission.phase_id,
          projectId: submission.project_phases?.project_id,
          projectTitle: submission.project_phases?.projects?.title || 'Untitled Project',
          phaseNumber: submission.project_phases?.phase_number,
          phaseTitle: submission.project_phases?.title || 'Untitled Phase',
          title: `Phase ${submission.project_phases?.phase_number}: ${submission.project_phases?.title || 'Untitled Phase'}`,
          groupGrade: submission.grade ? parseFloat(submission.grade) : null,
          individualGrade: individualGrade,
          maxGrade: submission.max_grade ? parseFloat(submission.max_grade) : 100,
          status: submission.status,
          gradedAt: submission.graded_at,
          gradedBy: submission.graded_by,
          feedback: submission.instructor_feedback,
          rubric: submission.rubric_snapshot
        });
      });
    }

    console.log('✅ Total grades in overview:', gradesOverview.length);
    console.log('📊 Project grades:', gradesOverview.filter(g => g.type === 'project').length);
    console.log('📊 Phase grades:', gradesOverview.filter(g => g.type === 'phase').length);

    res.json(gradesOverview);

  } catch (error) {
    console.error('💥 Grades overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get detailed grades for a specific project (both project and phase level)
app.get('/api/student/grades/project/:projectId', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    const { projectId } = req.params;

    console.log('📊 Fetching detailed grades for student:', student_id, 'project:', projectId);

    // Fetch project deliverable submission (project-level grade)
    const { data: projectSubmission, error: projectError } = await supabase
      .from('project_deliverable_submissions')
      .select('*')
      .eq('project_id', projectId)
      .not('grade', 'is', null)
      .not('member_tasks', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (projectError) throw projectError;

    // Fetch phase deliverable submissions (phase-level grades)
    const { data: phaseSubmissions, error: phaseError } = await supabase
      .from('phase_deliverable_submissions')
      .select('*')
      .eq('project_id', projectId)
      .not('grade', 'is', null)
      .not('member_tasks', 'is', null)
      .order('created_at', { ascending: false });

    if (phaseError) throw phaseError;

    console.log('✅ Project submissions:', projectSubmission?.length || 0);
    console.log('✅ Phase submissions:', phaseSubmissions?.length || 0);

    // Extract project grade info
    let projectGradeInfo = null;
    if (projectSubmission && projectSubmission.length > 0) {
      const submission = projectSubmission[0];
      let individualGrade = null;
      
      if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
        const currentUserTask = submission.member_tasks.find(
          member => member.member_id === student_id
        );
        if (currentUserTask && currentUserTask.individual_grade !== undefined && currentUserTask.individual_grade !== null) {
          individualGrade = typeof currentUserTask.individual_grade === 'string'
            ? parseFloat(currentUserTask.individual_grade)
            : currentUserTask.individual_grade;
        }
      }

      projectGradeInfo = {
        id: submission.id,
        groupGrade: submission.grade ? parseFloat(submission.grade) : null,
        individualGrade: individualGrade,
        maxGrade: submission.max_grade ? parseFloat(submission.max_grade) : 100,
        status: submission.status,
        gradedAt: submission.graded_at,
        gradedBy: submission.graded_by,
        feedback: submission.instructor_feedback
      };
    }

    // Extract phase grade info
    const phaseGradeInfo = phaseSubmissions.map(submission => {
      let individualGrade = null;
      
      if (submission.member_tasks && Array.isArray(submission.member_tasks)) {
        const currentUserTask = submission.member_tasks.find(
          member => member.member_id === student_id
        );
        if (currentUserTask && currentUserTask.individual_grade !== undefined && currentUserTask.individual_grade !== null) {
          individualGrade = typeof currentUserTask.individual_grade === 'string'
            ? parseFloat(currentUserTask.individual_grade)
            : currentUserTask.individual_grade;
        }
      }

      return {
        id: submission.id,
        phaseId: submission.phase_id,
        phaseNumber: submission.phase_snapshot?.phase_number,
        phaseTitle: submission.phase_snapshot?.title || 'Untitled Phase',
        groupGrade: submission.grade ? parseFloat(submission.grade) : null,
        individualGrade: individualGrade,
        maxGrade: submission.max_grade ? parseFloat(submission.max_grade) : 100,
        status: submission.status,
        gradedAt: submission.graded_at,
        gradedBy: submission.graded_by,
        feedback: submission.instructor_feedback
      };
    });

    const result = {
      projectGrade: projectGradeInfo,
      phaseGrades: phaseGradeInfo,
      project: {
        id: projectId,
        title: projectSubmission[0]?.project_snapshot?.title || 'Untitled Project'
      }
    };

    console.log('✅ Detailed grades response:', { projectGrade: !!projectGradeInfo, phaseGrades: phaseGradeInfo.length });
    res.json(result);

  } catch (error) {
    console.error('💥 Detailed grades error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 DIAGNOSTIC: Check database for graded submissions
app.get('/api/student/grades/diagnostic/check', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    console.log('🔍 Running diagnostic for student:', student_id);

    // Check project submissions
    const { data: projectSubs, error: projErr } = await supabase
      .from('project_deliverable_submissions')
      .select('id, grade, member_tasks, project_id')
      .not('grade', 'is', null)
      .limit(5);

    console.log('📊 Project submissions (graded):', projectSubs?.length || 0, projectSubs);

    // Check phase submissions
    const { data: phaseSubs, error: phaseErr } = await supabase
      .from('phase_deliverable_submissions')
      .select('id, grade, member_tasks, phase_id')
      .not('grade', 'is', null)
      .limit(5);

    console.log('📊 Phase submissions (graded):', phaseSubs?.length || 0, phaseSubs);

    res.json({
      studentId: student_id,
      projectSubmissionsWithGrades: projectSubs?.length || 0,
      phaseSubmissionsWithGrades: phaseSubs?.length || 0,
      projectSubmissionsSample: projectSubs,
      phaseSubmissionsSample: phaseSubs
    });
  } catch (error) {
    console.error('💥 Diagnostic error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Student grades endpoint using new phase_grades table
// ⚠️ OLD ENDPOINT REMOVED - Use /api/student/grades/overview and /api/student/grades/project/:projectId instead

// Get detailed phase grades for a project
app.get('/api/student/projects/:projectId/phase-grades', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📊 === PROJECT PHASE GRADES START ===');
    console.log('📊 Project ID:', projectId);
    console.log('📊 Student ID:', student_id);

    // ✅ FIXED: Remove the problematic ordering by related table column
    const { data: phaseGrades, error: phaseGradesError } = await supabase
      .from('phase_grades')
      .select(`
        *,
        project_phases!inner(
          title, 
          phase_number,
          start_date,
          end_date,
          project_id
        ),
        professoraccounts!phase_grades_graded_by_fkey(first_name, last_name),
        course_groups(group_name)
      `)
      .eq('student_id', student_id)
      .eq('project_phases.project_id', projectId)
      .order('created_at', { ascending: true }); // ✅ Fixed: Order by local column

    if (phaseGradesError) {
      console.error('❌ Phase grades query error:', phaseGradesError);
      return res.status(500).json({ error: phaseGradesError.message });
    }

    // ✅ Sort by phase number in JavaScript after fetching
    if (phaseGrades) {
      phaseGrades.sort((a, b) => {
        const phaseA = a.project_phases?.phase_number || 0;
        const phaseB = b.project_phases?.phase_number || 0;
        return phaseA - phaseB;
      });
    }

    // Get phase submission status for context
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_submissions')
      .select(`
        phase_id,
        submission_date,
        is_late,
        status
      `)
      .in('phase_id', phaseGrades?.map(g => g.phase_id) || []);

    // Combine grades with submission info
    const detailedGrades = phaseGrades?.map(grade => {
      const submission = submissions?.find(s => s.phase_id === grade.phase_id);
      return {
        ...grade,
        submission_info: submission || null,
        phase_status: getPhaseStatus(grade.project_phases)
      };
    }) || [];

    console.log('✅ Phase grades retrieved:', detailedGrades.length);
    console.log('📊 === PROJECT PHASE GRADES COMPLETE ===');

    res.json(detailedGrades);

  } catch (error) {
    console.error('💥 Project phase grades error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ KEEP ONLY ONE: Helper function to determine phase status
function getPhaseStatus(phase) {
  const now = new Date();
  const start = new Date(phase.start_date);
  const end = new Date(phase.end_date);
  
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  if (now > end) return 'completed';
  return 'unknown';
}

// Get project rubric with criteria
app.get('/api/student/projects/:projectId/rubric', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📋 === FETCH PROJECT RUBRIC START ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Student ID:', student_id);

    // First, get the project's course_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('📋 Project course_id:', project.course_id);

    // Verify student is enrolled in this project's course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('id')
      .eq('student_id', student_id)
      .eq('course_id', project.course_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('❌ Student not enrolled in this course');
      console.error('❌ Enrollment error:', enrollmentError);
      console.error('❌ Enrollment data:', enrollment);
      return res.status(403).json({ error: 'Access denied - not enrolled in course' });
    }

    console.log('✅ Student enrolled in course:', project.course_id);

    // Fetch project rubric
    const { data: rubric, error: rubricError } = await supabase
      .from('project_rubrics')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (rubricError) {
      if (rubricError.code === 'PGRST116') {
        return res.status(404).json({ error: 'No rubric found for this project' });
      }
      console.error('❌ Rubric query error:', rubricError);
      return res.status(500).json({ error: rubricError.message });
    }

    // Fetch rubric criteria
    const { data: criteria, error: criteriaError } = await supabase
      .from('project_rubric_criteria')
      .select('*')
      .eq('project_rubric_id', rubric.id)
      .order('order_index', { ascending: true });

    if (criteriaError) {
      console.error('❌ Criteria query error:', criteriaError);
      return res.status(500).json({ error: criteriaError.message });
    }

    const response = {
      id: rubric.id,
      project_id: rubric.project_id,
      instructions: rubric.instructions,
      total_points: rubric.total_points,
      created_at: rubric.created_at,
      updated_at: rubric.updated_at,
      criteria: criteria || []
    };

    console.log('✅ Project rubric retrieved with', criteria?.length || 0, 'criteria');
    console.log('📋 === FETCH PROJECT RUBRIC COMPLETE ===');

    res.json(response);

  } catch (error) {
    console.error('💥 Project rubric fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project evaluation form with criteria
app.get('/api/student/projects/:projectId/evaluation-form', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📝 === FETCH PROJECT EVALUATION FORM START ===');
    console.log('📝 Project ID:', projectId);
    console.log('📝 Student ID:', student_id);

    // First, get the project's course_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('📝 Project course_id:', project.course_id);

    // Verify student is enrolled in this project's course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('id')
      .eq('student_id', student_id)
      .eq('course_id', project.course_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('❌ Student not enrolled in this course');
      console.error('❌ Enrollment error:', enrollmentError);
      console.error('❌ Enrollment data:', enrollment);
      return res.status(403).json({ error: 'Access denied - not enrolled in course' });
    }

    console.log('✅ Student enrolled in course:', project.course_id);

    // Fetch project evaluation form
    const { data: evaluationForm, error: formError } = await supabase
      .from('project_evaluation_forms')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return res.status(404).json({ error: 'No evaluation form found for this project' });
      }
      console.error('❌ Evaluation form query error:', formError);
      return res.status(500).json({ error: formError.message });
    }

    // Fetch evaluation criteria
    const { data: criteria, error: criteriaError } = await supabase
      .from('project_evaluation_criteria')
      .select('*')
      .eq('project_evaluation_form_id', evaluationForm.id)
      .order('order_index', { ascending: true });

    if (criteriaError) {
      console.error('❌ Criteria query error:', criteriaError);
      return res.status(500).json({ error: criteriaError.message });
    }

    const response = {
      id: evaluationForm.id,
      project_id: evaluationForm.project_id,
      instructions: evaluationForm.instructions,
      total_points: evaluationForm.total_points,
      created_at: evaluationForm.created_at,
      updated_at: evaluationForm.updated_at,
      criteria: criteria || []
    };

    console.log('✅ Project evaluation form retrieved with', criteria?.length || 0, 'criteria');
    console.log('📝 === FETCH PROJECT EVALUATION FORM COMPLETE ===');

    res.json(response);

  } catch (error) {
    console.error('💥 Project evaluation form fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get phase rubric with criteria
app.get('/api/student/phases/:phaseId/rubric', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const student_id = req.user.id;

    console.log('📋 === FETCH PHASE RUBRIC START ===');
    console.log('📋 Phase ID:', phaseId);
    console.log('📋 Student ID:', student_id);

    // Get the phase's project and course info
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('project_id')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      console.error('❌ Phase not found:', phaseError);
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Get the project's course_id separately
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', phase.project_id)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    const course_id = project.course_id;
    console.log('📋 Phase course_id:', course_id);

    // Verify student is enrolled in this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('id')
      .eq('student_id', student_id)
      .eq('course_id', course_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('❌ Student not enrolled in this course');
      return res.status(403).json({ error: 'Access denied - not enrolled in course' });
    }

    console.log('✅ Student enrolled in course:', course_id);

    // Check for custom rubric first
    const { data: customRubric, error: customRubricError } = await supabase
      .from('phase_custom_rubrics')
      .select('*')
      .eq('phase_id', phaseId)
      .single();

    if (customRubric && !customRubricError) {
      // Return custom rubric with file URL
      console.log('✅ Custom phase rubric found');
      return res.json({
        is_custom: true,
        file_url: customRubric.file_url,
        file_name: customRubric.file_name,
        created_at: customRubric.created_at,
        updated_at: customRubric.updated_at
      });
    }

    // If no custom rubric, fetch built-in rubric
    const { data: rubric, error: rubricError } = await supabase
      .from('phase_rubrics')
      .select('*')
      .eq('phase_id', phaseId)
      .single();

    if (rubricError) {
      if (rubricError.code === 'PGRST116') {
        return res.status(404).json({ error: 'No rubric found for this phase' });
      }
      console.error('❌ Rubric query error:', rubricError);
      return res.status(500).json({ error: rubricError.message });
    }

    // Fetch rubric criteria
    const { data: criteria, error: criteriaError } = await supabase
      .from('phase_rubric_criteria')
      .select('*')
      .eq('phase_rubric_id', rubric.id)
      .order('order_index', { ascending: true });

    if (criteriaError) {
      console.error('❌ Criteria query error:', criteriaError);
      return res.status(500).json({ error: criteriaError.message });
    }

    const response = {
      is_custom: false,
      id: rubric.id,
      phase_id: rubric.phase_id,
      instructions: rubric.instructions,
      total_points: rubric.total_points,
      created_at: rubric.created_at,
      updated_at: rubric.updated_at,
      criteria: criteria || []
    };

    console.log('✅ Phase rubric retrieved with', criteria?.length || 0, 'criteria');
    console.log('📋 === FETCH PHASE RUBRIC COMPLETE ===');

    res.json(response);

  } catch (error) {
    console.error('💥 Phase rubric fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get phase evaluation form with criteria
app.get('/api/student/phases/:phaseId/evaluation-form', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const student_id = req.user.id;

    console.log('📝 === FETCH PHASE EVALUATION FORM START ===');
    console.log('📝 Phase ID:', phaseId);
    console.log('📝 Student ID:', student_id);

    // Get the phase's project and course info
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('project_id')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      console.error('❌ Phase not found:', phaseError);
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Get the project's course_id separately
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', phase.project_id)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    const course_id = project.course_id;
    console.log('📝 Phase course_id:', course_id);

    // Verify student is enrolled in this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('id')
      .eq('student_id', student_id)
      .eq('course_id', course_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('❌ Student not enrolled in this course');
      return res.status(403).json({ error: 'Access denied - not enrolled in course' });
    }

    console.log('✅ Student enrolled in course:', course_id);

    // Fetch phase evaluation form
    const { data: evaluationForm, error: formError } = await supabase
      .from('phase_evaluation_forms')
      .select('*')
      .eq('phase_id', phaseId)
      .single();

    if (formError) {
      if (formError.code === 'PGRST116') {
        return res.status(404).json({ error: 'No evaluation form found for this phase' });
      }
      console.error('❌ Evaluation form query error:', formError);
      return res.status(500).json({ error: formError.message });
    }

    // Check if it's a custom evaluation form
    if (evaluationForm.is_custom_evaluation && evaluationForm.custom_file_url) {
      console.log('✅ Custom phase evaluation form found');
      return res.json({
        is_custom: true,
        custom_file_url: evaluationForm.custom_file_url,
        custom_file_name: evaluationForm.custom_file_name,
        id: evaluationForm.id,
        phase_id: evaluationForm.phase_id,
        instructions: evaluationForm.instructions,
        total_points: evaluationForm.total_points,
        available_from: evaluationForm.available_from,
        due_date: evaluationForm.due_date,
        created_at: evaluationForm.created_at,
        updated_at: evaluationForm.updated_at
      });
    }

    // Built-in evaluation form - fetch criteria
    const { data: criteria, error: criteriaError } = await supabase
      .from('phase_evaluation_criteria')
      .select('*')
      .eq('phase_evaluation_form_id', evaluationForm.id)
      .order('order_index', { ascending: true });

    if (criteriaError) {
      console.error('❌ Criteria query error:', criteriaError);
      return res.status(500).json({ error: criteriaError.message });
    }

    const response = {
      is_custom: false,
      id: evaluationForm.id,
      phase_id: evaluationForm.phase_id,
      instructions: evaluationForm.instructions,
      total_points: evaluationForm.total_points,
      available_from: evaluationForm.available_from,
      due_date: evaluationForm.due_date,
      created_at: evaluationForm.created_at,
      updated_at: evaluationForm.updated_at,
      criteria: criteria || []
    };

    console.log('✅ Phase evaluation form retrieved with', criteria?.length || 0, 'criteria');
    console.log('📝 === FETCH PHASE EVALUATION FORM COMPLETE ===');

    res.json(response);

  } catch (error) {
    console.error('💥 Phase evaluation form fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get phase evaluation submissions for all group members
app.get('/api/student/phases/:phaseId/group-evaluation-status', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const student_id = req.user.id;

    console.log('📝 === FETCH PHASE GROUP EVALUATION STATUS START ===');
    console.log('📝 Phase ID:', phaseId);
    console.log('📝 Student ID:', student_id);

    // Get the student's group for this phase
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('project_id')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      console.error('❌ Phase not found:', phaseError);
      return res.status(404).json({ error: 'Phase not found' });
    }

    console.log('📝 Phase data:', phase);

    // Get the project's course_id separately
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('course_id')
      .eq('id', phase.project_id)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    const course_id = project.course_id;
    console.log('📝 Course ID:', course_id);

    // Verify student is enrolled in this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('id, course_id, student_id')
      .eq('student_id', student_id)
      .eq('course_id', course_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('❌ Student not enrolled:', enrollmentError);
      return res.status(403).json({ error: 'Access denied - not enrolled in course' });
    }

    console.log('✅ Student enrolled in course:', course_id);

    // Get student's group membership
    const { data: groupMemberships, error: groupError} = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', student_id)
      .eq('is_active', true);

    if (groupError) {
      console.error('❌ Error fetching group membership:', groupError);
      return res.status(500).json({ error: groupError.message });
    }

    if (!groupMemberships || groupMemberships.length === 0) {
      console.log('⚠️ Student not in any ACTIVE group - checking if inactive groups exist');
      
      // Check if there are inactive groups
      const { data: inactiveGroups } = await supabase
        .from('course_group_members')
        .select('group_id, is_active')
        .eq('student_id', student_id);
      
      console.log('🔍 All group memberships (including inactive):', inactiveGroups);
      
      // Return empty result instead of error
      return res.json({
        phase_id: phaseId,
        group_id: null,
        members: []
      });
    }

    console.log('🔍 Found group memberships:', groupMemberships);

    // Get course_id for each group to find the right one
    let groupMembership = null;
    for (const gm of groupMemberships) {
      console.log('🔍 Checking group:', gm.group_id);
      const { data: groupData, error: groupDataError } = await supabase
        .from('course_groups')
        .select('course_id')
        .eq('id', gm.group_id)
        .single();

      if (groupDataError) {
        console.log('❌ Error fetching group data:', groupDataError);
      } else {
        console.log('✅ Group data:', groupData);
        console.log('   Group course_id:', groupData?.course_id);
        console.log('   Required course_id:', course_id);
        console.log('   Match?', groupData?.course_id === course_id);
      }

      if (!groupDataError && groupData && groupData.course_id === course_id) {
        groupMembership = gm;
        console.log('✅ Found matching group:', gm.group_id, 'for course:', course_id);
        break;
      }
    }

    console.log('🔍 Looking for group in course:', course_id);

    if (!groupMembership) {
      console.log('⚠️ Student not in a group for this course yet');
      console.log('   Required course_id:', course_id);
      return res.json({
        phase_id: phaseId,
        group_id: null,
        members: []
      });
    }

    const group_id = groupMembership.group_id;
    
    console.log('✅ Found group for this course:', {
      group_id,
      phase_course_id: course_id
    });

    // Get all members of the group
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        studentaccounts(
          id,
          first_name,
          last_name,
          student_number,
          email
        )
      `)
      .eq('group_id', group_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Error fetching group members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    console.log('✅ Found', members?.length || 0, 'group members');

    // Get all phase evaluation submissions for this phase and group with phase info
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_evaluation_submissions')
      .select(`
        *,
        phase:project_phases!phase_evaluation_submissions_phase_id_fkey(
          id,
          phase_number,
          title
        )
      `)
      .eq('phase_id', phaseId)
      .eq('group_id', group_id);

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    console.log('✅ Found', submissions?.length || 0, 'evaluation submissions');
    console.log('📊 All submissions:', JSON.stringify(submissions?.map(s => ({
      id: s.id,
      evaluator_id: s.evaluator_id,
      phase_id: s.phase_id,
      group_id: s.group_id,
      status: s.status,
      is_custom: s.is_custom_evaluation,
      has_file: !!s.file_submission_url,
      has_data: !!s.evaluation_data
    })), null, 2));

    // Build response with submission status for each member
    const memberStatuses = members.map(member => {
      const memberSubmissions = (submissions || []).filter(
        sub => sub.evaluator_id === member.student_id
      );

      console.log(`👤 Member ${member.student_id}:`, {
        name: member.studentaccounts 
          ? `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`.trim()
          : 'Unknown',
        total_submissions: memberSubmissions.length,
        submissions: memberSubmissions.map(s => ({
          id: s.id,
          status: s.status,
          is_custom: s.is_custom_evaluation,
          has_file: !!s.file_submission_url,
          has_data: !!s.evaluation_data
        }))
      });

      // Count submitted evaluations (status != 'not_started')
      const submittedCount = memberSubmissions.filter(
        sub => sub.status && sub.status !== 'not_started'
      ).length;
      
      console.log(`   ✅ Submitted count: ${submittedCount}`);

      // Check if this is a custom evaluation
      const hasCustomEval = memberSubmissions.some(sub => sub.is_custom_evaluation && sub.file_submission_url);
      const hasBuiltInEval = memberSubmissions.some(sub => !sub.is_custom_evaluation && sub.evaluation_data);

      return {
        student_id: member.student_id,
        student_name: member.studentaccounts 
          ? `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`.trim()
          : 'Unknown',
        student_number: member.studentaccounts?.student_number || '',
        total_submissions: memberSubmissions.length,
        submitted_count: submittedCount,
        has_submitted: submittedCount > 0,
        is_custom_evaluation: hasCustomEval,
        submissions: memberSubmissions.map(sub => ({
          id: sub.id,
          status: sub.status,
          submission_date: sub.submission_date,
          is_custom: sub.is_custom_evaluation,
          has_file: !!sub.file_submission_url,
          has_data: !!sub.evaluation_data,
          phase_number: sub.phase?.phase_number || 0,
          phase_title: sub.phase?.title || 'Unknown Phase',
          evaluation_label: sub.phase 
            ? `Phase ${sub.phase.phase_number}: ${sub.phase.title} Evaluation`
            : 'Phase Evaluation'
        }))
      };
    });

    console.log('✅ Phase evaluation status retrieved for', memberStatuses.length, 'members');
    console.log('📝 === FETCH PHASE GROUP EVALUATION STATUS COMPLETE ===');

    res.json({
      phase_id: phaseId,
      group_id: group_id,
      members: memberStatuses
    });

  } catch (error) {
    console.error('💥 Phase group evaluation status fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project evaluation submissions for all group members
app.get('/api/student/projects/:projectId/group-evaluation-status', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const student_id = req.user.id;

    console.log('📝 === FETCH PROJECT GROUP EVALUATION STATUS START ===');
    console.log('📝 Project ID:', projectId);
    console.log('📝 Student ID:', student_id);

    // Get the project and verify it exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, course_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify student is enrolled in this course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_students')
      .select('id, course_id, student_id')
      .eq('student_id', student_id)
      .eq('course_id', project.course_id)
      .eq('is_active', true)
      .single();

    if (enrollmentError || !enrollment) {
      console.error('❌ Student not enrolled:', enrollmentError);
      return res.status(403).json({ error: 'Access denied - not enrolled in course' });
    }

    console.log('✅ Student enrolled in course:', project.course_id);

    // Get student's group membership
    const { data: groupMemberships, error: groupError} = await supabase
      .from('course_group_members')
      .select('group_id, role')
      .eq('student_id', student_id)
      .eq('is_active', true);

    if (groupError) {
      console.error('❌ Error fetching group membership:', groupError);
      return res.status(500).json({ error: groupError.message });
    }

    if (!groupMemberships || groupMemberships.length === 0) {
      console.log('⚠️ Student not in any ACTIVE group');
      return res.json({
        project_id: projectId,
        group_id: null,
        members: []
      });
    }

    console.log('🔍 Found group memberships:', groupMemberships);

    // Get course_id for each group to find the right one
    let groupMembership = null;
    for (const gm of groupMemberships) {
      console.log('🔍 Checking group:', gm.group_id);
      const { data: groupData, error: groupDataError } = await supabase
        .from('course_groups')
        .select('course_id')
        .eq('id', gm.group_id)
        .single();

      if (groupDataError) {
        console.log('❌ Error fetching group data:', groupDataError);
      } else {
        console.log('✅ Group data:', groupData);
        console.log('   Group course_id:', groupData?.course_id);
        console.log('   Required course_id:', project.course_id);
        console.log('   Match?', groupData?.course_id === project.course_id);
      }

      if (!groupDataError && groupData && groupData.course_id === project.course_id) {
        groupMembership = gm;
        console.log('✅ Found matching group:', gm.group_id, 'for course:', project.course_id);
        break;
      }
    }

    console.log('🔍 Looking for group in course:', project.course_id);

    if (!groupMembership) {
      console.log('⚠️ Student not in a group for this course yet');
      return res.json({
        project_id: projectId,
        group_id: null,
        members: []
      });
    }

    const group_id = groupMembership.group_id;
    
    console.log('✅ Found group for this course:', {
      group_id,
      project_course_id: project.course_id
    });

    // Get all members of the group
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        studentaccounts(
          id,
          first_name,
          last_name,
          student_number,
          email
        )
      `)
      .eq('group_id', group_id)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Error fetching group members:', membersError);
      return res.status(500).json({ error: membersError.message });
    }

    console.log('✅ Found', members?.length || 0, 'group members');

    // Get all project evaluation submissions for this project and group
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_evaluation_submissions')
      .select(`
        *,
        project:projects!project_evaluation_submissions_project_id_fkey(
          id,
          title
        )
      `)
      .eq('project_id', projectId)
      .eq('group_id', group_id);

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    console.log('✅ Found', submissions?.length || 0, 'project evaluation submissions');
    console.log('📊 All submissions:', JSON.stringify(submissions?.map(s => ({
      id: s.id,
      evaluator_id: s.evaluator_id,
      project_id: s.project_id,
      group_id: s.group_id,
      status: s.status,
      is_custom: s.is_custom_evaluation,
      has_file: !!s.file_submission_url,
      has_data: !!s.evaluation_data
    })), null, 2));

    // Build response with submission status for each member
    const memberStatuses = members.map(member => {
      const memberSubmissions = (submissions || []).filter(
        sub => sub.evaluator_id === member.student_id
      );

      console.log(`👤 Member ${member.student_id}:`, {
        name: member.studentaccounts 
          ? `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`.trim()
          : 'Unknown',
        total_submissions: memberSubmissions.length,
        submissions: memberSubmissions.map(s => ({
          id: s.id,
          status: s.status,
          is_custom: s.is_custom_evaluation,
          has_file: !!s.file_submission_url,
          has_data: !!s.evaluation_data
        }))
      });

      // Count submitted evaluations (status != 'not_started')
      const submittedCount = memberSubmissions.filter(
        sub => sub.status && sub.status !== 'not_started'
      ).length;
      
      console.log(`   ✅ Submitted count: ${submittedCount}`);

      // Check if this is a custom evaluation
      const hasCustomEval = memberSubmissions.some(sub => sub.is_custom_evaluation && sub.file_submission_url);
      const hasBuiltInEval = memberSubmissions.some(sub => !sub.is_custom_evaluation && sub.evaluation_data);

      return {
        student_id: member.student_id,
        student_name: member.studentaccounts 
          ? `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`.trim()
          : 'Unknown',
        student_number: member.studentaccounts?.student_number || '',
        total_submissions: memberSubmissions.length,
        submitted_count: submittedCount,
        has_submitted: submittedCount > 0,
        is_custom_evaluation: hasCustomEval,
        submissions: memberSubmissions.map(sub => ({
          id: sub.id,
          status: sub.status,
          submission_date: sub.submission_date,
          is_custom: sub.is_custom_evaluation,
          has_file: !!sub.file_submission_url,
          has_data: !!sub.evaluation_data,
          project_id: sub.project?.id || projectId,
          project_title: sub.project?.title || 'Unknown Project',
          evaluation_label: sub.project 
            ? `${sub.project.title} - Project Evaluation`
            : 'Project Evaluation'
        }))
      };
    });

    console.log('✅ Project evaluation status retrieved for', memberStatuses.length, 'members');
    console.log('📝 === FETCH PROJECT GROUP EVALUATION STATUS COMPLETE ===');

    res.json({
      project_id: projectId,
      group_id: group_id,
      members: memberStatuses
    });

  } catch (error) {
    console.error('💥 Project group evaluation status fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student's evaluation submissions for a phase or project
app.get('/api/student/groups/:groupId/evaluations/my-submissions', authenticateStudent, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { phaseId, projectId } = req.query;
    const student_id = req.user.id;

    console.log('\n📝 === FETCH MY EVALUATION SUBMISSIONS ===');
    console.log('👤 Student ID:', student_id);
    console.log('👥 Group ID:', groupId);
    console.log('🔵 Phase ID:', phaseId);
    console.log('🔶 Project ID:', projectId);
    console.log('📋 Query params:', { phaseId, projectId, student_id, groupId });

    // Verify student is member of this group
    const { data: membership, error: memberError } = await supabase
      .from('course_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      console.log('❌ Not a member of this group');
      return res.status(403).json({ error: 'Not authorized to view this group\'s evaluations' });
    }

    console.log('✅ Membership verified, role:', membership.role);

    let submissions = [];

    // If phaseId is provided, fetch from phase_evaluation_submissions
    if (phaseId) {
      console.log('🔵 Fetching phase evaluation submissions for phase:', phaseId);
      console.log('🔍 Query filters - group_id:', groupId, 'phase_id:', phaseId, 'evaluator_id:', student_id);
      const { data: phaseSubmissions, error: phaseError } = await supabase
        .from('phase_evaluation_submissions')
        .select(`
          id,
          project_id,
          phase_id,
          group_id,
          evaluator_id,
          phase_evaluation_form_id,
          submission_date,
          evaluation_data,
          comments,
          status,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('phase_id', phaseId)
        .eq('evaluator_id', student_id)
        .order('submission_date', { ascending: false });

      if (phaseError) {
        console.error('❌ Phase submissions query error:', phaseError);
        return res.status(500).json({ error: phaseError.message });
      }

      console.log('✅ Found', phaseSubmissions?.length || 0, 'phase evaluation submissions');
      if (phaseSubmissions?.length > 0) {
        console.log('📋 Phase submissions data:', JSON.stringify(phaseSubmissions, null, 2));
      } else {
        console.log('⚠️ No submissions found with filters - group_id:', groupId, 'phase_id:', phaseId, 'evaluator_id:', student_id);
      }
      submissions = phaseSubmissions || [];
    } else if (projectId) {
      // ✅ FIX: If projectId is provided, fetch from project_evaluation_submissions (not phase table!)
      console.log('🔶 Fetching project evaluation submissions for project:', projectId);
      const { data: projectSubmissions, error: projectError } = await supabase
        .from('project_evaluation_submissions')
        .select(`
          id,
          project_id,
          group_id,
          evaluator_id,
          project_evaluation_form_id,
          evaluation_data,
          submission_date,
          comments,
          status,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('project_id', projectId)
        .eq('evaluator_id', student_id)
        .order('submission_date', { ascending: false });

      if (projectError) {
        console.error('❌ Project submissions query error:', projectError);
        return res.status(500).json({ error: projectError.message });
      }

      console.log('✅ Found', projectSubmissions?.length || 0, 'project evaluation submissions');
      submissions = projectSubmissions || [];
    } else {
      // Fetch both regular evaluations and phase evaluations
      console.log('📋 Fetching all evaluation submissions');
      
      // Get regular evaluations
      const { data: regularSubmissions, error: regularError } = await supabase
        .from('evaluation_submissions')
        .select(`
          id,
          project_id,
          phase_id,
          group_id,
          evaluator_id,
          evaluated_student_id,
          evaluation_form_id,
          submission_date,
          evaluation_data,
          comments,
          grade,
          status,
          created_at,
          evaluated_student:evaluated_student_id (
            id,
            first_name,
            middle_name,
            last_name,
            student_number,
            profile_image_url
          )
        `)
        .eq('group_id', groupId)
        .eq('evaluator_id', student_id)
        .order('submission_date', { ascending: false });

      if (regularError) {
        console.error('❌ Regular submissions query error:', regularError);
      }

      // Get phase evaluations
      const { data: phaseSubmissions, error: phaseError } = await supabase
        .from('phase_evaluation_submissions')
        .select(`
          id,
          project_id,
          phase_id,
          group_id,
          evaluator_id,
          phase_evaluation_form_id,
          submission_date,
          evaluation_data,
          comments,
          status,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('evaluator_id', student_id)
        .order('submission_date', { ascending: false });

      if (phaseError) {
        console.error('❌ Phase submissions query error:', phaseError);
      }

      // ✅ FIX: Also get project evaluations
      const { data: projectEvalSubmissions, error: projectEvalError } = await supabase
        .from('project_evaluation_submissions')
        .select(`
          id,
          project_id,
          group_id,
          evaluator_id,
          project_evaluation_form_id,
          evaluation_data,
          submission_date,
          comments,
          status,
          created_at
        `)
        .eq('group_id', groupId)
        .eq('evaluator_id', student_id)
        .order('submission_date', { ascending: false });

      if (projectEvalError) {
        console.error('❌ Project evaluation submissions query error:', projectEvalError);
      }

      submissions = [
        ...(regularSubmissions || []), 
        ...(phaseSubmissions || []),
        ...(projectEvalSubmissions || [])
      ];
      console.log('✅ Found', submissions?.length || 0, 'total evaluation submissions');
    }

    // Also fetch group members for the evaluation list
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        id,
        student_id,
        role,
        position,
        student:student_id (
          id,
          first_name,
          middle_name,
          last_name,
          student_number,
          profile_image_url,
          email
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Members query error:', membersError);
    }

    // Calculate average scores per criterion if builtin evaluation
    let averageScores = null;
    if (submissions && submissions.length > 0 && submissions[0].evaluation_data) {
      const criteriaScores = {};
      
      submissions.forEach(submission => {
        if (submission.evaluation_data && typeof submission.evaluation_data === 'object') {
          Object.keys(submission.evaluation_data).forEach(criterionId => {
            if (!criteriaScores[criterionId]) {
              criteriaScores[criterionId] = {
                total: 0,
                count: 0,
                name: submission.evaluation_data[criterionId].name || criterionId
              };
            }
            const score = parseFloat(submission.evaluation_data[criterionId].score || 0);
            criteriaScores[criterionId].total += score;
            criteriaScores[criterionId].count += 1;
          });
        }
      });

      // Calculate averages
      averageScores = Object.keys(criteriaScores).map(criterionId => ({
        criterionId,
        name: criteriaScores[criterionId].name,
        avgScore: (criteriaScores[criterionId].total / criteriaScores[criterionId].count).toFixed(1),
        totalEvaluations: criteriaScores[criterionId].count
      }));
    }

    console.log('✅ === FETCH MY EVALUATION SUBMISSIONS COMPLETE ===');
    console.log('📊 [RESPONSE] Total submissions:', submissions?.length || 0);
    console.log('📊 [RESPONSE] Total members:', members?.length || 0);
    if (submissions?.length > 0) {
      console.log('📊 [RESPONSE] First submission:', JSON.stringify(submissions[0], null, 2));
    }
    console.log('');

    res.json({
      submissions: submissions || [],
      groupMembers: members || [],
      averageScores: averageScores
    });

  } catch (error) {
    console.error('💥 Fetch my evaluation submissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get evaluations RECEIVED by the student (scores given TO them by others)
app.get('/api/student/groups/:groupId/evaluations/received', authenticateStudent, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { phaseId, projectId } = req.query;
    const student_id = req.user.id;

    console.log('\n📝 === FETCH RECEIVED EVALUATIONS (SCORES GIVEN TO ME) ===');
    console.log('👤 Student ID:', student_id);
    console.log('👥 Group ID:', groupId);
    console.log('🔵 Phase ID:', phaseId);
    console.log('🔶 Project ID:', projectId);

    // Verify student is member of this group
    const { data: membership, error: memberError } = await supabase
      .from('course_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      console.log('❌ Not a member of this group');
      return res.status(403).json({ error: 'Not authorized to view this group\'s evaluations' });
    }

    console.log('✅ Membership verified, role:', membership.role);

    // Build query for evaluation_submissions WHERE evaluated_student_id = current user
    let query = supabase
      .from('evaluation_submissions')
      .select(`
        id,
        project_id,
        phase_id,
        group_id,
        evaluator_id,
        evaluated_student_id,
        evaluation_form_id,
        submission_date,
        evaluation_data,
        comments,
        grade,
        status,
        created_at,
        evaluator:evaluator_id (
          id,
          first_name,
          middle_name,
          last_name,
          student_number,
          profile_image_url
        )
      `)
      .eq('group_id', groupId)
      .eq('evaluated_student_id', student_id); // Key difference: evaluated_student_id instead of evaluator_id

    // Filter by phase or project
    if (phaseId) {
      query = query.eq('phase_id', phaseId);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: submissions, error: submissionsError } = await query.order('submission_date', { ascending: false });

    if (submissionsError) {
      console.error('❌ Submissions query error:', submissionsError);
      return res.status(500).json({ error: submissionsError.message });
    }

    console.log('✅ Found', submissions?.length || 0, 'evaluations received from other members');

    // Also fetch group members
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        id,
        student_id,
        role,
        position,
        student:student_id (
          id,
          first_name,
          middle_name,
          last_name,
          student_number,
          profile_image_url,
          email
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Members query error:', membersError);
    }

    // Calculate average scores per criterion from received evaluations
    let averageScores = null;
    if (submissions && submissions.length > 0) {
      const criteriaScores = {};
      
      submissions.forEach(submission => {
        if (submission.evaluation_data && typeof submission.evaluation_data === 'object') {
          Object.keys(submission.evaluation_data).forEach(criterionId => {
            if (!criteriaScores[criterionId]) {
              criteriaScores[criterionId] = {
                total: 0,
                count: 0,
                name: submission.evaluation_data[criterionId].name || criterionId,
                maxPoints: parseInt(submission.evaluation_data[criterionId].maxPoints || 0)
              };
            }
            const score = parseFloat(submission.evaluation_data[criterionId].score || 0);
            criteriaScores[criterionId].total += score;
            criteriaScores[criterionId].count += 1;
          });
        }
      });

      // Calculate averages
      averageScores = Object.keys(criteriaScores).map(criterionId => ({
        criterionId,
        name: criteriaScores[criterionId].name,
        maxPoints: criteriaScores[criterionId].maxPoints,
        avgScore: (criteriaScores[criterionId].total / criteriaScores[criterionId].count).toFixed(1),
        totalEvaluations: criteriaScores[criterionId].count
      }));
    }

    console.log('✅ === FETCH RECEIVED EVALUATIONS COMPLETE ===\n');

    res.json({
      submissions: submissions || [],
      groupMembers: members || [],
      averageScores: averageScores
    });

  } catch (error) {
    console.error('💥 Fetch received evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Student announcements endpoint
app.get('/api/student/announcements', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;

    console.log('📢 === STUDENT ANNOUNCEMENTS WITH NEW TABLE START ===');
    console.log('📢 Student ID:', student_id);

    // Get student's enrolled courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('student_id', student_id)
      .eq('is_active', true);

    if (enrollmentsError) {
      console.error('❌ Enrollments query error:', enrollmentsError);
      return res.status(500).json({ error: enrollmentsError.message });
    }

    const courseIds = enrollments?.map(e => e.course_id) || [];

    if (courseIds.length === 0) {
      return res.json([]);
    }

    // Get announcements from new announcements table
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select(`
        *,
        courses(course_name, course_code),
        professoraccounts!announcements_created_by_fkey(first_name, last_name)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (announcementsError) {
      console.error('❌ Announcements query error:', announcementsError);
      return res.status(500).json({ error: announcementsError.message });
    }

    // Format announcements
    const formattedAnnouncements = announcements?.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || 'info',
      author: announcement.professoraccounts ? 
        `${announcement.professoraccounts.first_name} ${announcement.professoraccounts.last_name}` : 
        'Professor',
      created_at: announcement.created_at,
      course_name: announcement.courses?.course_name,
      course_code: announcement.courses?.course_code
    })) || [];

    console.log('✅ Announcements retrieved:', formattedAnnouncements.length);
    console.log('📢 === STUDENT ANNOUNCEMENTS WITH NEW TABLE COMPLETE ===');

    res.json(formattedAnnouncements);

  } catch (error) {
    console.error('💥 Student announcements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alternative: Use URL parameter approach
// Enhanced file serving endpoint with user ID path support
app.get('/api/files/studentaccounts/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    console.log('📸 Serving student file:', { userId, filename });
    
    if (!userId || !filename) {
      return res.status(400).json({ error: 'User ID and filename required' });
    }
    
    // Construct the full file path in storage
    const filePath = `${userId}/${filename}`;
    
    // Try the main studentaccounts bucket first
    let file = null;
    let successBucket = null;
    
    const buckets = ['studentaccounts', 'pending_studentaccounts'];
    
    for (const bucketName of buckets) {
      try {
        console.log(`📸 Trying bucket: ${bucketName}, path: ${filePath}`);
        
        const result = await supabase.storage
          .from(bucketName)
          .download(filePath);
        
        if (result.data && !result.error) {
          file = result.data;
          successBucket = bucketName;
          console.log(`✅ Found in bucket: ${bucketName}`);
          break;
        }
      } catch (bucketError) {
        console.log(`❌ ${bucketName} error:`, bucketError.message);
        continue;
      }
    }
    
    if (!file) {
      console.log('❌ File not found in any bucket:', filePath);
      return res.status(404).json({ 
        error: 'File not found',
        filePath,
        buckets: buckets
      });
    }
    
    // Set appropriate content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }[ext] || 'image/jpeg';
    
    console.log(`✅ Serving: ${filename} from ${successBucket}`);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('📸 File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Also add support for professor files with user ID
app.get('/api/files/professoraccounts/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    console.log('📸 Serving professor file:', { userId, filename });
    
    if (!userId || !filename) {
      return res.status(400).json({ error: 'User ID and filename required' });
    }
    
    const filePath = `${userId}/${filename}`;
    
    let file = null;
    let successBucket = null;
    
    const buckets = ['professoraccounts', 'pending_professoraccounts'];
    
    for (const bucketName of buckets) {
      try {
        const result = await supabase.storage
          .from(bucketName)
          .download(filePath);
        
        if (result.data && !result.error) {
          file = result.data;
          successBucket = bucketName;
          break;
        }
      } catch (bucketError) {
        continue;
      }
    }
    
    if (!file) {
      return res.status(404).json({ 
        error: 'File not found',
        filePath
      });
    }
    
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }[ext] || 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('Professor file serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

app.get('/api/files/professoraccounts/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    console.log('📸 Serving professor file:', filename);
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const { data: file, error } = await supabase.storage
      .from('professoraccounts')
      .download(filename);
    
    if (error || !file) {
      console.error('File not found in professoraccounts:', error?.message);
      return res.status(404).json({ error: 'File not found' });
    }
    
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }[ext] || 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('Professor file serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});















// Add this debug endpoint
app.get('/api/debug/profile-image/:studentId', authenticateAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student record
    const { data: student, error } = await supabase
      .from('studentaccounts')
      .select('*')
      .eq('id', studentId)
      .single();
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Check if file exists in storage
    const buckets = ['studentaccounts', 'pending_studentaccounts'];
    const results = [];
    
    for (const bucket of buckets) {
      if (student.profile_image_url) {
        const filePath = `${studentId}/${student.profile_image_url}`;
        
        try {
          const { data: file, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(filePath);
          
          results.push({
            bucket,
            filePath,
            exists: !downloadError,
            error: downloadError?.message || null,
            size: file?.size || null
          });
        } catch (err) {
          results.push({
            bucket,
            filePath,
            exists: false,
            error: err.message
          });
        }
      }
    }
    
    res.json({
      student: {
        id: student.id,
        email: student.email,
        profile_image_url: student.profile_image_url
      },
      constructedUrl: student.profile_image_url ? 
        `/api/files/studentaccounts/${studentId}/${student.profile_image_url}` : null,
      bucketChecks: results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});









// =================== STATIC FILE SERVING ===================

// ✅ SIMPLE FIX: Just handle root route explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Debug endpoint to check user group memberships
app.get('/api/student/debug/groups', authenticateStudent, async (req, res) => {
  try {
    console.log('🔍 DEBUG - User ID:', req.user.id);
    
    // Get all group memberships for the user
    const { data: memberships, error } = await supabase
      .from('course_group_members')
      .select(`
        *,
        course_groups!inner(
          *,
          courses!inner(
            *,
            projects(*)
          )
        )
      `)
      .eq('student_id', req.user.id);
    
    if (error) {
      console.error('Debug groups error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('🔍 DEBUG - User memberships:', JSON.stringify(memberships, null, 2));
    
    res.json({
      user_id: req.user.id,
      memberships: memberships || [],
      total_groups: memberships?.length || 0
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ COMPREHENSIVE DEBUG ENDPOINT - Check group membership with all filters
app.get('/api/student/debug/group-membership-detailed', authenticateStudent, async (req, res) => {
  try {
    const student_id = req.user.id;
    console.log('🔍 DETAILED DEBUG: Checking group membership for student:', student_id);

    // 1. Check with is_active = true
    const { data: activeMemberships, error: activeError } = await supabase
      .from('course_group_members')
      .select('id, group_id, student_id, role, is_active, created_at')
      .eq('student_id', student_id)
      .eq('is_active', true);

    // 2. Check with is_active = false
    const { data: inactiveMemberships, error: inactiveError } = await supabase
      .from('course_group_members')
      .select('id, group_id, student_id, role, is_active, created_at')
      .eq('student_id', student_id)
      .eq('is_active', false);

    // 3. Check all memberships (no filter)
    const { data: allMemberships, error: allError } = await supabase
      .from('course_group_members')
      .select('id, group_id, student_id, role, is_active, created_at')
      .eq('student_id', student_id);

    // 4. For each group, get group details
    const groupDetails = [];
    if (allMemberships && allMemberships.length > 0) {
      for (const membership of allMemberships) {
        const { data: groupInfo } = await supabase
          .from('course_groups')
          .select('id, course_id, group_number, group_name, is_active')
          .eq('id', membership.group_id)
          .single();

        const { data: courseInfo } = await supabase
          .from('courses')
          .select('id, course_name, course_code')
          .eq('id', groupInfo?.course_id)
          .single();

        const { data: memberCount } = await supabase
          .from('course_group_members')
          .select('id', { count: 'exact' })
          .eq('group_id', membership.group_id);

        groupDetails.push({
          membership: membership,
          group: groupInfo,
          course: courseInfo,
          member_count: memberCount?.length || 0
        });
      }
    }

    res.json({
      student_id: student_id,
      debug_info: {
        active_memberships: activeMemberships || [],
        active_count: activeMemberships?.length || 0,
        inactive_memberships: inactiveMemberships || [],
        inactive_count: inactiveMemberships?.length || 0,
        all_memberships: allMemberships || [],
        total_count: allMemberships?.length || 0
      },
      group_details: groupDetails,
      errors: {
        active_error: activeError,
        inactive_error: inactiveError,
        all_error: allError
      }
    });

  } catch (error) {
    console.error('Detailed debug endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// =================== SPA CATCH-ALL ROUTE ===================
// This MUST be the last route - it handles client-side routing for React Router
// Serve index.html for all non-API routes so React Router can handle navigation
if (buildPathExists) {
  app.get('*', (req, res) => {
    // Don't intercept API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log(`🔄 [SPA] Serving index.html for route: ${req.path}`);
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// =================== SERVER STARTUP ===================

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Database: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`📧 Email: ${process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`✅ Course Management System: Ready`);
  console.log(`🔐 Authentication: Admin, Professor, Student`);
});

// Serve task submission files
app.get('/api/files/task-submissions/:submissionId/:filename', authenticateStudent, async (req, res) => {
  try {
    const { submissionId, filename } = req.params;
    const student_id = req.user.id;

    console.log('📄 Serving task submission file:', { submissionId, filename });

    if (!submissionId || !filename) {
      return res.status(400).json({ error: 'Submission ID and filename required' });
    }

    // Construct the file path in storage
    const filePath = `${submissionId}/${filename}`;

    // Download the file from storage
    const { data: file, error: downloadError } = await supabase.storage
      .from('task_submissions')
      .download(filePath);

    if (downloadError) {
      console.error('❌ Error downloading file:', downloadError);
      return res.status(500).json({ error: 'Failed to download file' });
    }

    if (!file) {
      console.error('❌ File not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Get MIME type based on extension
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Set response headers for download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', file.size);

    console.log('✅ Serving file:', filename, '(', file.size, 'bytes)');
    res.send(file);
  } catch (error) {
    console.error('❌ Task submission file serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Download file for submission checking (students can download submission files from their group)
app.get('/api/student/download-file', authenticateStudent, async (req, res) => {
  try {
    const { fileUrl } = req.query;
    const student_id = req.user.id;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }
    
    console.log('📥 Student download request for file:', fileUrl);
    
    // Extract file path from URL - handle different URL formats
    let filePath = '';
    
    // Handle API path format: /api/files/task-submissions/{submissionId}/{filename}
    if (fileUrl.includes('/api/files/task-submissions/')) {
      const urlParts = fileUrl.split('/api/files/task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from API path:', filePath);
    }
    // Handle full Supabase storage URL format
    else if (fileUrl.includes('.supabase.co/storage/v1/object/public/task-submissions/')) {
      const urlParts = fileUrl.split('/storage/v1/object/public/task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from public URL:', filePath);
    }
    // Handle storage object URL format  
    else if (fileUrl.includes('.supabase.co/storage/v1/object/task-submissions/')) {
      const urlParts = fileUrl.split('/storage/v1/object/task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from object URL:', filePath);
    }
    // Handle relative path with task-submissions/
    else if (fileUrl.includes('task-submissions/')) {
      const urlParts = fileUrl.split('task-submissions/');
      filePath = urlParts[1];
      console.log('📁 Extracted from relative path:', filePath);
    }
    // Handle direct file path (submissionId/filename)
    else if (fileUrl.includes('/')) {
      filePath = fileUrl;
      console.log('📁 Using direct path:', filePath);
    }
    else {
      return res.status(400).json({ error: 'Invalid file URL format' });
    }
    
    console.log('📁 Final file path for download:', filePath);
    
    if (!filePath) {
      return res.status(400).json({ error: 'Could not extract file path' });
    }

    // Use fresh service role client for storage operations
    const freshSupabase = getFreshSupabaseClient();
    
    // Decode the file path - URL encoding might be an issue
    const decodedFilePath = decodeURIComponent(filePath);
    console.log('📁 Decoded file path:', decodedFilePath);
    
    // Download file from Supabase storage using service role
    const { data: fileData, error: downloadError } = await freshSupabase.storage
      .from('task-submissions')
      .download(decodedFilePath);
      
    if (downloadError) {
      console.error('❌ File download error:', downloadError);
      console.error('❌ Error details:', JSON.stringify(downloadError, null, 2));
      
      // Try to get public URL as alternative
      console.log('🔄 Attempting to get signed download URL...');
      const { data: signedUrlData, error: signedUrlError } = await freshSupabase.storage
        .from('task-submissions')
        .createSignedUrl(decodedFilePath, 3600); // 1 hour expiry
        
      if (signedUrlError) {
        console.error('❌ Signed URL creation failed:', signedUrlError);
        return res.status(404).json({ error: 'File not found or access denied', details: signedUrlError.message });
      }
      
      if (signedUrlData?.signedUrl) {
        console.log('✅ Using signed URL for download');
        try {
          const response = await fetch(signedUrlData.signedUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const buffer = await response.arrayBuffer();
          const filename = decodedFilePath.split('/').pop() || 'downloaded_file';
          // Remove timestamp prefix to get original filename
          const originalName = filename.replace(/^\d+_/, '');
          
          res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.send(Buffer.from(buffer));
          return;
          
        } catch (fetchError) {
          console.error('❌ Signed URL download failed:', fetchError);
        }
      }
      
      return res.status(404).json({ error: 'File not found or access denied', details: downloadError.message });
    }
    
    // Get filename from path
    const filename = filePath.split('/').pop() || 'downloaded_file';
    // Remove timestamp prefix to get original filename
    const originalName = filename.replace(/^\d+_/, '');
    
    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Type', fileData.type || 'application/octet-stream');
    
    console.log('✅ File download successful:', originalName);
    
    // Stream the file data
    const buffer = Buffer.from(await fileData.arrayBuffer());
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Error in student download endpoint:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// ========== PHASE EVALUATION AUTO-SAVE ENDPOINT ==========
// Auto-save phase evaluation (draft) without marking as submitted
app.patch('/api/evaluations/submission/:evaluationId/save', authenticateStudent, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const { evaluation_data, status } = req.body;
    const evaluator_id = req.user.id;

    console.log('💾 [PHASE EVAL AUTO-SAVE] Starting auto-save for evaluation:', evaluationId);
    console.log('💾 [PHASE EVAL AUTO-SAVE] Evaluator ID:', evaluator_id);

    // Validate required fields
    if (!evaluation_data) {
      return res.status(400).json({ error: 'Missing evaluation data' });
    }

    const phase_id = evaluation_data.phase_id;
    const group_id = evaluation_data.group_id;
    const project_id = evaluation_data.project_id;

    if (!phase_id || !group_id) {
      return res.status(400).json({ error: 'Missing phase_id or group_id' });
    }

    console.log('✅ [PHASE EVAL AUTO-SAVE] Validation passed');

    // Check if evaluation already exists
    const { data: existing } = await supabase
      .from('phase_evaluation_submissions')
      .select('id, status')
      .eq('phase_id', phase_id)
      .eq('group_id', group_id)
      .eq('evaluator_id', evaluator_id)
      .single();

    let submission;

    if (existing) {
      // Prevent auto-save if already submitted
      if (existing.status === 'submitted') {
        console.log(`⚠️ [PHASE EVAL AUTO-SAVE] Evaluation already submitted, cannot auto-save`);
        return res.status(400).json({
          error: 'This evaluation has already been submitted',
          message: 'Cannot modify submitted evaluation'
        });
      }

      // Update existing draft
      const { data: updated, error: updateError } = await supabase
        .from('phase_evaluation_submissions')
        .update({
          evaluation_data: evaluation_data,
          is_custom_evaluation: false,
          status: status || 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('phase_id', phase_id)
        .eq('group_id', group_id)
        .eq('evaluator_id', evaluator_id)
        .select();

      if (updateError) {
        console.error(`❌ [PHASE EVAL AUTO-SAVE] Error updating submission:`, updateError);
        return res.status(500).json({
          message: 'Failed to auto-save evaluation',
          error: updateError.message
        });
      }
      submission = updated[0];
    } else {
      // Create new draft
      const { data: created, error: createError } = await supabase
        .from('phase_evaluation_submissions')
        .insert([
          {
            phase_id,
            group_id,
            project_id,
            evaluator_id,
            evaluation_data: evaluation_data,
            is_custom_evaluation: false,
            status: 'in_progress',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (createError) {
        console.error(`❌ [PHASE EVAL AUTO-SAVE] Error creating submission:`, createError);
        return res.status(500).json({
          message: 'Failed to auto-save evaluation',
          error: createError.message
        });
      }
      submission = created[0];
    }

    console.log(`✅ [PHASE EVAL AUTO-SAVE] Auto-save complete`);

    res.json({
      success: true,
      message: 'Evaluation auto-saved successfully',
      submission
    });

  } catch (error) {
    console.error('❌ [PHASE EVAL AUTO-SAVE] Error in auto-save:', error);
    res.status(500).json({ 
      error: 'Failed to auto-save evaluation',
      details: error.message 
    });
  }
});

// ========== PHASE EVALUATION SUBMISSION ENDPOINT ==========
// Submit phase evaluation for all group members
app.post('/api/evaluations/submission/:evaluationId/submit', authenticateStudent, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const { evaluation_data, status } = req.body;
    const evaluator_id = req.user.id;

    console.log('📝 [PHASE EVAL SUBMIT] Starting submission for evaluation:', evaluationId);
    console.log('📝 [PHASE EVAL SUBMIT] Evaluator ID:', evaluator_id);
    console.log('📝 [PHASE EVAL SUBMIT] Evaluation data:', evaluation_data);

    // Validate required fields
    if (!evaluation_data || !evaluation_data.evaluated_members) {
      return res.status(400).json({ error: 'Missing evaluation data' });
    }

    const evaluated_members = evaluation_data.evaluated_members;
    const phase_id = evaluation_data.phase_id;
    const group_id = evaluation_data.group_id;
    const project_id = evaluation_data.project_id;
    const phase_evaluation_form_id = evaluation_data.phase_evaluation_form_id;

    if (!phase_id || !group_id) {
      return res.status(400).json({ error: 'Missing phase_id or group_id' });
    }

    console.log('✅ [PHASE EVAL SUBMIT] Validation passed');
    console.log('📊 [PHASE EVAL SUBMIT] Members to evaluate:', Object.keys(evaluated_members).length);
    console.log('📊 [PHASE EVAL SUBMIT] Extracted IDs - phase_id:', phase_id, 'group_id:', group_id, 'evaluator_id:', evaluator_id);

    // Check if evaluation already exists for this evaluator
    const { data: existing } = await supabase
      .from('phase_evaluation_submissions')
      .select('id, status')
      .eq('phase_id', phase_id)
      .eq('group_id', group_id)
      .eq('evaluator_id', evaluator_id)
      .single();

    let submission;
    let successCount = 0;

    if (existing) {
      console.log(`ℹ️ [PHASE EVAL SUBMIT] Evaluation already exists for evaluator`);
      
      // Check if already submitted - prevent re-submission
      if (existing.status === 'submitted') {
        console.log(`⚠️ [PHASE EVAL SUBMIT] Evaluation already submitted, preventing re-submission`);
        return res.status(400).json({
          error: 'This evaluation has already been submitted and cannot be re-submitted',
          message: 'Evaluation already submitted'
        });
      }
      
      // Update existing submission
      const { data: updated, error: updateError } = await supabase
        .from('phase_evaluation_submissions')
        .update({
          evaluation_data: evaluation_data,
          is_custom_evaluation: false,
          status: 'submitted',
          submission_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('phase_id', phase_id)
        .eq('group_id', group_id)
        .eq('evaluator_id', evaluator_id)
        .select();

      if (updateError) {
        console.error(`❌ [PHASE EVAL SUBMIT] Error updating submission:`, updateError);
        return res.status(500).json({
          message: 'Failed to update evaluation submission',
          error: updateError.message
        });
      }
      submission = updated[0];
      successCount = 1;
      console.log(`✅ [PHASE EVAL SUBMIT] Updated existing submission:`, submission?.id);
    } else {
      // Create new submission
      const { data: created, error: createError } = await supabase
        .from('phase_evaluation_submissions')
        .insert([
          {
            phase_id,
            group_id,
            project_id,
            evaluator_id,
            phase_evaluation_form_id,
            evaluation_data: evaluation_data,
            is_custom_evaluation: false,
            status: 'submitted',
            submission_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (createError) {
        console.error(`❌ [PHASE EVAL SUBMIT] Error creating submission:`, createError);
        return res.status(500).json({
          message: 'Failed to create evaluation submission',
          error: createError.message
        });
      }
      submission = created[0];
      successCount = 1;
      console.log(`✅ [PHASE EVAL SUBMIT] Created new submission:`, submission?.id);
    }

    console.log(`📊 [PHASE EVAL SUBMIT] Submission complete - Success: ${successCount}`);
    console.log(`📊 [PHASE EVAL SUBMIT] Saved submission with status: ${submission?.status}`);

    res.json({
      success: true,
      message: 'Phase evaluation submitted successfully',
      submission,
      summary: {
        total: Object.keys(evaluated_members).length,
        submitted: successCount
      }
    });

  } catch (error) {
    console.error('❌ [PHASE EVAL SUBMIT] Error in phase evaluation submission:', error);
    res.status(500).json({ 
      error: 'Failed to submit phase evaluation',
      details: error.message 
    });
  }
});

// ========== CUSTOM PHASE EVALUATION SUBMISSION ENDPOINT ==========
// Submit custom phase evaluation with file upload
app.post('/api/evaluations/phase-custom/submit', authenticateStudent, async (req, res) => {
  try {
    const { phase_id, group_id, project_id, file_submission_url, file_name, is_custom_evaluation, status } = req.body;
    const evaluator_id = req.user.id;

    console.log('📝 [CUSTOM PHASE EVAL SUBMIT] Starting submission');
    console.log('📝 [CUSTOM PHASE EVAL SUBMIT] Evaluator ID:', evaluator_id);
    console.log('📝 [CUSTOM PHASE EVAL SUBMIT] Phase ID:', phase_id);
    console.log('📝 [CUSTOM PHASE EVAL SUBMIT] Group ID:', group_id);

    // Validate required fields
    if (!phase_id || !group_id || !file_submission_url) {
      return res.status(400).json({ error: 'Missing required fields (phase_id, group_id, or file)' });
    }

    // Get the phase evaluation form ID
    const { data: phaseForm, error: formError } = await supabase
      .from('phase_evaluation_forms')
      .select('id')
      .eq('phase_id', phase_id)
      .eq('is_custom_evaluation', true)
      .single();

    if (formError || !phaseForm) {
      console.error('❌ [CUSTOM PHASE EVAL SUBMIT] Error finding phase evaluation form:', formError);
      return res.status(404).json({ error: 'Phase evaluation form not found' });
    }

    console.log('✅ [CUSTOM PHASE EVAL SUBMIT] Found phase form ID:', phaseForm.id);

    // Upload file to Supabase Storage instead of storing base64 in database
    let fileUrl = null;
    if (file_submission_url.startsWith('data:')) {
      console.log('📤 [CUSTOM PHASE EVAL SUBMIT] Uploading file to Supabase Storage...');
      
      // Extract base64 data and content type
      const matches = file_submission_url.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid file format' });
      }
      
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `phase-evaluations/${phase_id}/${evaluator_id}_${timestamp}_${sanitizedFileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-files')
        .upload(storagePath, buffer, {
          contentType: contentType,
          upsert: false
        });

      if (uploadError) {
        console.error('❌ [CUSTOM PHASE EVAL SUBMIT] Failed to upload to storage:', uploadError);
        return res.status(500).json({ error: 'Failed to upload file to storage', details: uploadError.message });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('custom-files')
        .getPublicUrl(storagePath);

      fileUrl = urlData.publicUrl;
      console.log('✅ [CUSTOM PHASE EVAL SUBMIT] File uploaded successfully:', fileUrl);
    } else {
      // If it's already a URL (shouldn't happen, but just in case)
      fileUrl = file_submission_url;
    }

    // Check if evaluation already exists for this evaluator
    const { data: existing } = await supabase
      .from('phase_evaluation_submissions')
      .select('id, status')
      .eq('phase_id', phase_id)
      .eq('group_id', group_id)
      .eq('evaluator_id', evaluator_id)
      .single();

    let submission;

    if (existing) {
      console.log(`ℹ️ [CUSTOM PHASE EVAL SUBMIT] Evaluation already exists for evaluator`);
      
      // Check if already submitted - prevent re-submission
      if (existing.status === 'submitted') {
        console.log(`⚠️ [CUSTOM PHASE EVAL SUBMIT] Evaluation already submitted, preventing re-submission`);
        return res.status(400).json({
          error: 'This evaluation has already been submitted and cannot be re-submitted',
          message: 'Evaluation already submitted'
        });
      }
      
      // Update existing submission
      const { data: updated, error: updateError } = await supabase
        .from('phase_evaluation_submissions')
        .update({
          file_submission_url: fileUrl,
          file_name,
          is_custom_evaluation: true,
          status: 'submitted',
          submission_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('phase_id', phase_id)
        .eq('group_id', group_id)
        .eq('evaluator_id', evaluator_id)
        .select();

      if (updateError) {
        console.error(`❌ [CUSTOM PHASE EVAL SUBMIT] Error updating submission:`, updateError);
        return res.status(500).json({
          message: 'Failed to update evaluation submission',
          error: updateError.message
        });
      }
      submission = updated[0];
      console.log(`✅ [CUSTOM PHASE EVAL SUBMIT] Updated existing submission:`, submission?.id);
    } else {
      // Create new submission
      const { data: created, error: createError } = await supabase
        .from('phase_evaluation_submissions')
        .insert([
          {
            phase_id,
            group_id,
            project_id,
            evaluator_id,
            phase_evaluation_form_id: phaseForm.id,
            file_submission_url: fileUrl,
            file_name,
            is_custom_evaluation: true,
            status: 'submitted',
            submission_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (createError) {
        console.error(`❌ [CUSTOM PHASE EVAL SUBMIT] Error creating submission:`, createError);
        return res.status(500).json({
          message: 'Failed to create evaluation submission',
          error: createError.message
        });
      }
      submission = created[0];
      console.log(`✅ [CUSTOM PHASE EVAL SUBMIT] Created new submission:`, submission?.id);
    }

    console.log('✅ [CUSTOM PHASE EVAL SUBMIT] Successfully submitted custom phase evaluation');
    res.status(200).json({
      success: true,
      message: 'Custom phase evaluation submitted successfully',
      submission
    });

  } catch (error) {
    console.error('❌ [CUSTOM PHASE EVAL SUBMIT] Error in custom phase evaluation submission:', error);
    res.status(500).json({ 
      error: 'Failed to submit custom phase evaluation',
      details: error.message 
    });
  }
});

// ========== PROJECT EVALUATION SUBMISSION ENDPOINT ==========
// Submit project evaluation for all group members
app.post('/api/project-evaluations/:evaluationId/submit', authenticateStudent, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const { evaluation_data, status } = req.body;
    const evaluator_id = req.user.id;

    console.log('📝 [PROJECT EVAL SUBMIT] Starting submission for evaluation:', evaluationId);
    console.log('📝 [PROJECT EVAL SUBMIT] Evaluator ID:', evaluator_id);
    console.log('📝 [PROJECT EVAL SUBMIT] Evaluation data:', evaluation_data);

    // Validate required fields
    if (!evaluation_data || !evaluation_data.evaluated_members) {
      return res.status(400).json({ error: 'Missing evaluation data' });
    }

    const evaluated_members = evaluation_data.evaluated_members;
    const project_id = evaluation_data.project_id;
    const group_id = evaluation_data.group_id;
    const project_evaluation_form_id = evaluation_data.project_evaluation_form_id;

    if (!project_id || !group_id) {
      return res.status(400).json({ error: 'Missing project_id or group_id' });
    }

    console.log('✅ [PROJECT EVAL SUBMIT] Validation passed');
    console.log('📊 [PROJECT EVAL SUBMIT] Members to evaluate:', Object.keys(evaluated_members).length);
    console.log('📊 [PROJECT EVAL SUBMIT] Extracted IDs - project_id:', project_id, 'group_id:', group_id, 'evaluator_id:', evaluator_id);

    // Check if evaluation already exists for this evaluator
    const { data: existing } = await supabase
      .from('project_evaluation_submissions')
      .select('id, status')
      .eq('project_id', project_id)
      .eq('group_id', group_id)
      .eq('evaluator_id', evaluator_id)
      .eq('is_custom_evaluation', false)
      .single();

    let submission;
    let successCount = 0;

    if (existing) {
      console.log(`ℹ️ [PROJECT EVAL SUBMIT] Evaluation already exists for evaluator`);
      
      // Check if already submitted - prevent re-submission
      if (existing.status === 'submitted') {
        console.log(`⚠️ [PROJECT EVAL SUBMIT] Evaluation already submitted, preventing re-submission`);
        return res.status(400).json({
          error: 'This evaluation has already been submitted and cannot be re-submitted',
          message: 'Evaluation already submitted'
        });
      }
      
      // Update existing submission
      const { data: updated, error: updateError } = await supabase
        .from('project_evaluation_submissions')
        .update({
          evaluation_data: evaluation_data,
          is_custom_evaluation: false,
          status: 'submitted',
          submission_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('project_id', project_id)
        .eq('group_id', group_id)
        .eq('evaluator_id', evaluator_id)
        .eq('is_custom_evaluation', false)
        .select();

      if (updateError) {
        console.error(`❌ [PROJECT EVAL SUBMIT] Error updating submission:`, updateError);
        return res.status(500).json({
          message: 'Failed to update evaluation submission',
          error: updateError.message
        });
      }
      submission = updated[0];
      successCount = 1;
      console.log(`✅ [PROJECT EVAL SUBMIT] Updated existing submission:`, submission?.id);
    } else {
      // Create new submission
      const { data: created, error: createError} = await supabase
        .from('project_evaluation_submissions')
        .insert([
          {
            project_id,
            group_id,
            evaluator_id,
            project_evaluation_form_id,
            evaluation_data: evaluation_data,
            is_custom_evaluation: false,
            evaluated_member_id: null, // NULL for aggregated project evaluations
            status: 'submitted',
            submission_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (createError) {
        console.error(`❌ [PROJECT EVAL SUBMIT] Error creating submission:`, createError);
        return res.status(500).json({
          message: 'Failed to create evaluation submission',
          error: createError.message
        });
      }
      submission = created[0];
      successCount = 1;
      console.log(`✅ [PROJECT EVAL SUBMIT] Created new submission:`, submission?.id);
    }

    console.log(`📊 [PROJECT EVAL SUBMIT] Submission complete - Success: ${successCount}`);
    console.log(`📊 [PROJECT EVAL SUBMIT] Saved submission with status: ${submission?.status}`);

    res.json({
      success: true,
      message: 'Project evaluation submitted successfully',
      submission,
      summary: {
        total: Object.keys(evaluated_members).length,
        submitted: successCount
      }
    });

  } catch (error) {
    console.error('❌ [PROJECT EVAL SUBMIT] Error in project evaluation submission:', error);
    res.status(500).json({ 
      error: 'Failed to submit project evaluation',
      details: error.message 
    });
  }
});

// ========== PROJECT EVALUATION CUSTOM SUBMISSION ENDPOINT ==========
// Submit custom project evaluation (file upload)
app.post('/api/project-evaluations/:evaluationFormId/submit-custom', authenticateStudent, upload.single('file'), async (req, res) => {
  try {
    const { evaluationFormId } = req.params;
    const evaluator_id = req.user.id;
    const { project_id, group_id, project_evaluation_form_id } = req.body;
    const file = req.file;

    console.log('📝 [CUSTOM PROJECT EVAL] Starting custom submission');
    console.log('📝 [CUSTOM PROJECT EVAL] Form ID:', evaluationFormId);
    console.log('📝 [CUSTOM PROJECT EVAL] Evaluator ID:', evaluator_id);
    console.log('📝 [CUSTOM PROJECT EVAL] Project ID:', project_id);
    console.log('📝 [CUSTOM PROJECT EVAL] Group ID:', group_id);
    console.log('📝 [CUSTOM PROJECT EVAL] File:', file ? file.originalname : 'No file');

    // Validate required fields
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!project_id || !group_id) {
      return res.status(400).json({ error: 'Missing project_id or group_id' });
    }

    // Check if evaluation already exists for this evaluator
    const { data: existing } = await supabase
      .from('project_evaluation_submissions')
      .select('id, status')
      .eq('project_id', project_id)
      .eq('group_id', group_id)
      .eq('evaluator_id', evaluator_id)
      .eq('is_custom_evaluation', true)
      .single();

    // Check if already submitted - prevent re-submission
    if (existing && existing.status === 'submitted') {
      console.log('⚠️ [CUSTOM PROJECT EVAL] Evaluation already submitted');
      return res.status(400).json({
        error: 'This evaluation has already been submitted and cannot be re-submitted',
        message: 'Evaluation already submitted'
      });
    }

    // Upload file to Supabase Storage
    const timestamp = Date.now();
    const fileName = `project_${project_id}_eval_${evaluator_id}_${timestamp}.pdf`;
    
    console.log('📤 [CUSTOM PROJECT EVAL] Uploading file to storage:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('custom-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [CUSTOM PROJECT EVAL] File upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file', details: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('custom-files')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;
    console.log('✅ [CUSTOM PROJECT EVAL] File uploaded successfully:', fileUrl);

    // Create or update submission record
    let submission;

    if (existing) {
      // Update existing submission
      console.log('🔄 [CUSTOM PROJECT EVAL] Updating existing submission');
      const { data: updated, error: updateError } = await supabase
        .from('project_evaluation_submissions')
        .update({
          file_submission_url: fileUrl,
          file_name: file.originalname,
          status: 'submitted',
          submission_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();

      if (updateError) {
        console.error('❌ [CUSTOM PROJECT EVAL] Error updating submission:', updateError);
        return res.status(500).json({
          message: 'Failed to update evaluation submission',
          error: updateError.message
        });
      }
      submission = updated[0];
      console.log('✅ [CUSTOM PROJECT EVAL] Updated existing submission:', submission.id);
    } else {
      // Create new submission
      console.log('➕ [CUSTOM PROJECT EVAL] Creating new submission');
      const { data: created, error: createError } = await supabase
        .from('project_evaluation_submissions')
        .insert([
          {
            project_id,
            group_id,
            evaluator_id,
            project_evaluation_form_id: project_evaluation_form_id || evaluationFormId,
            is_custom_evaluation: true,
            file_submission_url: fileUrl,
            file_name: file.originalname,
            status: 'submitted',
            submission_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (createError) {
        console.error('❌ [CUSTOM PROJECT EVAL] Error creating submission:', createError);
        return res.status(500).json({
          message: 'Failed to create evaluation submission',
          error: createError.message
        });
      }
      submission = created[0];
      console.log('✅ [CUSTOM PROJECT EVAL] Created new submission:', submission.id);
    }

    console.log('📊 [CUSTOM PROJECT EVAL] Submission complete');

    res.json({
      success: true,
      message: 'Custom project evaluation submitted successfully',
      submission
    });

  } catch (error) {
    console.error('❌ [CUSTOM PROJECT EVAL] Error in custom project evaluation submission:', error);
    res.status(500).json({ 
      error: 'Failed to submit custom project evaluation',
      details: error.message 
    });
  }
});

// ============================================================================
// PHASE DELIVERABLE SUBMISSION
// ============================================================================

app.post('/api/student/phase-deliverable/submit', authenticateStudent, upload.array('files', 20), async (req, res) => {
  try {
    const student_id = req.user.id;
    const {
      projectId,
      phaseId,
      groupId,
      submissionText,
      memberInclusions,
      validationResults,
      isResubmission,
      originalSubmissionId,
      resubmissionNumber
    } = req.body;

    console.log('📦 === PHASE DELIVERABLE SUBMISSION START ===');
    console.log('👤 Submitted by (student_id):', student_id);
    console.log('📋 Project ID:', projectId);
    console.log('🔵 Phase ID:', phaseId);
    console.log('👥 Group ID:', groupId);
    console.log('📁 Files uploaded:', req.files?.length || 0);
    console.log('🔄 Is Resubmission:', isResubmission);
    console.log('🔢 Resubmission Number:', resubmissionNumber);

    // Validate required fields
    if (!projectId || !phaseId || !groupId) {
      return res.status(400).json({ error: 'Project ID, Phase ID, and Group ID are required' });
    }

    // Verify student is the leader of this group
    const { data: membership, error: memberError } = await supabase
      .from('course_group_members')
      .select('id, role, student_id')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    console.log('🔍 Membership check:', {
      groupId,
      student_id,
      membership,
      memberError,
      role: membership?.role
    });

    if (memberError || !membership) {
      console.error('❌ Not found in group or error:', memberError);
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    if (membership.role !== 'leader') {
      console.error('❌ Not authorized - role is:', membership.role);
      return res.status(403).json({ 
        error: 'Only group leaders can submit phase deliverables',
        details: `Your role is: ${membership.role}. Leader role required.`
      });
    }

    console.log('✅ Verified as group leader');

    // ============================================================================
    // 1. FETCH PHASE SNAPSHOT
    // ============================================================================
    const { data: phaseData, error: phaseError } = await supabase
      .from('project_phases')
      .select(`
        *
      `)
      .eq('id', phaseId)
      .single();

    console.log('🔍 Phase query result:', { phaseData, phaseError });

    if (phaseError || !phaseData) {
      console.error('❌ Phase not found:', phaseError);
      return res.status(404).json({ error: 'Phase not found', details: phaseError?.message });
    }

    console.log('✅ Phase snapshot captured:', phaseData);

    // ============================================================================
    // 1.5. CHECK MAX ATTEMPTS LIMIT
    // ============================================================================
    const maxAttempts = phaseData.max_attempts || 1;
    
    // Count existing submissions for this phase and group
    const { data: existingSubmissions, error: submissionsCountError } = await supabase
      .from('phase_deliverable_submissions')
      .select('id, resubmission_number')
      .eq('phase_id', phaseId)
      .eq('group_id', groupId);

    if (submissionsCountError) {
      console.error('❌ Error checking existing submissions:', submissionsCountError);
      return res.status(500).json({ error: 'Failed to check submission attempts' });
    }

    // ✅ FIX: Count distinct attempts based on highest resubmission_number
    // resubmission_number starts at 0, so actual attempts = max(resubmission_number) + 1
    let currentAttempts = 0;
    if (existingSubmissions && existingSubmissions.length > 0) {
      const maxResubmissionNumber = Math.max(...existingSubmissions.map(s => s.resubmission_number || 0));
      currentAttempts = maxResubmissionNumber + 1;
      console.log(`📊 Submission analysis: ${existingSubmissions.length} total records, highest resubmission_number: ${maxResubmissionNumber}`);
    }
    
    console.log('🔢 Attempts check:', {
      maxAttempts,
      currentAttempts,
      canSubmit: currentAttempts < maxAttempts,
      totalSubmissionRecords: existingSubmissions?.length || 0
    });

    if (currentAttempts >= maxAttempts) {
      console.error('❌ Maximum attempts reached');
      return res.status(400).json({ 
        error: 'Maximum submission attempts reached',
        details: `This phase allows ${maxAttempts} attempt(s). You have already submitted ${currentAttempts} time(s).`,
        maxAttempts,
        currentAttempts
      });
    }

    console.log('✅ Attempt limit check passed');

    // ============================================================================
    // 2. FETCH ALL GROUP MEMBERS
    // ============================================================================
    const { data: members, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        student_id,
        role,
        studentaccounts(
          id,
          first_name,
          last_name,
          student_number
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return res.status(500).json({ error: 'Failed to fetch group members' });
    }

    console.log('✅ Found', members?.length || 0, 'group members');

    // ============================================================================
    // 3. FETCH ALL MEMBER TASKS WITH SUBMISSION HISTORY
    // ============================================================================
    const memberTasksSnapshot = [];

    for (const member of members) {
      const memberId = member.student_id;
      const memberName = member.studentaccounts 
        ? `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`.trim()
        : 'Unknown';

      // Fetch tasks for this member in this phase
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_id', phaseId)
        .eq('assigned_to', memberId);

      if (tasksError) {
        console.error(`❌ Error fetching tasks for member ${memberId}:`, tasksError);
        continue;
      }

      // For each task, fetch submission history
      const tasksWithSubmissions = [];
      for (const task of tasks || []) {
        console.log(`🔍 Fetching submissions for task ${task.id} (${task.title})`);
        
        // Fetch original submissions
        const { data: originalSubmissions, error: origError } = await supabase
          .from('task_submissions')
          .select('*')
          .eq('task_id', task.id)
          .order('submission_date', { ascending: true });

        console.log(`  📊 Original submissions found: ${originalSubmissions?.length || 0}`, originalSubmissions);
        if (origError) console.error('  ❌ Original submissions error:', origError);

        // Fetch revision submissions
        const { data: revisionSubmissions, error: revError } = await supabase
          .from('revision_submissions')
          .select('*')
          .eq('task_id', task.id)
          .order('submitted_at', { ascending: true });

        console.log(`  📊 Revision submissions found: ${revisionSubmissions?.length || 0}`, revisionSubmissions);
        if (revError) console.error('  ❌ Revision submissions error:', revError);

        const submissionFiles = [];

        // Add original submissions
        if (originalSubmissions && !origError) {
          originalSubmissions.forEach(sub => {
            // Parse file_urls (stored as TEXT, could be JSON string or PostgreSQL array syntax)
            let files = [];
            if (sub.file_urls) {
              try {
                // Try parsing as JSON first
                files = JSON.parse(sub.file_urls);
                console.log(`    ✅ Parsed file_urls as JSON:`, files);
              } catch (e) {
                console.log(`    ⚠️ JSON parse failed, trying PostgreSQL array syntax`);
                // If JSON parse fails, might be PostgreSQL array syntax like {file1,file2}
                const match = sub.file_urls.match(/^\{(.*)\}$/);
                if (match) {
                  files = match[1].split(',').filter(f => f.trim());
                } else {
                  files = [sub.file_urls];
                }
              }
            }

            const submissionEntry = {
              submission_id: sub.id,
              attempt_number: sub.attempt_number || 1,
              files: files,
              submission_text: sub.submission_text,
              submitted_at: sub.submission_date || sub.submitted_at,
              status: sub.status,
              feedback: sub.review_comments,
              reviewed_by: sub.reviewed_by,
              reviewed_at: sub.reviewed_at,
              is_revision: false
            };
            
            console.log(`    📋 Adding submission entry:`, submissionEntry);
            submissionFiles.push(submissionEntry);
          });
        }
        
        console.log(`  📊 Total submission files for this task: ${submissionFiles.length}`);

        // Add revision submissions
        if (revisionSubmissions && !revError) {
          revisionSubmissions.forEach(sub => {
            // Parse file_paths (same logic as file_urls)
            let files = [];
            if (sub.file_paths) {
              // Check if it's already an array
              if (Array.isArray(sub.file_paths)) {
                files = sub.file_paths;
                console.log(`    ✅ file_paths is already an array:`, files);
              } else if (typeof sub.file_paths === 'string') {
                try {
                  files = JSON.parse(sub.file_paths);
                  console.log(`    ✅ Parsed revision file_paths as JSON:`, files);
                } catch (e) {
                  console.log(`    ⚠️ Revision JSON parse failed, trying PostgreSQL array syntax`);
                  const match = sub.file_paths.match(/^\{(.*)\}$/);
                  if (match) {
                    files = match[1].split(',').filter(f => f.trim());
                  } else {
                    files = [sub.file_paths];
                  }
                }
              }
            }
            
            const revisionEntry = {
              submission_id: sub.id,
              attempt_number: sub.revision_attempt_number,
              files: files,
              submission_text: sub.submission_text,
              submitted_at: sub.submitted_at,
              status: sub.status,
              feedback: sub.review_comments,
              reviewed_by: sub.reviewed_by,
              reviewed_at: sub.reviewed_at,
              is_revision: true
            };
            
            console.log(`    📋 Adding revision entry:`, revisionEntry);
            submissionFiles.push(revisionEntry);
          });
        }

        const taskEntry = {
          task_id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          due_date: task.due_date,
          available_until: task.available_until,
          max_attempts: task.max_attempts,
          current_attempts: task.current_attempts,
          assigned_by: task.assigned_by,
          assigned_at: task.created_at,
          completed_at: task.completed_at,
          file_types_allowed: task.file_types_allowed,
          submission_files: submissionFiles
        };
        
        console.log(`  ✅ Final task entry for "${task.title}":`, JSON.stringify(taskEntry, null, 2));
        tasksWithSubmissions.push(taskEntry);
      }
      
      console.log(`📊 Total tasks with submissions for this member: ${tasksWithSubmissions.length}`);

      memberTasksSnapshot.push({
        member_id: memberId,
        member_name: memberName,
        role: member.role,
        tasks: tasksWithSubmissions,
        task_count: tasksWithSubmissions.length,
        min_required: phaseData.min_tasks_per_member || 1,
        max_allowed: phaseData.max_tasks_per_member || 10
      });
    }

    console.log('✅ Member tasks snapshot captured for', memberTasksSnapshot.length, 'members');

    // ============================================================================
    // 4. FETCH ALL EVALUATION SUBMISSIONS
    // ============================================================================
    const { data: evaluationSubmissions, error: evalError } = await supabase
      .from('phase_evaluation_submissions')
      .select(`
        *,
        evaluator:studentaccounts!phase_evaluation_submissions_evaluator_id_fkey(
          id,
          first_name,
          last_name
        ),
        form:phase_evaluation_forms(
          id,
          instructions,
          total_points,
          custom_file_url,
          custom_file_name,
          is_custom_evaluation
        )
      `)
      .eq('phase_id', phaseId)
      .eq('group_id', groupId);

    if (evalError) {
      console.error('❌ Error fetching evaluations:', evalError);
      return res.status(500).json({ error: 'Failed to fetch evaluation submissions' });
    }

    console.log('✅ Found', evaluationSubmissions?.length || 0, 'evaluation submissions');

    // Organize evaluations by member who RECEIVED them
    const evaluationSubmissionsSnapshot = [];

    for (const member of members) {
      const memberId = member.student_id;
      const memberName = member.studentaccounts 
        ? `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`.trim()
        : 'Unknown';

      const evaluationsReceived = [];

      console.log(`🔍 Processing evaluations for member ${memberId} (${memberName})`);
      console.log(`  📊 Total evaluation submissions to check: ${evaluationSubmissions?.length || 0}`);

      // For built-in evaluations, extract this member from evaluated_members
      for (const evalSub of (evaluationSubmissions || [])) {
        const isCustom = evalSub.is_custom_evaluation;
        
        console.log(`  📝 Checking eval submission ${evalSub.id}:`, {
          evaluator_id: evalSub.evaluator_id,
          is_custom: isCustom,
          status: evalSub.status,
          has_evaluation_data: !!evalSub.evaluation_data
        });

        if (isCustom) {
          // Custom file evaluation - doesn't have individual member scores
          // Only include if there's a file submission
          if (evalSub.file_submission_url) {
            evaluationsReceived.push({
              evaluation_submission_id: evalSub.id,
              evaluator_id: evalSub.evaluator_id,
              evaluator_name: evalSub.evaluator 
                ? `${evalSub.evaluator.first_name} ${evalSub.evaluator.last_name}`.trim()
                : 'Unknown',
              evaluator_role: 'member', // We'd need to check this
              submission_date: evalSub.submission_date,
              status: evalSub.status,
              is_custom_evaluation: true,
              evaluation_form: {
                form_id: evalSub.form?.id,
                instructions: evalSub.form?.instructions,
                total_points: evalSub.form?.total_points,
                custom_file_url: evalSub.form?.custom_file_url,
                custom_file_name: evalSub.form?.custom_file_name
              },
              file_submission_url: evalSub.file_submission_url,
              file_name: evalSub.file_name,
              comments: evalSub.comments
            });
          }
        } else {
          // Built-in evaluation - check if this member was evaluated
          const evaluationData = evalSub.evaluation_data;
          console.log(`  🔍 Built-in eval - checking if member ${memberId} was evaluated:`, {
            has_evaluation_data: !!evaluationData,
            has_evaluated_members: !!(evaluationData?.evaluated_members),
            evaluated_members_keys: evaluationData?.evaluated_members ? Object.keys(evaluationData.evaluated_members) : [],
            is_member_in_list: !!(evaluationData?.evaluated_members?.[memberId])
          });
          
          if (evaluationData && evaluationData.evaluated_members && evaluationData.evaluated_members[memberId]) {
            console.log(`  ✅ Member ${memberId} WAS evaluated in this submission!`);
            const memberEval = evaluationData.evaluated_members[memberId];
            
            // Fetch criteria details
            const { data: criteria, error: criteriaError } = await supabase
              .from('phase_evaluation_criteria')
              .select('*')
              .eq('phase_evaluation_form_id', evalSub.phase_evaluation_form_id)
              .order('order_index');

            const criteriaWithScores = (criteria || []).map(crit => ({
              id: crit.id,
              name: crit.name,
              description: crit.description,
              max_points: crit.max_points,
              score_received: memberEval.criteria?.[crit.id] || 0
            }));

            evaluationsReceived.push({
              evaluation_submission_id: evalSub.id,
              evaluator_id: evalSub.evaluator_id,
              evaluator_name: evalSub.evaluator 
                ? `${evalSub.evaluator.first_name} ${evalSub.evaluator.last_name}`.trim()
                : 'Unknown',
              evaluator_role: 'member',
              submission_date: evalSub.submission_date,
              status: evalSub.status,
              is_custom_evaluation: false,
              evaluation_form: {
                form_id: evalSub.form?.id,
                instructions: evalSub.form?.instructions,
                total_points: evalSub.form?.total_points,
                criteria: criteriaWithScores
              },
              total_score: memberEval.total || 0,
              percentage: evalSub.form?.total_points > 0 
                ? ((memberEval.total || 0) / evalSub.form.total_points * 100).toFixed(1)
                : 0,
              comments: evalSub.comments
            });
          }
        }
      }

      // Check if this member submitted their own evaluations
      const memberSubmissions = (evaluationSubmissions || []).filter(
        evalSub => evalSub.evaluator_id === memberId
      );
      const hasSubmitted = memberSubmissions.length > 0 && memberSubmissions.some(s => s.status === 'submitted');

      console.log(`  📊 Final result for ${memberName}: ${evaluationsReceived.length} evaluations received`);

      evaluationSubmissionsSnapshot.push({
        member_id: memberId,
        member_name: memberName,
        role: member.role,
        evaluations_received: evaluationsReceived,
        evaluation_count: evaluationsReceived.length,
        average_score: evaluationsReceived.length > 0 && !evaluationsReceived[0].is_custom_evaluation
          ? (evaluationsReceived.reduce((sum, e) => sum + (e.total_score || 0), 0) / evaluationsReceived.length).toFixed(1)
          : null,
        total_possible_score: phaseData.evaluation_form_type === 'builtin' ? 100 : null,
        has_submitted_own_evaluations: hasSubmitted,
        own_evaluation_submission_date: hasSubmitted ? memberSubmissions[0].submission_date : null,
        members_evaluated_count: hasSubmitted ? memberSubmissions.length : 0
      });
    }

    console.log('✅ Evaluation submissions snapshot captured');

    // ============================================================================
    // 5. PROCESS UPLOADED FILES
    // ============================================================================
    const uploadedFiles = [];
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = `phase-deliverables/${phaseId}/${groupId}/${Date.now()}_${file.originalname}`;
        
        // Upload without specifying contentType to avoid mime type restrictions
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-files')
          .upload(filePath, file.buffer, {
            upsert: false
          });

        if (uploadError) {
          console.error('❌ File upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('custom-files')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          path: filePath,
          url: publicUrl,
          name: file.originalname,
          size: file.size,
          type: file.mimetype
        });
      }

      console.log('✅ Uploaded', uploadedFiles.length, 'files');
    }

    // ============================================================================
    // 6. PARSE MEMBER INCLUSIONS AND VALIDATION RESULTS
    // ============================================================================
    const memberInclusionsData = typeof memberInclusions === 'string' 
      ? JSON.parse(memberInclusions) 
      : memberInclusions;

    const validationResultsData = typeof validationResults === 'string' 
      ? JSON.parse(validationResults) 
      : validationResults;

    // ============================================================================
    // 7. INSERT PHASE DELIVERABLE SUBMISSION
    // ============================================================================
    
    // Calculate Philippine time (UTC + 8 hours)
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const formattedTime = philippineTime.toISOString().slice(0, 23).replace('T', ' ').replace('Z', '');
    
    console.log('📅 Submission timestamp (Philippine):', formattedTime);
    
    // ✅ NEW: Handle resubmission data
    const isResubmissionBool = isResubmission === 'true' || isResubmission === true;
    const resubmissionNum = parseInt(resubmissionNumber) || 0;
    
    const { data: submission, error: submissionError } = await supabase
      .from('phase_deliverable_submissions')
      .insert({
        project_id: projectId,
        phase_id: phaseId,
        group_id: groupId,
        submitted_by: student_id,
        submitted_at: formattedTime,
        files: uploadedFiles,
        submission_text: submissionText || null,
        phase_snapshot: phaseData,
        member_tasks: memberTasksSnapshot,
        evaluation_submissions: evaluationSubmissionsSnapshot,
        member_inclusions: memberInclusionsData,
        validation_results: validationResultsData,
        status: 'submitted',
        is_resubmission: isResubmissionBool,
        original_submission_id: isResubmissionBool ? originalSubmissionId : null,
        resubmission_number: resubmissionNum
      })
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Submission insert error:', submissionError);
      return res.status(500).json({ 
        error: 'Failed to create phase deliverable submission',
        details: submissionError.message 
      });
    }

    console.log('✅ Phase deliverable submission created:', submission.id);
    console.log('📦 === PHASE DELIVERABLE SUBMISSION COMPLETE ===');

    res.json({
      success: true,
      message: 'Phase deliverable submitted successfully',
      submission_id: submission.id,
      submitted_at: submission.submitted_at
    });

  } catch (error) {
    console.error('💥 Phase deliverable submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit phase deliverable',
      details: error.message 
    });
  }
});

// ============================================================================
// GET Phase Deliverable Submissions
// ============================================================================
app.get('/api/student/phases/:phaseId/deliverable-submissions', authenticateStudent, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const { group_id } = req.query;
    const student_id = req.user.id;

    console.log('📋 === FETCH PHASE DELIVERABLE SUBMISSIONS ===');
    console.log('📋 Phase ID:', phaseId);
    console.log('📋 Group ID:', group_id);
    console.log('📋 Student ID:', student_id);

    // Verify student has access to this phase
    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .select('project_id')
      .eq('id', phaseId)
      .single();

    if (phaseError || !phase) {
      console.error('❌ Phase not found:', phaseError);
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Fetch submissions for this phase and group
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_deliverable_submissions')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('group_id', group_id)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch submissions',
        details: submissionsError.message 
      });
    }

    console.log(`✅ Found ${submissions?.length || 0} submissions`);

    res.json({
      success: true,
      phase_id: phaseId,
      group_id: group_id,
      submissions: submissions || [],
      count: submissions?.length || 0
    });

  } catch (error) {
    console.error('💥 Error fetching phase deliverable submissions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch phase deliverable submissions',
      details: error.message 
    });
  }
});

// ============================================================================
// PROJECT DELIVERABLE SUBMISSION
// ============================================================================

app.post('/api/student/project-deliverable/submit', authenticateStudent, upload.array('files', 20), async (req, res) => {
  try {
    const student_id = req.user.id;
    const {
      projectId,
      groupId,
      submissionText,
      memberInclusions,
      validationResults
    } = req.body;

    console.log('📦 === PROJECT DELIVERABLE SUBMISSION START ===');
    console.log('👤 Submitted by (student_id):', student_id);
    console.log('📋 Project ID:', projectId);
    console.log('👥 Group ID:', groupId);
    console.log('📁 Files uploaded:', req.files?.length || 0);

    // Validate required fields
    if (!projectId || !groupId) {
      return res.status(400).json({ error: 'Project ID and Group ID are required' });
    }

    // Verify student is the leader of this group
    const { data: membership, error: memberError } = await supabase
      .from('course_group_members')
      .select('id, role, student_id')
      .eq('group_id', groupId)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    console.log('🔍 Membership check:', {
      groupId,
      student_id,
      membership,
      memberError,
      role: membership?.role
    });

    if (memberError || !membership) {
      console.error('❌ Not found in group or error:', memberError);
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    if (membership.role !== 'leader') {
      console.error('❌ Not a leader:', membership.role);
      return res.status(403).json({ error: 'Only group leaders can submit project deliverables' });
    }

    console.log('✅ Leadership verified for student:', student_id);

    // Parse memberInclusions from JSON string
    let memberInclusionsData = [];
    try {
      memberInclusionsData = typeof memberInclusions === 'string' 
        ? JSON.parse(memberInclusions) 
        : (memberInclusions || []);
    } catch (err) {
      console.error('❌ Error parsing memberInclusions:', err);
      memberInclusionsData = [];
    }

    // Parse validationResults from JSON string
    let validationResultsData = {};
    try {
      validationResultsData = typeof validationResults === 'string' 
        ? JSON.parse(validationResults) 
        : (validationResults || {});
    } catch (err) {
      console.error('❌ Error parsing validationResults:', err);
      validationResultsData = {};
    }

    // ======================================================================
    // FETCH PROJECT DATA (SNAPSHOT)
    // ======================================================================
    console.log('📊 Fetching project data for snapshot...');
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        phases:project_phases(*)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('✅ Project data fetched:', projectData.title);

    // ======================================================================
    // FETCH GROUP MEMBERS
    // ======================================================================
    console.log('👥 Fetching group members...');
    const { data: groupMembers, error: membersError } = await supabase
      .from('course_group_members')
      .select(`
        id,
        student_id,
        role,
        position,
        studentaccounts(
          id,
          first_name,
          middle_name,
          last_name,
          student_number,
          email
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return res.status(500).json({ error: 'Failed to fetch group members' });
    }

    console.log(`✅ Found ${groupMembers.length} group members`);

    // ======================================================================
    // FETCH ALL MEMBER TASKS (ACROSS ALL PHASES)
    // ======================================================================
    console.log('📝 Fetching member tasks...');
    const memberTasksMap = {};

    for (const member of groupMembers) {
      const memberId = member.student_id;
      const memberInfo = member.studentaccounts;
      const memberName = memberInfo
        ? `${memberInfo.first_name} ${memberInfo.last_name}`.trim()
        : 'Unknown';

      // Fetch tasks for this member across all phases
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          assigned_by,
          assigned_to,
          phase_id,
          due_date,
          available_until,
          max_attempts,
          current_attempts,
          file_types_allowed,
          created_at,
          project_phases(id, phase_number, title)
        `)
        .eq('project_id', projectId)
        .eq('assigned_to', memberId)
        .eq('is_active', true)
        .order('phase_id', { ascending: true });

      if (tasksError) {
        console.error(`❌ Error fetching tasks for member ${memberId}:`, tasksError);
        continue;
      }

      // Group tasks by phase
      const phaseTasksMap = {};
      for (const task of (tasks || [])) {
        const phaseId = task.phase_id;
        if (!phaseTasksMap[phaseId]) {
          phaseTasksMap[phaseId] = {
            phase_id: phaseId,
            phase_number: task.project_phases?.phase_number,
            phase_title: task.project_phases?.title,
            task_count: 0,
            tasks: []
          };
        }

        // Fetch task submissions for this task (ALL statuses)
        const { data: taskSubmissions } = await supabase
          .from('task_submissions')
          .select('*')
          .eq('task_id', task.id)
          .order('submission_date', { ascending: true });

        // Fetch revision submissions for this task (ALL statuses)
        const { data: revisionSubmissions } = await supabase
          .from('revision_submissions')
          .select('*')
          .eq('task_id', task.id)
          .order('submitted_at', { ascending: true });

        // Build submission files array with proper parsing
        const submissionFiles = [];

        // Add original submissions
        if (taskSubmissions) {
          taskSubmissions.forEach(sub => {
            // Parse file_urls properly
            let files = [];
            if (sub.file_urls) {
              try {
                files = JSON.parse(sub.file_urls);
              } catch (e) {
                // Handle PostgreSQL array syntax {file1,file2}
                const match = sub.file_urls.match(/^\{(.*)\}$/);
                if (match) {
                  files = match[1].split(',').filter(f => f.trim());
                } else {
                  files = [sub.file_urls];
                }
              }
            }

            submissionFiles.push({
              submission_id: sub.id,
              attempt_number: sub.attempt_number,
              files: files,
              submission_text: sub.submission_text,
              submitted_at: sub.submission_date,
              status: sub.status,
              feedback: sub.review_comments,
              reviewed_by: sub.reviewed_by,
              reviewed_at: sub.reviewed_at,
              is_revision: false
            });
          });
        }

        // Add revision submissions
        if (revisionSubmissions) {
          revisionSubmissions.forEach(sub => {
            // Parse file_paths properly
            let files = [];
            if (sub.file_paths) {
              // Check if it's already an array
              if (Array.isArray(sub.file_paths)) {
                files = sub.file_paths;
                console.log(`    ✅ file_paths is already an array:`, files);
              } else if (typeof sub.file_paths === 'string') {
                try {
                  files = JSON.parse(sub.file_paths);
                } catch (e) {
                  // Handle PostgreSQL array syntax {file1,file2}
                  const match = sub.file_paths.match(/^\{(.*)\}$/);
                  if (match) {
                    files = match[1].split(',').filter(f => f.trim());
                  } else {
                    files = [sub.file_paths];
                  }
                }
              }
            }

            submissionFiles.push({
              submission_id: sub.id,
              attempt_number: sub.revision_attempt_number,
              files: files,
              submission_text: sub.submission_text,
              submitted_at: sub.submitted_at,
              status: sub.status,
              feedback: sub.review_comments,
              reviewed_by: sub.reviewed_by,
              reviewed_at: sub.reviewed_at,
              is_revision: true
            });
          });
        }

        phaseTasksMap[phaseId].task_count++;
        phaseTasksMap[phaseId].tasks.push({
          task_id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          assigned_at: task.created_at,
          assigned_by: task.assigned_by,
          due_date: task.due_date,
          available_until: task.available_until,
          max_attempts: task.max_attempts,
          current_attempts: task.current_attempts,
          file_types_allowed: task.file_types_allowed,
          submission_files: submissionFiles
        });
      }

      const phasesArray = Object.values(phaseTasksMap);
      const totalTasks = phasesArray.reduce((sum, p) => sum + p.task_count, 0);

      memberTasksMap[memberId] = {
        member_id: memberId,
        member_name: memberName,
        role: member.role,
        total_tasks: totalTasks,
        min_required: projectData.min_tasks_per_member || 1,
        max_allowed: projectData.max_tasks_per_member || 10,
        phases: phasesArray
      };
    }

    const memberTasksSnapshot = Object.values(memberTasksMap);
    console.log(`✅ Collected tasks for ${memberTasksSnapshot.length} members`);

    // ======================================================================
    // FETCH EVALUATION SUBMISSIONS (PHASE + PROJECT)
    // ======================================================================
    console.log('📊 Fetching evaluation submissions...');
    const evaluationSubmissionsMap = {};

    for (const member of groupMembers) {
      const memberId = member.student_id;
      const memberInfo = member.studentaccounts;
      const memberName = memberInfo
        ? `${memberInfo.first_name} ${memberInfo.last_name}`.trim()
        : 'Unknown';

      // Fetch phase evaluations
      const { data: phaseEvals } = await supabase
        .from('phase_evaluation_submissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', groupId)
        .eq('evaluator_id', memberId);

      // Fetch project evaluations
      const { data: projectEvals } = await supabase
        .from('project_evaluation_submissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', groupId)
        .eq('evaluator_id', memberId);

      // Group phase evaluations by phase
      const phaseEvaluationsMap = {};
      for (const evaluation of (phaseEvals || [])) {
        const phaseId = evaluation.phase_id;
        if (!phaseEvaluationsMap[phaseId]) {
          phaseEvaluationsMap[phaseId] = {
            phase_id: phaseId,
            has_submitted: false,
            evaluations_received: []
          };
        }
        phaseEvaluationsMap[phaseId].has_submitted = (evaluation.status === 'submitted' || evaluation.status === 'completed');
        phaseEvaluationsMap[phaseId].submission_date = evaluation.submission_date;
      }

      evaluationSubmissionsMap[memberId] = {
        member_id: memberId,
        member_name: memberName,
        role: member.role,
        phase_evaluations: {
          total_phases: projectData.phases?.length || 0,
          submitted_count: Object.values(phaseEvaluationsMap).filter(p => p.has_submitted).length,
          phases: Object.values(phaseEvaluationsMap)
        },
        project_evaluation: {
          has_submitted: (projectEvals && projectEvals.length > 0),
          submission_date: projectEvals?.[0]?.submission_date || null
        }
      };
    }

    const evaluationSubmissionsSnapshot = Object.values(evaluationSubmissionsMap);
    console.log(`✅ Collected evaluations for ${evaluationSubmissionsSnapshot.length} members`);

    // ======================================================================
    // FETCH PHASE DELIVERABLE SUBMISSIONS
    // ======================================================================
    console.log('📦 Fetching phase deliverable submissions...');
    const { data: phaseDeliverables, error: phaseDeliverablesError } = await supabase
      .from('phase_deliverable_submissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (phaseDeliverablesError) {
      console.error('❌ Error fetching phase deliverables:', phaseDeliverablesError);
    }

    const phaseDeliverablesSnapshot = (phaseDeliverables || []).map(pd => ({
      phase_id: pd.phase_id,
      submission_id: pd.id,
      submitted_at: pd.submitted_at,
      submitted_by: pd.submitted_by,
      files: pd.files,
      submission_text: pd.submission_text,
      phase_snapshot: pd.phase_snapshot,
      member_tasks: pd.member_tasks,
      evaluation_submissions: pd.evaluation_submissions,
      member_inclusions: pd.member_inclusions,
      validation_results: pd.validation_results,
      status: pd.status,
      is_resubmission: pd.is_resubmission,
      resubmission_number: pd.resubmission_number,
      grade: pd.grade,
      graded_by: pd.graded_by,
      graded_at: pd.graded_at,
      instructor_feedback: pd.instructor_feedback
    }));

    console.log(`✅ Found ${phaseDeliverablesSnapshot.length} phase deliverable submissions`);

    // ======================================================================
    // UPLOAD FILES TO STORAGE
    // ======================================================================
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      console.log(`📤 Uploading ${req.files.length} files...`);
      
      for (const file of req.files) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `project-deliverable/${projectId}/${groupId}/${fileName}`;

        // Upload without specifying contentType to avoid mime type restrictions
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-files')
          .upload(filePath, file.buffer, {
            upsert: false
          });

        if (uploadError) {
          console.error('❌ File upload error:', uploadError);
          return res.status(500).json({ 
            error: 'File upload failed',
            details: uploadError.message 
          });
        }

        const { data: { publicUrl } } = supabase.storage
          .from('custom-files')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.originalname,
          url: publicUrl,
          path: filePath,
          size: file.size,
          type: file.mimetype
        });

        console.log(`✅ Uploaded: ${file.originalname}`);
      }
    }

    // ======================================================================
    // CREATE PROJECT DELIVERABLE SUBMISSION
    // ======================================================================
    console.log('💾 Creating project deliverable submission...');

    // Get Philippine time (UTC+8)
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const formattedTime = philippineTime.toISOString().replace('Z', '');
    
    console.log('📅 Submission timestamp (Philippine):', formattedTime);

    const { data: submission, error: submissionError } = await supabase
      .from('project_deliverable_submissions')
      .insert({
        project_id: projectId,
        group_id: groupId,
        submitted_by: student_id,
        submitted_at: formattedTime,
        files: uploadedFiles,
        submission_text: submissionText || null,
        project_snapshot: {
          id: projectData.id,
          title: projectData.title,
          description: projectData.description,
          start_date: projectData.start_date,
          due_date: projectData.due_date,
          course_id: projectData.course_id,
          min_tasks_per_member: projectData.min_tasks_per_member,
          max_tasks_per_member: projectData.max_tasks_per_member,
          breathe_phase_days: projectData.breathe_phase_days,
          evaluation_phase_days: projectData.evaluation_phase_days,
          project_evaluation_deadline: projectData.project_evaluation_deadline,
          project_evaluation_type: projectData.project_evaluation_type,
          project_rubric_type: projectData.project_rubric_type,
          MAXATTEMPT: projectData.MAXATTEMPT,
          total_phases: projectData.phases?.length || 0,
          phases: projectData.phases || []
        },
        member_tasks: memberTasksSnapshot,
        evaluation_submissions: evaluationSubmissionsSnapshot,
        member_inclusions: memberInclusionsData,
        validation_results: validationResultsData,
        phase_deliverables: phaseDeliverablesSnapshot,
        status: 'submitted',
        is_resubmission: false,
        resubmission_number: 0
      })
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Submission insert error:', submissionError);
      return res.status(500).json({ 
        error: 'Failed to create project deliverable submission',
        details: submissionError.message 
      });
    }

    console.log('✅ Project deliverable submission created:', submission.id);
    console.log('📦 === PROJECT DELIVERABLE SUBMISSION COMPLETE ===');

    res.json({
      success: true,
      message: 'Project deliverable submitted successfully',
      submission_id: submission.id,
      submitted_at: submission.submitted_at
    });

  } catch (error) {
    console.error('💥 Project deliverable submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit project deliverable',
      details: error.message 
    });
  }
});

// ============================================================================
// GET Project Deliverable Submissions
// ============================================================================
app.get('/api/student/projects/:projectId/deliverable-submissions', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { group_id } = req.query;
    const student_id = req.user.id;

    console.log('📋 === FETCH PROJECT DELIVERABLE SUBMISSIONS ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Group ID:', group_id);
    console.log('📋 Student ID:', student_id);

    // Verify student has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('❌ Project not found:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch submissions for this project and group
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_deliverable_submissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', group_id)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch submissions',
        details: submissionsError.message 
      });
    }

    console.log(`✅ Found ${submissions?.length || 0} submissions`);

    res.json({
      success: true,
      project_id: projectId,
      group_id: group_id,
      submissions: submissions || [],
      count: submissions?.length || 0
    });

  } catch (error) {
    console.error('💥 Error fetching project deliverable submissions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project deliverable submissions',
      details: error.message 
    });
  }
});

// Get project submissions for progress tracking
app.get('/api/student/project-submissions', authenticateStudent, async (req, res) => {
  try {
    const { projectId, groupId } = req.query;
    const student_id = req.user.id;

    console.log('📋 === FETCH PROJECT SUBMISSIONS ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Group ID:', groupId);
    console.log('📋 Student ID:', student_id);

    if (!projectId || !groupId) {
      return res.status(400).json({ error: 'projectId and groupId are required' });
    }

    // Verify student has access to this group (using service role)
    const { data: groupMembers, error: memberError } = await supabase
      .from('course_group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('student_id', student_id);

    if (memberError) {
      console.error('❌ Error checking group membership:', memberError);
      return res.status(500).json({ error: 'Error verifying group access' });
    }

    if (!groupMembers || groupMembers.length === 0) {
      console.error('❌ Student not authorized for this group');
      return res.status(403).json({ error: 'Not authorized to access this group' });
    }

    console.log('✅ Student authorized for group:', groupId);

    // Fetch project submission for this project and group (using service role)
    const { data: submissions, error: submissionsError } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .order('submission_date', { ascending: false })
      .limit(1);

    if (submissionsError) {
      console.error('❌ Error fetching project submission:', submissionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch project submission',
        details: submissionsError.message 
      });
    }

    const submission = submissions && submissions.length > 0 ? submissions[0] : null;
    console.log(`✅ Project submission found:`, submission ? 'Yes' : 'No');

    res.json({
      success: true,
      project_id: projectId,
      group_id: groupId,
      submission: submission,
      hasSubmission: !!submission
    });

  } catch (error) {
    console.error('💥 Error fetching project submission:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project submission',
      details: error.message 
    });
  }
});

// Get phase deliverable submissions for a project (for Activities Tab - Phase Submissions View)
app.get('/api/student/projects/:projectId/phase-deliverable-submissions', authenticateStudent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { group_id } = req.query;
    const student_id = req.user.id;

    console.log('📋 === FETCH PHASE DELIVERABLE SUBMISSIONS ===');
    console.log('📋 Project ID:', projectId);
    console.log('📋 Group ID:', group_id);
    console.log('📋 Student ID:', student_id);

    if (!group_id) {
      return res.status(400).json({ error: 'group_id is required' });
    }

    // Verify student has access to this project and group (using service role)
    const { data: groupMembers, error: memberError } = await supabase
      .from('course_group_members')
      .select('group_id')
      .eq('group_id', group_id)
      .eq('student_id', student_id);

    if (memberError) {
      console.error('❌ Error checking group membership:', memberError);
      return res.status(500).json({ error: 'Error verifying group access' });
    }

    if (!groupMembers || groupMembers.length === 0) {
      console.error('❌ Student not authorized for this group');
      return res.status(403).json({ error: 'Not authorized to access this group' });
    }

    console.log('✅ Student authorized for group:', group_id);

    // Fetch phase deliverable submissions for this project and group (using service role)
    const { data: submissions, error: submissionsError } = await supabase
      .from('phase_deliverable_submissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', group_id)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      console.error('❌ Error fetching phase submissions:', submissionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch phase submissions',
        details: submissionsError.message 
      });
    }

    console.log(`✅ Found ${submissions?.length || 0} phase deliverable submissions`);

    res.json({
      success: true,
      project_id: projectId,
      group_id: group_id,
      submissions: submissions || [],
      count: submissions?.length || 0
    });

  } catch (error) {
    console.error('💥 Error fetching phase deliverable submissions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch phase deliverable submissions',
      details: error.message 
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('💤 HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT signal received: closing HTTP server');
  process.exit(0);
});
