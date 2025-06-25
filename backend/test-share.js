import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test credentials - change as needed
const TEST_USER = {
  email: 'test3@example.com',  // Updated to match the email used in previous tests
  password: 'password123'
};

// Helper function for authenticated API requests
async function fetchWithAuth(endpoint, options = {}) {
  // Login first to get session cookie
  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.status}`);
  }
  
  const sessionCookie = loginResponse.headers.get('set-cookie');
  
  // Make the actual request with the session cookie
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Cookie': sessionCookie
    }
  });
}

async function testShareFunctionality() {
  try {
    console.log('🔄 Testing Share Folder Functionality');
    console.log('====================================\n');
    
    // Step 1: Get user's folders
    console.log('Step 1: Getting user folders...');
    const foldersResponse = await fetchWithAuth('/api/folders');
    const foldersData = await foldersResponse.json();
    
    if (!foldersData.folders || foldersData.folders.length === 0) {
      throw new Error('No folders found. Please create a folder first.');
    }
    
    const targetFolder = foldersData.folders[0]; // Using the first folder
    console.log(`✅ Found folder: "${targetFolder.name}" (ID: ${targetFolder.id})\n`);
    
    // Step 2: Create a share link for the folder
    console.log(`Step 2: Creating share link for folder "${targetFolder.name}"...`);
    const createShareResponse = await fetchWithAuth(`/api/folders/${targetFolder.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: '1d' }) // 1 day expiry
    });
    
    const shareData = await createShareResponse.json();
    
    if (!createShareResponse.ok) {
      throw new Error(`Failed to create share link: ${JSON.stringify(shareData)}`);
    }
    
    console.log('✅ Share link created successfully!');
    console.log(`📎 Share URL: ${shareData.shareLink.shareUrl}`);
    console.log(`⏱️  Expires at: ${new Date(shareData.shareLink.expiresAt).toLocaleString()}\n`);
    
    // Step 3: Get all user's share links
    console.log('Step 3: Getting all user share links...');
    const shareLinksResponse = await fetchWithAuth('/api/sharelinks');
    const shareLinksData = await shareLinksResponse.json();
    
    console.log(`✅ Found ${shareLinksData.count} share link(s)\n`);
    
    // Step 4: Access the shared folder anonymously
    console.log('Step 4: Accessing shared folder anonymously...');
    const token = shareData.shareLink.token;
    const sharedFolderResponse = await fetch(`${BASE_URL}/share/${token}`);
    const sharedFolderData = await sharedFolderResponse.json();
    
    if (!sharedFolderResponse.ok) {
      throw new Error(`Failed to access shared folder: ${JSON.stringify(sharedFolderData)}`);
    }
    
    console.log('✅ Successfully accessed shared folder!');
    console.log(`📂 Folder: ${sharedFolderData.folder.name}`);
    console.log(`📄 Files: ${sharedFolderData.folder.files?.length || 0}`);
    console.log(`📁 Subfolders: ${sharedFolderData.folder.subfolders?.length || 0}\n`);
    
    // Step 5: Delete the share link
    console.log('Step 5: Deleting share link...');
    const deleteShareResponse = await fetchWithAuth(`/api/sharelinks/${shareData.shareLink.id}`, {
      method: 'DELETE'
    });
    
    const deleteData = await deleteShareResponse.json();
    
    if (!deleteShareResponse.ok) {
      throw new Error(`Failed to delete share link: ${JSON.stringify(deleteData)}`);
    }
    
    console.log('✅ Share link deleted successfully!\n');
    
    // Try accessing the deleted share link
    console.log('Step 6: Attempting to access deleted share link...');
    const deletedShareResponse = await fetch(`${BASE_URL}/share/${token}`);
    
    if (deletedShareResponse.ok) {
      console.log('❌ WARNING: Share link still accessible after deletion!');
    } else {
      console.log('✅ Share link properly inaccessible after deletion.');
      console.log(`🔒 Status: ${deletedShareResponse.status}`);
    }
    
    console.log('\n✨ All tests completed successfully! ✨');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testShareFunctionality();
