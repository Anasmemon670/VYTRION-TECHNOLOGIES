// Test script for Authentication APIs
const BASE_URL = 'http://localhost:3000';

async function testAPI(name, method, endpoint, body = null, token = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`\n${name}:`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`\n${name} Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Authentication APIs...\n');
  
  let userToken = null;
  let adminToken = null;
  let refreshToken = null;
  let resetToken = null;
  
  // 1. Test User Register
  const registerResult = await testAPI(
    '1. User Register',
    'POST',
    '/api/auth/register',
    {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      phone: '+1234567899',
      password: 'test123',
      termsAccepted: true,
      marketingOptIn: false
    }
  );
  
  if (registerResult.success) {
    userToken = registerResult.data.token;
    refreshToken = registerResult.data.refreshToken;
  }
  
  // 2. Test User Login
  const loginResult = await testAPI(
    '2. User Login',
    'POST',
    '/api/auth/login',
    {
      email: 'john@example.com',
      password: 'password123'
    }
  );
  
  if (loginResult.success) {
    userToken = loginResult.data.token;
    refreshToken = loginResult.data.refreshToken;
  }
  
  // 3. Test Admin Login
  const adminLoginResult = await testAPI(
    '3. Admin Login',
    'POST',
    '/api/auth/admin/login',
    {
      email: 'admin@example.com',
      password: 'password123'
    }
  );
  
  if (adminLoginResult.success) {
    adminToken = adminLoginResult.data.token;
  }
  
  // 4. Test Get Current User
  if (userToken) {
    await testAPI(
      '4. Get Current User',
      'GET',
      '/api/auth/me',
      null,
      userToken
    );
  }
  
  // 5. Test Update Profile
  if (userToken) {
    await testAPI(
      '5. Update Profile',
      'PUT',
      '/api/auth/profile',
      {
        firstName: 'Updated',
        lastName: 'Name'
      },
      userToken
    );
  }
  
  // 6. Test Refresh Token
  if (refreshToken) {
    const refreshResult = await testAPI(
      '6. Refresh Token',
      'POST',
      '/api/auth/refresh',
      {
        refreshToken: refreshToken
      }
    );
    
    if (refreshResult.success) {
      userToken = refreshResult.data.token;
      refreshToken = refreshResult.data.refreshToken;
    }
  }
  
  // 7. Test Forgot Password
  const forgotResult = await testAPI(
    '7. Forgot Password',
    'POST',
    '/api/auth/forgot-password',
    {
      email: 'john@example.com'
    }
  );
  
  if (forgotResult.success && forgotResult.data.resetToken) {
    resetToken = forgotResult.data.resetToken;
  }
  
  // 8. Test Reset Password (only if we have reset token)
  if (resetToken) {
    await testAPI(
      '8. Reset Password',
      'POST',
      '/api/auth/reset-password',
      {
        resetToken: resetToken,
        newPassword: 'newpassword123'
      }
    );
  }
  
  // 9. Test Admin: Get All Users
  if (adminToken) {
    await testAPI(
      '9. Admin: Get All Users',
      'GET',
      '/api/auth/admin/users?page=1&limit=10',
      null,
      adminToken
    );
  }
  
  // 10. Test Logout
  if (userToken) {
    await testAPI(
      '10. Logout',
      'POST',
      '/api/auth/logout',
      null,
      userToken
    );
  }
  
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);

