/**
 * User Controller
 * Business logic for user operations
 */

const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');
const userRepository = require('../repositories/userRepository');
const { isValidEmail, isValidPhone } = require('../../../shared/utils/validate');

/**
 * Create user (internal endpoint for auth-service)
 */
async function createUserInternal(req, res, next) {
  try {
    const { full_name, phone, email } = req.body;
    
    if (!full_name || !phone) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'full_name and phone are required',
        },
      });
    }
    
    // Validate phone
    if (!isValidPhone(phone)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid phone number format',
        },
      });
    }
    
    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid email format',
        },
      });
    }
    
    // Check if phone already exists
    const phoneInUse = await userRepository.phoneExists(phone);
    if (phoneInUse) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {
          code: ERROR_CODES.DUPLICATE_ERROR,
          message: 'Phone number already registered',
        },
      });
    }
    
    // Check if email already exists
    if (email) {
      const emailInUse = await userRepository.emailExists(email);
      if (emailInUse) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: {
            code: ERROR_CODES.DUPLICATE_ERROR,
            message: 'Email already registered',
          },
        });
      }
    }
    
    // Create user
    const userId = await userRepository.createUser(full_name, phone, email);
    const user = await userRepository.findById(userId);
    
    res.status(HTTP_STATUS.CREATED).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user.sub;
    
    const user = await userRepository.findById(userId);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'User not found',
        },
      });
    }
    
    res.json({
      data: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        rating: user.rating_avg,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update current user profile
 */
async function updateMe(req, res, next) {
  try {
    const userId = req.user.sub;
    const { fullName, email } = req.body;
    
    const updates = {};
    
    if (fullName !== undefined) {
      if (!fullName || fullName.trim().length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Full name cannot be empty',
          },
        });
      }
      updates.full_name = fullName.trim();
    }
    
    if (email !== undefined) {
      if (email && !isValidEmail(email)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid email format',
          },
        });
      }
      
      // Check if email is already used by another user
      if (email) {
        const emailInUse = await userRepository.emailExists(email, userId);
        if (emailInUse) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            error: {
              code: ERROR_CODES.DUPLICATE_ERROR,
              message: 'Email already in use',
            },
          });
        }
      }
      
      updates.email = email;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'No valid fields to update',
        },
      });
    }
    
    await userRepository.updateUser(userId, updates);
    const user = await userRepository.findById(userId);
    
    res.json({
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        rating: user.rating_avg,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID (internal or admin)
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    
    const user = await userRepository.findById(id);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'User not found',
        },
      });
    }
    
    res.json({
      data: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        rating: user.rating_avg,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createUserInternal,
  getMe,
  updateMe,
  getUserById,
};
