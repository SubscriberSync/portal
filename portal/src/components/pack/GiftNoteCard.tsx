'use client';

interface GiftNoteCardProps {
  note: string;
}

export function GiftNoteCard({ note }: GiftNoteCardProps) {
  if (!note) return null;

  return (
    <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎁</span>
        <span className="font-semibold text-pink-800">GIFT NOTE</span>
      </div>
      <p className="text-pink-700 italic">&ldquo;{note}&rdquo;</p>
    </div>
  );
}
