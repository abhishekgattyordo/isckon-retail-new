/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ERPProvider } from '@/context/ERPContext';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import CatchAllPageClient from '@/components/CatchAllPageClient';

export default function App() {
  return (
    <ERPProvider>
      <LayoutWrapper>
        <CatchAllPageClient />
      </LayoutWrapper>
    </ERPProvider>
  );
}
