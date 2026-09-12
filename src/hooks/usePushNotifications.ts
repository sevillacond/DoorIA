import { useState, useEffect } from 'react';

export interface PushNotificationConfig {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notificações Push não suportadas neste navegador.');
      return false;
    }

    try {
      setLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);
      const granted = perm === 'granted';
      setIsSubscribed(granted);

      if (granted) {
        // Envia confirmação ao backend
        await fetch('/api/v1/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'browser-native-pwa',
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
          }),
        }).catch(() => {});

        // Exibe notificação de boas-vindas
        triggerLocalNotification(
          'Portaria Enlace-DoorIA Ativa',
          'Notificações push habilitadas com sucesso! Você será avisado de visitas, encomendas e portões.',
          '/icon.svg'
        );
      }

      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão de push notification:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const triggerLocalNotification = (title: string, body: string, icon = '/icon.svg') => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon,
            badge: '/icon.svg',
            vibrate: [200, 100, 200, 100, 400],
            tag: 'enlace-door-alert',
            renotify: true,
          } as NotificationOptions);
        });
      } else {
        new Notification(title, {
          body,
          icon,
          badge: '/icon.svg',
        });
      }
      return true;
    } catch (e) {
      console.error('Falha ao disparar notificação local:', e);
      return false;
    }
  };

  const sendTestNotification = async (type: 'intercom' | 'package' | 'gate' = 'intercom') => {
    try {
      const res = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();

      if (permission === 'granted') {
        triggerLocalNotification(data.title, data.body, '/icon.svg');
      }
      return data;
    } catch (e) {
      console.error('Erro ao testar push notification:', e);
      // Fallback local se a API demorar
      triggerLocalNotification(
        '🔔 Chamada de Interfone: Portaria Social',
        'Visitante aguardando no XPE 3115-IP. Toque para atender via WebPhone.',
        '/icon.svg'
      );
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    requestPermission,
    triggerLocalNotification,
    sendTestNotification,
  };
}
