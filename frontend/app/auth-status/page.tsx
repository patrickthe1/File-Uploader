"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AuthStatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderResult, setFolderResult] = useState<any>(null);
  
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth-status`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setStatus({ error: `Request failed with status ${response.status}` });
      }
    } catch (error) {
      setStatus({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const createTestFolder = async () => {
    if (!folderName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: folderName }),
      });
      
      const data = await response.json();
      
      setFolderResult({
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        data
      });
    } catch (error) {
      setFolderResult({ status: 'error', error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Status Checker</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={checkAuthStatus} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? "Loading..." : "Check Authentication Status"}
          </Button>
          
          {status && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Response:</h3>
              <pre className="bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Folder Creation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={createTestFolder}
              disabled={loading || !folderName.trim()}
            >
              Create Folder
            </Button>
          </div>
          
          {folderResult && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Result:</h3>
              <pre className="bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(folderResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
