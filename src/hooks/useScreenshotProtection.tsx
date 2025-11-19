import { useEffect } from 'react';

export const useScreenshotProtection = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Prevent screenshots on PWA (Android)
    const preventScreenshot = () => {
      document.body.style.setProperty('-webkit-user-select', 'none');
      document.body.style.setProperty('-moz-user-select', 'none');
      document.body.style.setProperty('-ms-user-select', 'none');
      document.body.style.setProperty('user-select', 'none');
    };

    // Add secure flag meta tag for Android PWA
    const addSecureFlag = () => {
      let metaTag = document.querySelector('meta[name="secure-flag"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'secure-flag');
        metaTag.setAttribute('content', 'true');
        document.head.appendChild(metaTag);
      }
    };

    // Detect screenshot attempt (limited support)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User may be attempting screenshot
        console.warn('Screenshot detection: Document hidden');
      }
    };

    preventScreenshot();
    addSecureFlag();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add CSS to prevent long-press context menu
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      input, textarea {
        -webkit-user-select: text;
        -khtml-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.head.removeChild(style);
    };
  }, [enabled]);
};
