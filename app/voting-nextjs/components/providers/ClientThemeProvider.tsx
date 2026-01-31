'use client';

import dynamic from 'next/dynamic';

const ClientThemeProvider = dynamic(
  () =>
    import('./ThemeProvider').then((m) => m.ThemeProvider),
  { ssr: false }
);

export default ClientThemeProvider;
