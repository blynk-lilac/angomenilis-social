import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useContentProtection = () => {
  const location = useLocation();
  
  // Pages where download/copy IS allowed
  const allowedPaths = ['/chat'];
  const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    if (isAllowed) return;

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow right-click on text inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for saving/copying
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow in text inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Prevent Ctrl+S, Ctrl+C, Ctrl+U, F12
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        return false;
      }
    };

    // Disable copy
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      return false;
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault();
        return false;
      }
    };

    // Add CSS to prevent selection and drag
    const style = document.createElement('style');
    style.id = 'content-protection-style';
    style.textContent = `
      img, video, .protected-content {
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
        -webkit-touch-callout: none;
        pointer-events: auto;
      }
      
      /* Prevent long-press menu on mobile */
      img, video {
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
      
      const styleEl = document.getElementById('content-protection-style');
      if (styleEl) styleEl.remove();
    };
  }, [isAllowed, location.pathname]);
};
