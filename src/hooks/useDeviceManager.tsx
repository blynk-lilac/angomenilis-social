import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Device {
  id: string;
  user_id: string;
  device_name: string | null;
  device_type: string;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  is_trusted: boolean;
  is_current: boolean;
  last_active: string;
  created_at: string;
}

interface AccessLog {
  id: string;
  action_type: string;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  user_agent: string | null;
  success: boolean;
  risk_level: string;
  created_at: string;
}

interface SecuritySettings {
  max_devices: number;
  kick_old_sessions: boolean;
  account_at_risk: boolean;
  require_confirmation_email: boolean;
  require_confirmation_password: boolean;
  require_confirmation_ads: boolean;
  trusted_devices_only: boolean;
}

export function useDeviceManager() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [accessHistory, setAccessHistory] = useState<AccessLog[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const detectDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    // Detect browser
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    // Detect OS
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

    return { deviceType, browser, os, userAgent: ua };
  }, []);

  const getLocationInfo = useCallback(async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        ip: data.ip,
        city: data.city,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return { ip: null, city: null, country: null, latitude: null, longitude: null };
    }
  }, []);

  const registerCurrentDevice = useCallback(async () => {
    if (!user) return;

    const deviceInfo = detectDeviceInfo();
    const locationInfo = await getLocationInfo();

    // Check if device already exists based on user agent and IP
    const { data: existingDevices } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('ip_address', locationInfo.ip)
      .eq('browser', deviceInfo.browser)
      .eq('os', deviceInfo.os);

    if (existingDevices && existingDevices.length > 0) {
      // Update existing device
      const deviceId = existingDevices[0].id;
      await supabase
        .from('user_devices')
        .update({
          is_current: true,
          last_active: new Date().toISOString()
        })
        .eq('id', deviceId);

      // Set other devices as not current
      await supabase
        .from('user_devices')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .neq('id', deviceId);

      setCurrentDeviceId(deviceId);

      // Log access
      await supabase.from('access_history').insert({
        user_id: user.id,
        device_id: deviceId,
        action_type: 'login',
        ip_address: locationInfo.ip,
        city: locationInfo.city,
        country: locationInfo.country,
        user_agent: deviceInfo.userAgent,
        success: true,
        risk_level: 'low'
      });

      return deviceId;
    }

    // Create new device
    const deviceName = `${deviceInfo.os} - ${deviceInfo.browser}`;
    
    const { data: newDevice, error } = await supabase
      .from('user_devices')
      .insert({
        user_id: user.id,
        device_name: deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip_address: locationInfo.ip,
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
        city: locationInfo.city,
        country: locationInfo.country,
        is_current: true,
        is_trusted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering device:', error);
      return null;
    }

    // Set other devices as not current
    await supabase
      .from('user_devices')
      .update({ is_current: false })
      .eq('user_id', user.id)
      .neq('id', newDevice.id);

    setCurrentDeviceId(newDevice.id);

    // Log access
    await supabase.from('access_history').insert({
      user_id: user.id,
      device_id: newDevice.id,
      action_type: 'new_device_login',
      ip_address: locationInfo.ip,
      city: locationInfo.city,
      country: locationInfo.country,
      user_agent: deviceInfo.userAgent,
      success: true,
      risk_level: 'medium'
    });

    // Create security alert for new device
    await supabase.from('security_alerts').insert({
      user_id: user.id,
      alert_type: 'new_device',
      message: `Novo dispositivo detectado: ${deviceName} em ${locationInfo.city || 'Localização desconhecida'}, ${locationInfo.country || ''}`,
      device_id: newDevice.id
    });

    return newDevice.id;
  }, [user, detectDeviceInfo, getLocationInfo]);

  const loadDevices = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (!error && data) {
      setDevices(data as Device[]);
    }
  }, [user]);

  const loadAccessHistory = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('access_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setAccessHistory(data as AccessLog[]);
    }
  }, [user]);

  const loadSecuritySettings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('security_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create default settings
      const { data: newSettings } = await supabase
        .from('security_settings')
        .insert({
          user_id: user.id,
          max_devices: 5,
          kick_old_sessions: false,
          account_at_risk: false,
          require_confirmation_email: true,
          require_confirmation_password: true,
          require_confirmation_ads: true,
          trusted_devices_only: false
        })
        .select()
        .single();

      if (newSettings) {
        setSecuritySettings(newSettings as SecuritySettings);
      }
    } else if (data) {
      setSecuritySettings(data as SecuritySettings);
    }
  }, [user]);

  const updateSecuritySettings = async (settings: Partial<SecuritySettings>) => {
    if (!user) return;

    const { error } = await supabase
      .from('security_settings')
      .update(settings)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao atualizar configurações');
      return false;
    }

    await loadSecuritySettings();
    toast.success('Configurações atualizadas');
    return true;
  };

  const trustDevice = async (deviceId: string) => {
    const { error } = await supabase
      .from('user_devices')
      .update({ is_trusted: true })
      .eq('id', deviceId);

    if (error) {
      toast.error('Erro ao confiar no dispositivo');
      return false;
    }

    await loadDevices();
    toast.success('Dispositivo marcado como confiável');
    return true;
  };

  const removeDevice = async (deviceId: string) => {
    if (deviceId === currentDeviceId) {
      toast.error('Não pode remover o dispositivo atual');
      return false;
    }

    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', deviceId);

    if (error) {
      toast.error('Erro ao remover dispositivo');
      return false;
    }

    await loadDevices();
    toast.success('Dispositivo removido');
    return true;
  };

  const reportSuspiciousActivity = async (accessId: string) => {
    if (!user) return;

    // Block account temporarily
    await supabase
      .from('security_settings')
      .update({ account_at_risk: true })
      .eq('user_id', user.id);

    // Create security alert
    await supabase.from('security_alerts').insert({
      user_id: user.id,
      alert_type: 'suspicious_activity_reported',
      message: 'Atividade suspeita reportada pelo utilizador. Conta em modo de risco.',
    });

    // Log the action
    await supabase.from('access_history').insert({
      user_id: user.id,
      action_type: 'suspicious_report',
      success: true,
      risk_level: 'high'
    });

    toast.success('Atividade reportada. Conta em modo de proteção.');
    await loadSecuritySettings();
  };

  useEffect(() => {
    if (user) {
      const init = async () => {
        setLoading(true);
        await registerCurrentDevice();
        await Promise.all([
          loadDevices(),
          loadAccessHistory(),
          loadSecuritySettings()
        ]);
        setLoading(false);
      };
      init();
    }
  }, [user]);

  return {
    devices,
    accessHistory,
    securitySettings,
    loading,
    currentDeviceId,
    trustDevice,
    removeDevice,
    updateSecuritySettings,
    reportSuspiciousActivity,
    refreshDevices: loadDevices,
    refreshHistory: loadAccessHistory
  };
}
