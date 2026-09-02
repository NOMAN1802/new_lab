import type { CSSProperties } from 'react';

/** The New Lab flask mark — an indigo tile, used in the sidebar and on sign-in. */
const LogoMark = ({ size = 34, style }: { size?: number; style?: CSSProperties }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        aria-hidden="true"
        style={{ display: 'block', flex: '0 0 auto', ...style }}
    >
        <rect width="32" height="32" rx="8" fill="#5C6CFF" />
        <path
            d="M13 6v7.6L8.4 22a2.6 2.6 0 0 0 2.25 3.9h10.7A2.6 2.6 0 0 0 23.6 22L19 13.6V6"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M11.4 6h9.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M10.6 18.4h10.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".65" />
    </svg>
);

export default LogoMark;
