'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { testConnection } from '@/lib/supabase/database';

export default function TestDBPage() {
  const [status, setStatus] = useState<string>('Click button to test');
  const [tables, setTables] = useState<string[]>([]);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setStatus('Testing connection...');
    
    const result = await testConnection();
    
    if (result.connected) {
      setStatus('✅ Connected successfully!');
      setTables(result.tables);
    } else {
      setStatus(`❌ Error: ${result.error}`);
      setTables([]);
    }
  };

  const handleInsertTestData = async () => {
    if (!supabase) {
      setStatus('❌ Supabase not configured');
      return;
    }

    setStatus('Inserting test data...');
    
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .insert({
          name: 'Test Child ' + new Date().toISOString().slice(11, 19),
          age: 7,
          grade: 'Grade 2',
          interests: ['dinosaurs', 'space'],
          preferred_language: 'en',
        })
        .select()
        .single();
      
      if (error) {
        setStatus(`❌ Insert Error: ${error.message}`);
        return;
      }
      
      setStatus(`✅ Inserted! ID: ${data.id}`);
      setInsertedId(data.id);
      
    } catch (err) {
      setStatus(`❌ Exception: ${String(err)}`);
    }
  };

  const handleDeleteTestData = async () => {
    if (!supabase || !insertedId) {
      setStatus('❌ No test data to delete');
      return;
    }

    setStatus('Deleting test data...');
    
    try {
      const { error } = await supabase
        .from('child_profiles')
        .delete()
        .eq('id', insertedId);
      
      if (error) {
        setStatus(`❌ Delete Error: ${error.message}`);
        return;
      }
      
      setStatus('✅ Test data deleted!');
      setInsertedId(null);
      
    } catch (err) {
      setStatus(`❌ Exception: ${String(err)}`);
    }
  };

  const handleFetchAll = async () => {
    if (!supabase) {
      setStatus('❌ Supabase not configured');
      return;
    }

    setStatus('Fetching all profiles...');
    
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('id, name, age, grade, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        setStatus(`❌ Fetch Error: ${error.message}`);
        return;
      }
      
      setStatus(`✅ Found ${data?.length || 0} profiles:\n${JSON.stringify(data, null, 2)}`);
      
    } catch (err) {
      setStatus(`❌ Exception: ${String(err)}`);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🗄️ Supabase Connection Test</h1>
        <p className="text-slate-400 mb-8">Test your database connection and operations</p>
        
        {/* Environment Check */}
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-3">📋 Environment Check</h2>
          <ul className="font-mono text-sm space-y-2">
            <li className="flex items-center gap-2">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                <span className="text-green-400">✅</span>
              ) : (
                <span className="text-red-400">❌</span>
              )}
              NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
            </li>
            <li className="flex items-center gap-2">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
                <span className="text-green-400">✅</span>
              ) : (
                <span className="text-red-400">❌</span>
              )}
              NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
            </li>
            <li className="flex items-center gap-2">
              {isConfigured ? (
                <span className="text-green-400">✅</span>
              ) : (
                <span className="text-red-400">❌</span>
              )}
              Supabase Client: {isConfigured ? 'Initialized' : 'Not Initialized'}
            </li>
          </ul>
        </div>

        {/* Status Display */}
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-3">📊 Status</h2>
          <pre className="bg-slate-900 p-3 rounded text-sm whitespace-pre-wrap break-words max-h-60 overflow-auto">
            {status}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-3">🔧 Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleTestConnection}
              disabled={!isConfigured}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              🔌 Test Connection
            </button>
            
            <button
              onClick={handleFetchAll}
              disabled={!isConfigured}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              📋 Fetch Profiles
            </button>
            
            <button
              onClick={handleInsertTestData}
              disabled={!isConfigured}
              className="px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              ➕ Insert Test Data
            </button>
            
            <button
              onClick={handleDeleteTestData}
              disabled={!isConfigured || !insertedId}
              className="px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              🗑️ Delete Test Data
            </button>
          </div>
        </div>

        {/* Tables Found */}
        {tables.length > 0 && (
          <div className="bg-slate-800 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-3">✅ Tables Found ({tables.length})</h2>
            <ul className="grid grid-cols-2 gap-2">
              {tables.map(table => (
                <li key={table} className="bg-green-900/30 border border-green-700/50 px-3 py-2 rounded flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  {table}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h2 className="text-lg font-bold mb-2">📝 Setup Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
            <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">supabase.com</a></li>
            <li>Run the SQL schema in Supabase SQL Editor</li>
            <li>Copy your Project URL and anon key from Settings → API</li>
            <li>Add them to <code className="bg-slate-700 px-1 rounded">.env.local</code>:
              <pre className="bg-slate-900 p-2 rounded mt-2 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
              </pre>
            </li>
            <li>Restart your dev server</li>
          </ol>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a href="/" className="text-blue-400 hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
