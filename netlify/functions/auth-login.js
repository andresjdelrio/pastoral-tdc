const crypto = require('crypto');

// Simple user store (in production, use environment variables or database)
const USERS = {
  admin: {
    id: '1',
    username: 'admin',
    password_hash: crypto.createHash('sha256').update('pastoral2024').digest('hex'),
    role: 'admin'
  }
};

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';

// Simple JWT creation (basic implementation)
function createJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payloadStr}`)
    .digest('base64url');

  return `${header}.${payloadStr}.${signature}`;
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ detail: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Validate input
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ detail: 'Username and password required' })
      };
    }

    // Check user exists
    const user = USERS[username];
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Incorrect username or password' })
      };
    }

    // Verify password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== user.password_hash) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Incorrect username or password' })
      };
    }

    // Create JWT token
    const expire = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
    const tokenPayload = {
      sub: user.username,
      exp: expire
    };
    const token = createJWT(tokenPayload);

    // Return success response
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Internal server error' })
    };
  }
};