"use client";
import { useState } from 'react';
import { trpc } from '../../utils/trpcClient';

export default function TestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = trpc.auth.testConnection.useMutation();
  const testUsersTable = trpc.auth.testUsersTable.useMutation();

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const result = await testConnection.mutateAsync();
      setTestResults({ type: 'connection', data: result });
    } catch (error) {
      setTestResults({ type: 'connection', error: error });
    } finally {
      setLoading(false);
    }
  };

  const handleTestUsersTable = async () => {
    setLoading(true);
    try {
      const result = await testUsersTable.mutateAsync();
      setTestResults({ type: 'users_table', data: result });
    } catch (error) {
      setTestResults({ type: 'users_table', error: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Database Test Sayfası</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={handleTestConnection}
            disabled={loading}
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Database Bağlantısını Test Et
          </button>
          
          <button
            onClick={handleTestUsersTable}
            disabled={loading}
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Users Tablosunu Test Et
          </button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="text-lg">Test ediliyor...</div>
          </div>
        )}

        {testResults && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {testResults.type === 'connection' ? 'Database Bağlantı Testi' : 'Users Tablosu Testi'}
            </h2>
            
            {testResults.error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Hata:</strong> {JSON.stringify(testResults.error, null, 2)}
              </div>
            ) : (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <strong>Başarılı!</strong>
                <pre className="mt-2 text-sm overflow-auto">
                  {JSON.stringify(testResults.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Mevcut Tablolar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-600">Users Tablosu</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>id (UUID, Primary Key)</li>
                <li>name (TEXT, NOT NULL)</li>
                <li>email (TEXT, UNIQUE, NOT NULL)</li>
                <li>password_hash (TEXT, NOT NULL)</li>
                <li>role (TEXT, NOT NULL)</li>
                <li>phone (TEXT)</li>
                <li>address (TEXT)</li>
                <li>latitude (DOUBLE PRECISION)</li>
                <li>longitude (DOUBLE PRECISION)</li>
                <li>created_at (TIMESTAMPTZ)</li>
                <li>updated_at (TIMESTAMPTZ)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-green-600">Businesses Tablosu</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>id (UUID, Primary Key)</li>
                <li>owner_user_id (UUID, Foreign Key)</li>
                <li>name (TEXT, NOT NULL)</li>
                <li>description (TEXT)</li>
                <li>address (TEXT, NOT NULL)</li>
                <li>latitude (DOUBLE PRECISION, NOT NULL)</li>
                <li>longitude (DOUBLE PRECISION, NOT NULL)</li>
                <li>phone (TEXT)</li>
                <li>email (TEXT)</li>
                <li>created_at (TIMESTAMPTZ)</li>
                <li>updated_at (TIMESTAMPTZ)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 