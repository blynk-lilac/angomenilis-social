export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Notificações não suportadas');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions & { icon?: string }) => {
  if (Notification.permission === 'granted') {
    const notificationOptions = {
      icon: options?.icon || '/logo-192.png',
      badge: '/favicon.png',
      tag: 'blynk-notification',
      requireInteraction: false,
      ...options,
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, notificationOptions);
      });
    } else {
      new Notification(title, notificationOptions);
    }
  }
};
