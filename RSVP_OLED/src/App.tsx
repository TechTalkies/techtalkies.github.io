/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Converter from './components/Converter';

export default function App() {
  return (
    <main className="w-full min-h-screen bg-black text-white selection:bg-blue-500/30">
      <Converter />
    </main>
  );
}
