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

export const showMessageNotification = async (
  senderName: string,
  messageContent: string,
  senderAvatar?: string,
  senderId?: string
) => {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const preview = messageContent.length > 80 
    ? messageContent.substring(0, 77) + '...' 
    : messageContent;

  showNotification(senderName, {
    body: preview,
    icon: senderAvatar || '/logo-192.png',
  });
};
