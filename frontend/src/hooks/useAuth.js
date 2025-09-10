import { useState, useCallback } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';

export default function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cc_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((token, profile) => {
    localStorage.setItem('cc_token', token);
    localStorage.setItem('cc_user', JSON.stringify(profile));
    setUser(profile);
    connectSocket();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    setUser(null);
    disconnectSocket();
  }, []);

  return { user, login, logout, setUser };
}
