import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Test file upload to our API
async function testFileUpload() {
  try {
    console.log('🧪 Testing Cloudinary file upload...\n');

    // First, we need to login to get a session cookie
    console.log('1. Logging in...');
    let sessionCookie = null;
    let loginResponse = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test3@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed. Creating test user...');
      // Register a test user
      const registerResponse = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User4',
          email: 'test4@example.com',
          password: 'password123'
        })
      });
      const registerResult = await registerResponse.json().catch(() => ({}));
      if (!registerResponse.ok) {
        console.log('❌ Registration failed:', registerResult.message || registerResult || 'Unknown error');
        // If already exists, try login again
        if (registerResult.message && registerResult.message.includes('already in use')) {
          console.log('🔄 User exists, retrying login...');
          loginResponse = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123'
            })
          });
          if (!loginResponse.ok) {
            const retryResult = await loginResponse.json().catch(() => ({}));
            throw new Error('Retry login failed: ' + (retryResult.message || retryResult || 'Unknown error'));
          }
          sessionCookie = loginResponse.headers.get('set-cookie');
          console.log('✅ Login successful after registration');
        } else {
          throw new Error('Failed to register test user: ' + (registerResult.message || registerResult || 'Unknown error'));
        }
      } else {
        console.log('✅ Test user created successfully');
        sessionCookie = registerResponse.headers.get('set-cookie');
      }
    } else {
      sessionCookie = loginResponse.headers.get('set-cookie');
      console.log('✅ Login successful');
    }

    // Use the provided PDF file path
    const testFilePath = 'C:/Users/mugis/Downloads/project_cost.pdf';
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test PDF file not found at: ${testFilePath}`);
    }

    // Prepare form data
    const form = new FormData();
    form.append('files', fs.createReadStream(testFilePath));

    console.log('\n2. Uploading test PDF file...');
    
    // Upload file
    const uploadResponse = await fetch('http://localhost:3000/api/files/upload', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: form
    });

    const uploadResult = await uploadResponse.json();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful!');
      console.log('📁 Uploaded file details:');
      console.log(`   Name: ${uploadResult.files[0].name}`);
      console.log(`   Size: ${uploadResult.files[0].formattedSize}`);
      console.log(`   Cloudinary URL: ${uploadResult.files[0].cloudUrl}`);
      console.log(`   Public ID: ${uploadResult.files[0].publicId}`);
      
      // Test file retrieval
      console.log('\n3. Testing file retrieval...');
      const getFilesResponse = await fetch('http://localhost:3000/api/files', {
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      const filesResult = await getFilesResponse.json();
      console.log(`✅ Retrieved ${filesResult.count} file(s)`);
      
    } else {
      console.log('❌ Upload failed:');
      console.log(uploadResult);
    }

    // No cleanup needed for provided PDF file
    console.log('\n🧹 No test file cleanup needed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFileUpload();
