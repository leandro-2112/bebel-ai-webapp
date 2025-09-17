import useSWR from 'swr';
import { PendenciaWithDetails } from '@/lib/types';

const API_URL = '/api/pendencias';

const fetcher = async (url: string): Promise<PendenciaWithDetails[]> => {
  console.log('Fetching data from:', url);
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error(`Erro ao buscar pendências: ${res.status} ${res.statusText}`);
    console.error('Erro na resposta:', error);
    throw error;
  }
  
  const response = await res.json();
  console.log('Resposta bruta da API:', response);
  
  // A API retorna os dados dentro de uma propriedade 'data'
  const data = response.data || [];
  
  // Verifica se os dados estão no formato esperado
  if (Array.isArray(data)) {
    console.log(`Total de pendências recebidas: ${data.length}`);
    if (data.length > 0) {
      console.log('Primeira pendência:', data[0]);
    }
    return data;
  } else {
    console.error('Formato de resposta inesperado da API:', response);
    // Se não for um array, retorna um array vazio para evitar erros
    return [];
  }
};

export function usePendencias(queryString: string = '') {
  const url = queryString ? `${API_URL}?${queryString}` : API_URL;
  console.log('usePendencias chamado com queryString:', queryString);
  console.log('URL da requisição:', url);
  
  const { data, error, isLoading, mutate } = useSWR<PendenciaWithDetails[]>(
    url,
    fetcher,
    {
      // Revalida a cada 30 segundos, quando a janela ganha foco, e ao reconectar
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Mantém os dados em cache por 5 minutos
      dedupingInterval: 30000,
      onSuccess: (data) => {
        console.log('Dados processados pelo SWR:', data);
        console.log('Tipo dos dados:', typeof data);
        console.log('É array?', Array.isArray(data));
        if (data && Array.isArray(data)) {
          console.log(`Total de itens: ${data.length}`);
        }
      },
      onError: (err) => {
        console.error('Erro no SWR:', err);
      }
    }
  );

  const result = {
    pendencias: Array.isArray(data) ? data : [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
  
  console.log('Retornando do usePendencias:', {
    pendenciasCount: result.pendencias.length,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error?.message
  });
  
  return result;
}

// Hook para atualizar uma pendência específica
export function useUpdatePendencia() {
  const { mutate } = useSWR(API_URL);

  const updatePendencia = async (
    id: number, 
    updates: Partial<PendenciaWithDetails>
  ) => {
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar pendência');
    }

    // Atualiza o cache local com os novos dados
    mutate((currentData: PendenciaWithDetails[] | undefined) => {
      if (!currentData) return currentData;
      return currentData.map(pendencia => 
        pendencia.id_pendencia_sinalizada === id 
          ? { ...pendencia, ...updates } 
          : pendencia
      );
    }, false); // false para não revalidar imediatamente

    return response.json();
  };

  return { updatePendencia };
}
