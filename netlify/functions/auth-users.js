const crypto = require('crypto');

// Simple user store (matches the login function)
const USERS = {
  admin: {
    id: '1',
    username: 'admin',
    password_hash: crypto.createHash('sha256').update('pastoral2024').digest('hex'),
    role: 'admin'
  }
};

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';

// Simple JWT verification
function verifyJWT(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

function verifyAdmin(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const decoded = verifyJWT(token);
  const user = USERS[decoded.sub];

  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Verify admin access
    const authHeader = event.headers.authorization || event.headers.Authorization;
    verifyAdmin(authHeader);

    if (event.httpMethod === 'GET') {
      // Get all users
      const users = Object.values(USERS).map(user => ({
        id: user.id,
        username: user.username,
        role: user.role
      }));

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      };
    }

    if (event.httpMethod === 'POST') {
      // Create new user
      const { username, password, role = 'user' } = JSON.parse(event.body);

      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ detail: 'Username and password required' })
        };
      }

      if (USERS[username]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ detail: 'Username already exists' })
        };
      }

      const newId = String(Object.keys(USERS).length + 1);
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      USERS[username] = {
        id: newId,
        username,
        password_hash: passwordHash,
        role
      };

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, username, role })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ detail: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Users API error:', error);

    if (error.message.includes('authorization') || error.message.includes('Admin')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: error.message })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Internal server error' })
    };
  }
};