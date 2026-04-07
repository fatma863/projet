import { cn } from '../../lib/utils';

function initials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const hueFromString = (str) => {
  let h = 0;
  for (let i = 0; i < (str || '').length; i += 1) {
    h = (h + str.charCodeAt(i) * 13) % 360;
  }
  return h;
};

export function UserAvatar({
  name,
  src,
  size = 'md',
  className,
}) {
  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  };
  const hue = hueFromString(name || '');

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('rounded-full object-cover ring-2 ring-background', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-background shadow-sm',
        sizes[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 55%, 48%), hsl(${(hue + 40) % 360}, 50%, 42%))`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
