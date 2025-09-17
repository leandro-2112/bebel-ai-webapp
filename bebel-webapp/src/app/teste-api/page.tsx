"use client"

import { useState, useEffect } from 'react';

export default function TesteAPI() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fazendo requisição para /api/pendencias...');
        const response = await fetch('/api/pendencias');
        
        if (!response.ok) {
          throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Dados recebidos:', result);
        setData(result);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Erro ao carregar dados</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Dados de resposta bruta:</h2>
          <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teste de API - Pendências</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600">Total de Pendências</p>
            <p className="text-2xl font-bold">{Array.isArray(data) ? data.length : 0}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-600">Status</p>
            <p className="text-2xl font-bold">
              {data && data.length > 0 ? 'Dados recebidos' : 'Nenhum dado'}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-sm text-green-600">Primeiro Item</p>
            <p className="text-sm font-medium truncate">
              {data && data[0] ? `ID: ${data[0].id_pendencia_sinalizada}` : 'Nenhum item'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Dados da API</h3>
          <p className="mt-1 text-sm text-gray-500">
            Resposta bruta do endpoint /api/pendencias
          </p>
        </div>
        <div className="px-4 py-5 sm:p-0">
          <pre className="text-xs p-4 overflow-auto max-h-[600px]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Verifique o console do navegador (F12) para ver os logs detalhados da requisição e resposta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
