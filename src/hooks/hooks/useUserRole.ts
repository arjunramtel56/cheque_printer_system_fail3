import { useState, useEffect } from 'react';

export type UserRole = 'admin' | 'user' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored role/token in localStorage
    const storedRole = localStorage.getItem('userRole') as UserRole | null;
    const token = localStorage.getItem('authToken');
    
    if (token && storedRole) {
      setRole(storedRole);
    } else {
      setRole(null);
    }
    
    setIsLoading(false);
  }, []);

  const login = (userRole: UserRole, token: string) => {
    localStorage.setItem('userRole', userRole ?? '');
    localStorage.setItem('authToken', token);
    setRole(userRole);
  };

  const logout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    setRole(null);
  };

  return { role, isLoading, login, logout };
}

