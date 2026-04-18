import { useEffect } from 'react';

export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('scroll-lock');
      // Also find the main scroll container and lock it
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.classList.add('scroll-lock');
      }
    } else {
      document.body.classList.remove('scroll-lock');
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.classList.remove('scroll-lock');
      }
    }

    return () => {
      document.body.classList.remove('scroll-lock');
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.classList.remove('scroll-lock');
      }
    };
  }, [isOpen]);
}
