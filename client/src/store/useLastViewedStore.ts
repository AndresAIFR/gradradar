import { create } from 'zustand';

interface LastViewedAlumni {
  id: number;
  name: string;
  cohortYear: number;
}

interface LastViewedState {
  lastViewed: LastViewedAlumni | null;
  isLoaded: boolean;
  setLastViewed: (alumni: LastViewedAlumni) => void;
}

export const useLastViewedStore = create<LastViewedState>((set, get) => ({
  lastViewed: null,
  isLoaded: false,
  
  setLastViewed: (alumni: LastViewedAlumni) => {
    localStorage.setItem('lastViewedAlumni', JSON.stringify(alumni));
    set({ lastViewed: alumni });
  },
}));

// Initialize from localStorage on app start
const initializeFromStorage = () => {
  const saved = localStorage.getItem('lastViewedAlumni');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      useLastViewedStore.setState({ lastViewed: parsed, isLoaded: true });
    } catch (error) {

      localStorage.removeItem('lastViewedAlumni');
      useLastViewedStore.setState({ isLoaded: true });
    }
  } else {
    useLastViewedStore.setState({ isLoaded: true });
  }
};

// Initialize on module load
initializeFromStorage();