
'use client';

import TrpgPage from '@/app/trpg/page';
import PlaylogPage from '@/app/playlog/page';

export default function TrpgHomePage() {
  return (
    <div className="trpg-hub">
      <div className="trpg-hub-card">
        <TrpgPage />
      </div>

      <div className="trpg-hub-card">
        <PlaylogPage />
      </div>
    </div>
  );
}
