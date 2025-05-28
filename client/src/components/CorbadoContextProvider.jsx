import React from 'react';
import { CorbadoProvider } from '@corbado/react';

const projectId = import.meta.env.VITE_REACT_APP_CORBADO_PROJECT_ID;

export const CorbadoContextProvider = ({ children }) => {
  return (
    <CorbadoProvider projectId={projectId} darkMode="off">
      {children}
    </CorbadoProvider>
  );
};