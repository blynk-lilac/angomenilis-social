import { useState, useEffect, useCallback } from 'react';

interface NetworkInfo {
  isOnline: boolean;
  isSlowNetwork: boolean;
  effectiveType: string;
  downlink: number;
  saveData: boolean;
}

export const useNetworkOptimization = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: navigator.onLine,
    isSlowNetwork: false,
    effectiveType: '4g',
    downlink: 10,
    saveData: false,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;
      
      if (connection) {
        const isSlowNetwork = ['slow-2g', '2g', '3g'].includes(connection.effectiveType) || 
                              connection.downlink < 1;
        
        setNetworkInfo({
          isOnline: navigator.onLine,
          isSlowNetwork,
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          saveData: connection.saveData || false,
        });
      } else {
        setNetworkInfo(prev => ({ ...prev, isOnline: navigator.onLine }));
      }
    };

    updateNetworkInfo();

    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  // Get optimal image quality based on network
  const getImageQuality = useCallback((originalUrl: string): string => {
    if (!originalUrl) return originalUrl;
    
    // For Supabase storage URLs, add transform parameters
    if (originalUrl.includes('supabase.co/storage')) {
      const quality = networkInfo.isSlowNetwork ? 30 : networkInfo.saveData ? 50 : 80;
      const width = networkInfo.isSlowNetwork ? 400 : networkInfo.saveData ? 600 : 800;
      
      // Add transformation parameters
      if (originalUrl.includes('?')) {
        return `${originalUrl}&quality=${quality}&width=${width}`;
      }
      return `${originalUrl}?quality=${quality}&width=${width}`;
    }
    
    return originalUrl;
  }, [networkInfo]);

  // Get optimal video quality
  const getVideoQuality = useCallback((): 'low' | 'medium' | 'high' => {
    if (networkInfo.isSlowNetwork || networkInfo.saveData) return 'low';
    if (networkInfo.downlink < 5) return 'medium';
    return 'high';
  }, [networkInfo]);

  // Preload strategy based on network
  const getPreloadStrategy = useCallback((): 'none' | 'metadata' | 'auto' => {
    if (!networkInfo.isOnline) return 'none';
    if (networkInfo.isSlowNetwork || networkInfo.saveData) return 'none';
    if (networkInfo.downlink < 5) return 'metadata';
    return 'auto';
  }, [networkInfo]);

  return {
    ...networkInfo,
    getImageQuality,
    getVideoQuality,
    getPreloadStrategy,
  };
};
