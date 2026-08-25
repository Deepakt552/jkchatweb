import React from 'react';

interface LiquidReactionBarProps {
    onSelectEmoji: (emoji: string) => void;
    isDark: boolean;
}

const POPULAR_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

export const LiquidReactionBar: React.FC<LiquidReactionBarProps> = ({
    onSelectEmoji,
    isDark,
}) => {
    return (
        <div
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border shadow-xl backdrop-blur-xl animate-in zoom-in-95 duration-150 select-none ${
                isDark
                    ? 'bg-[#151F30]/90 border-white/15 shadow-black/60'
                    : 'bg-white/95 border-neutral-200/80 shadow-neutral-400/20'
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            {POPULAR_REACTIONS.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectEmoji(emoji);
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-lg hover:scale-130 active:scale-95 transition-transform duration-150 cursor-pointer hover:bg-white/10"
                    title={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};
