import type { SVGProps } from "react";

/**
 * Custom Instagram icon to replace the removed lucide-react brand icon.
 * Accepts the same props as lucide-react icons (className, etc).
 */
export function Instagram(props: SVGProps<SVGSVGElement> & { size?: number | string }) {
  const { size, width, height, ...rest } = props;
  const w = size ?? width ?? 24;
  const h = size ?? height ?? 24;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default Instagram;
