import { useEffect, useState } from 'react';

let isLoadingGlobal = false;
let isLoadedGlobal = false;

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(isLoadedGlobal);

  useEffect(() => {
    if (window.google?.maps || isLoadedGlobal) {
      setIsLoaded(true);
      isLoadedGlobal = true;
      return;
    }

    if (isLoadingGlobal) {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          isLoadedGlobal = true;
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
      return;
    }

    console.log('Loading Google Maps API...');

    isLoadingGlobal = true;

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
      isLoadedGlobal = true;
      isLoadingGlobal = false;
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      isLoadingGlobal = false;
    };

    document.head.appendChild(script);
  }, []);

  return { isLoaded, isLoading: isLoadingGlobal };
}
