/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from 'react';

type FocusLevel = 'nav' | 'tabs' | 'timeline' | 'workHistory' | 'contactCards';

interface KeyboardFocusContextType {
  focusLevel: FocusLevel;
  setFocusLevel: (level: FocusLevel) => void;
}

const KeyboardFocusContext = createContext<KeyboardFocusContextType>({
  focusLevel: 'nav',
  setFocusLevel: () => {},
});

export const KeyboardFocusProvider = ({ children }: { children: ReactNode }) => {
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('nav');

  return (
    <KeyboardFocusContext.Provider value={{ focusLevel, setFocusLevel }}>
      {children}
    </KeyboardFocusContext.Provider>
  );
};

export const useKeyboardFocus = () => useContext(KeyboardFocusContext);
