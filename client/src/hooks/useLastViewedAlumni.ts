import { useLastViewedStore } from '@/store/useLastViewedStore';

export function useLastViewedAlumni() {
  const { lastViewed, isLoaded, setLastViewed } = useLastViewedStore();
  
  const clearLastViewed = () => {
    localStorage.removeItem("lastViewedAlumni");
    useLastViewedStore.setState({ lastViewed: null });
  };
  
  return { 
    lastViewed, 
    setLastViewedAlumni: setLastViewed, 
    clearLastViewed,
    isLoaded 
  };
}