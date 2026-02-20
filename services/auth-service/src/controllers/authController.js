/**
 * Auth Controller
 * Business logic for authentication operations
 */

const jwt = require('jsonwebtoken');
const config = require('../../../shared/config');
const { generateUUID } = require('../../../shared/utils/uuid');
const { parseDuration, addDays, toMySQLTimestamp } = require('../../../shared/utils/time');
const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');
const authRepository = require('../repositories/authRepository');
const http = require('../../../shared/utils/http');

/**
 * Register new user
 * Creates user in user-service first, then creates auth account
 */
async function register(req, res, next) {
  try {
    const { fullName, phone, email, password, role = 'user' } = req.body;
    
    // Trim input values
    const trimmedFullName = fullName?.trim();
    const trimmedPhone = phone?.trim();
    const trimmedEmail = email?.trim();
    
    console.log('=== REGISTER ATTEMPT ===');
    console.log('Full name:', trimmedFullName);
    console.log('Phone (original):', phone);
    console.log('Phone (trimmed):', trimmedPhone);
    console.log('Email:', trimmedEmail);
    console.log('Role:', role);
    
    // Validate required fields
    if (!trimmedFullName || !trimmedPhone || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'fullName, phone, and password are required',
        },
      });
    }
    
    // Check if account already exists
    const identifier = trimmedPhone; // Use phone as primary identifier
    const existingAccount = await authRepository.findByIdentifier(identifier);
    
    if (existingAccount) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {
          code: ERROR_CODES.DUPLICATE_ERROR,
          message: 'Account with this phone already exists',
        },
      });
    }
    
    // Generate userId for auth account
    let userId = generateUUID();
    
    // Only create user profile for role='user', not for drivers
    if (role === 'user') {
      const userServiceUrl = config.services.user;
      
      try {
        const userData = { 
          full_name: trimmedFullName, 
          phone: trimmedPhone, 
          email: trimmedEmail || null 
        };
        console.log('Creating user profile in user-service:', userData);
        const createUserResult = await http.post(`${userServiceUrl}/users/internal`, userData);
        userId = createUserResult.user.id;
        console.log('✅ User profile created with ID:', userId);
      } catch (error) {
        console.error('HTTP Error:', error.response?.status, JSON.stringify(error.response?.data, null, 2));
        console.error('Failed to create user in user-service:', error.message);
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          error: {
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'Failed to create user profile',
          },
        });
      }
    } else if (role === 'driver') {
      console.log('⚠️  Skipping user profile creation for driver (role=driver)');
      console.log('Driver profile will be created separately via driver-service');
    }
    
    // Create auth account
    const accountId = await authRepository.createAccount(userId, identifier, password, role);
    
    res.status(HTTP_STATUS.CREATED).json({
      message: 'User registered successfully',
      data: {
        accountId,
        userId,
        identifier,
        role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login
 * Authenticates user and returns JWT access + refresh tokens
 */
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    
    // Trim whitespace from identifier
    const trimmedIdentifier = identifier?.trim();
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Identifier (original):', identifier);
    console.log('Identifier (trimmed):', trimmedIdentifier);
    console.log('Password length:', password?.length);
    
    if (!trimmedIdentifier || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'identifier and password are required',
        },
      });
    }
    
    // Find account
    const account = await authRepository.findByIdentifier(trimmedIdentifier);
    
    console.log('Account found:', !!account);
    if (account) {
      console.log('Account user_id:', account.user_id);
      console.log('Account role:', account.role);
    }
    
    if (!account) {
      console.log('❌ No account found for identifier:', trimmedIdentifier);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      });
    }
    
    // Verify password
    const isValidPassword = await authRepository.verifyPassword(password, account.password_hash);
    
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for identifier:', trimmedIdentifier);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      });
    }
    
    // Generate tokens
    const jti = generateUUID();
    const accessToken = generateAccessToken(account.user_id, account.role, jti);
    const refreshToken = generateRefreshToken(account.user_id, account.role, jti);
    
    // Store refresh token
    const expiresInMs = parseDuration(config.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);
    const { tokenHash } = await authRepository.createRefreshToken(
      account.id,
      jti,
      toMySQLTimestamp(expiresAt)
    );
    
    // Fetch user profile based on role
    let userData = {
      id: account.user_id,
      role: account.role,
    };
    
    try {
      if (account.role === 'user') {
        const userServiceUrl = config.services.user;
        const userProfile = await http.get(`${userServiceUrl}/users/internal/${account.user_id}`);
        userData = {
          id: account.user_id,
          role: account.role,
          fullName: userProfile.user.full_name,
          phone: userProfile.user.phone,
          email: userProfile.user.email,
        };
      } else if (account.role === 'driver') {
        const driverServiceUrl = config.services.driver;
        const driverProfile = await http.get(`${driverServiceUrl}/drivers/by-user/${account.user_id}`);
        userData = {
          id: account.user_id,
          role: account.role,
          fullName: driverProfile.driver.full_name,
          phone: driverProfile.driver.phone,
          vehicleType: driverProfile.driver.vehicle_type,
          status: driverProfile.driver.status,
        };
      }
    } catch (error) {
      console.log('Warning: Could not fetch user profile:', error.message);
      // Continue with basic user data
    }
    
    res.json({
      accessToken,
      refreshToken: tokenHash,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'refreshToken is required',
        },
      });
    }
    
    // Find refresh token
    const storedToken = await authRepository.findRefreshTokenByHash(refreshToken);
    
    if (!storedToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid refresh token',
        },
      });
    }
    
    // Check if token is revoked
    if (storedToken.revoked_at) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Refresh token has been revoked',
        },
      });
    }
    
    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.TOKEN_EXPIRED,
          message: 'Refresh token has expired',
        },
      });
    }
    
    // Get account info
    const account = await authRepository.findByUserId(storedToken.account_id);
    
    if (!account) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.INVALID_TOKEN,
          message: 'Account not found',
        },
      });
    }
    
    // Generate new access token with same jti
    const accessToken = generateAccessToken(account.user_id, account.role, storedToken.jti);
    
    res.json({
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        expiresIn: config.jwt.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user info
 */
async function me(req, res, next) {
  try {
    const userId = req.user.sub;
    const role = req.user.role;
    
    // Get account info
    const account = await authRepository.findByUserId(userId);
    
    if (!account) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Account not found',
        },
      });
    }
    
    // Fetch user profile based on role (same as login)
    let userData = {
      id: account.user_id,
      role: account.role,
    };
    
    try {
      if (account.role === 'user') {
        const userServiceUrl = config.services.user;
        const userProfile = await http.get(`${userServiceUrl}/users/internal/${account.user_id}`);
        userData = {
          id: account.user_id,
          role: account.role,
          fullName: userProfile.user.full_name,
          phone: userProfile.user.phone,
          email: userProfile.user.email,
        };
      } else if (account.role === 'driver') {
        const driverServiceUrl = config.services.driver;
        const driverProfile = await http.get(`${driverServiceUrl}/drivers/by-user/${account.user_id}`);
        userData = {
          id: account.user_id,
          role: account.role,
          fullName: driverProfile.driver.full_name,
          phone: driverProfile.driver.phone,
          vehicleType: driverProfile.driver.vehicle_type,
          status: driverProfile.driver.status,
        };
      }
    } catch (error) {
      console.log('Warning: Could not fetch user profile:', error.message);
      // Continue with basic user data
    }
    
    res.json(userData);
  } catch (error) {
    next(error);
  }
}

/**
 * Logout - revoke refresh token
 */
async function logout(req, res, next) {
  try {
    const jti = req.user.jti;
    
    // Revoke the refresh token associated with this jti
    await authRepository.revokeRefreshToken(jti);
    
    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate JWT access token
 */
function generateAccessToken(userId, role, jti) {
  const payload = {
    sub: userId,
    role,
    jti,
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId, role, jti) {
  const payload = {
    sub: userId,
    role,
    jti,
    type: 'refresh',
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

module.exports = {
  register,
  login,
  refresh,
  me,
  logout,
};
