import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const Icon = ({ children, size = 20, color, className, style, viewBox = '0 0 24 24' }: IconProps & { children: React.ReactNode; viewBox?: string }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    {children}
  </svg>
);

// --- Navigation / UI Icons ---
export const IconDashboard = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="10" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></Icon>
);

export const IconBarChart = (p: IconProps) => (
  <Icon {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>
);

export const IconInbox = (p: IconProps) => (
  <Icon {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Icon>
);

export const IconPenSquare = (p: IconProps) => (
  <Icon {...p}><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.375-9.375z" /></Icon>
);

export const IconImage = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Icon>
);

export const IconTarget = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>
);

export const IconLink = (p: IconProps) => (
  <Icon {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Icon>
);

export const IconLogOut = (p: IconProps) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>
);

export const IconZap = (p: IconProps) => (
  <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>
);

export const IconRefreshCw = (p: IconProps) => (
  <Icon {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>
);

export const IconCamera = (p: IconProps) => (
  <Icon {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></Icon>
);

export const IconFilm = (p: IconProps) => (
  <Icon {...p}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></Icon>
);

export const IconSave = (p: IconProps) => (
  <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></Icon>
);

export const IconSend = (p: IconProps) => (
  <Icon {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>
);

export const IconKey = (p: IconProps) => (
  <Icon {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>
);

export const IconCheckCircle = (p: IconProps) => (
  <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>
);

export const IconFileText = (p: IconProps) => (
  <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon>
);

export const IconHeart = (p: IconProps) => (
  <Icon {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Icon>
);

export const IconMessageCircle = (p: IconProps) => (
  <Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Icon>
);

export const IconShare = (p: IconProps) => (
  <Icon {...p}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Icon>
);

export const IconRadio = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></Icon>
);

export const IconActivity = (p: IconProps) => (
  <Icon {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>
);

export const IconUserPlus = (p: IconProps) => (
  <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></Icon>
);

export const IconMousePointer = (p: IconProps) => (
  <Icon {...p}><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></Icon>
);

export const IconGlobe = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}><polyline points="15 18 9 12 15 6" /></Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}><polyline points="9 18 15 12 9 6" /></Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></Icon>
);

export const IconTrophy = (p: IconProps) => (
  <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>
);

export const IconRocket = (p: IconProps) => (
  <Icon {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></Icon>
);

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" /></Icon>
);

export const IconLayers = (p: IconProps) => (
  <Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Icon>
);

export const IconTrendingUp = (p: IconProps) => (
  <Icon {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>
);

// --- Platform Icons (filled, no stroke) ---
export const IconFacebook = ({ size = 20, color = '#1877f2', className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} style={style}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const IconTwitter = ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} style={style}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const IconLinkedin = ({ size = 20, color = '#0a66c2', className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} style={style}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const IconBluesky = ({ size = 20, color = '#0085ff', className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 568 501" fill={color} className={className} style={style}>
    <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 72.4712C568 94.5618 555.803 226.059 549.334 250.153C531.468 318.632 463.641 336.403 398.533 332.304C512.198 350.867 540.233 413.179 473.167 475.477C417.533 527.389 370.818 508.123 301.671 408.221L284 381.186L266.329 408.221C197.182 508.123 150.467 527.389 94.8327 475.477C27.7672 413.179 55.8015 350.867 169.467 332.304C104.359 336.403 36.5323 318.632 18.6659 250.153C12.1969 226.059 0 94.5618 0 72.4712C0 -28.9064 76.1339 -1.61183 123.121 33.6637Z" />
  </svg>
);

export const IconThreads = ({ size = 20, color = 'currentColor', className, style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 192 192" fill={color} className={className} style={style}>
    <path d="M141.537 88.988a66.146 66.146 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.142c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.08c8.248.053 14.473 2.452 18.502 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.78-23.66-1.592-23.62.528-38.792 15.163-37.79 36.528.502 11.225 5.873 20.769 15.134 26.873 7.973 5.262 18.263 7.963 28.955 7.611 14.095-.456 25.134-5.451 32.792-14.836 5.802-7.106 9.505-16.298 11.137-27.695 6.674 4.028 11.633 9.336 14.445 15.887 4.788 11.16 5.072 29.517-8.6 43.122-11.97 11.92-26.359 17.071-52.594 17.24-29.076-.19-51.095-9.533-65.431-27.773C13.935 133.296 6.997 110.75 6.795 83.5c.2-27.25 7.138-49.796 20.606-66.976C41.74 -1.467 63.76-10.81 92.835-11 122.12-10.812 144.37-1.44 158.703 17.14c7.087 9.193 12.489 20.635 16.21 34.294l-16.196 4.304c-3.135-11.526-7.798-20.998-13.917-28.282-13.49-16.05-33.265-24.23-58.8-24.377-25.394.143-44.827 7.832-57.756 22.837C116.03 38.49 109.72 56.728 109.5 83.5c.223 26.773 6.534 45.01 18.745 54.283 12.93 9.813 30.012 14.127 50.627 12.87-3.075 21.21-14.553 33.263-34.19 36.5C155.907 189.284 165.71 185 177.16 173.682c13.672-13.605 13.408-29.859 8.62-41.02-3.189-7.432-9.07-13.593-17.3-18.1-.386-.217-.776-.423-1.157-.623a18.016 18.016 0 0 0-1.557-.794c-.52-.253-1.03-.478-1.543-.706zM100.885 139.63c-12.33.609-27.229-4.754-27.724-22.211-.36-12.13 8.607-21.389 25.265-21.818 1.8-.047 3.584-.023 5.353.023 5.98.131 11.62.675 16.862 1.605-1.857 27.707-10.356 40.89-19.756 42.401z" />
  </svg>
);

// Utility: get platform icon component
export const PlatformIcon = ({ platform, size = 20 }: { platform: string; size?: number }) => {
  switch (platform) {
    case 'FACEBOOK': return <IconFacebook size={size} />;
    case 'TWITTER': return <IconTwitter size={size} />;
    case 'LINKEDIN': return <IconLinkedin size={size} />;
    case 'BLUESKY': return <IconBluesky size={size} />;
    case 'THREADS': return <IconThreads size={size} />;
    default: return <IconGlobe size={size} />;
  }
};

// --- Skeleton Loading ---
export const Skeleton = ({ width, height, radius = 8, style }: { width?: string | number; height?: string | number; radius?: number; style?: React.CSSProperties }) => (
  <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
);

export const SkeletonCard = ({ lines = 3 }: { lines?: number }) => (
  <div className="card skeleton-card">
    <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={12} style={{ marginBottom: 8 }} />
    ))}
  </div>
);
