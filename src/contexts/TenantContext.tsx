'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Tenant } from '@/types/service';

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({ 
  children, 
  tenant 
}: { 
  children: ReactNode;
  tenant: Tenant;
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return tenant;
} 