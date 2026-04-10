import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  [key: string]: string;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      console.log('Fetching site settings...');
      const res = await fetch('/api/site-settings');
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log('Settings fetched successfully:', Object.keys(data).length, 'keys');
        setSettings(data);
      } else {
        console.error('Failed to fetch settings, status:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      console.log('Settings loading finished');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
