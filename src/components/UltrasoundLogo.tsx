import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const UltrasoundLogo: React.FC<LogoProps> = ({ className = "text-[#2A9D9D]", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      id="medi-sync-logo"
    >
      {/* Outer Circular frame */}
      <circle 
        cx="250" 
        cy="250" 
        r="230" 
        stroke="currentColor" 
        strokeWidth="22" 
        fill="none" 
      />
      
      {/* Smooth continuous cable path linking the probe back to the circle boundary */}
      <path 
        d="M 165 200 C 70 160, 50 330, 120 370 C 150 387, 185 375, 185 345 C 185 315, 145 305, 120 280 C 95 255, 90 200, 160 185" 
        stroke="currentColor" 
        strokeWidth="20" 
        strokeLinecap="round" 
        fill="none" 
      />

      {/* Ultrasound Transducer Probe tilted in the center */}
      <g transform="translate(245, 230) rotate(-35)">
        {/* Back handle body of the probe */}
        <path 
          d="M -115 -25 L -45 -25 C -40 -25, -35 -20, -32 -12 L -20 15 C -18 20, -22 25, -28 25 L -115 25 C -122 25, -125 15, -125 5 L -125 -5 C -125 -15, -122 -25, -115 -25 Z" 
          fill="currentColor" 
        />
        {/* Front active head of the probe */}
        <path 
          d="M -25 -25 L 20 -40 C 30 -43, 40 -35, 42 -25 L 55 -5 C 60 5, 60 15, 55 25 L 42 45 C 40 55, 30 63, 20 60 L -25 45 C -20 35, -18 15, -18 -5 C -18 -15, -20 -20, -25 -25 Z" 
          fill="currentColor" 
        />
        {/* Curved front emitting face */}
        <path 
          d="M 45 -22 C 60 -10, 60 30, 45 42 C 43 32, 43 -12, 45 -22 Z" 
          fill="currentColor" 
          opacity="0.9"
        />
        {/* Probe detail accent lines */}
        <rect x="-105" y="-12" width="45" height="24" rx="4" fill="#0F172A" opacity="0.15" />
      </g>

      {/* Acoustical Waves (4 radiating arcs corresponding to ultrasound waves) */}
      {/* Wave 1 */}
      <path 
        d="M 355 200 A 100 100 0 0 1 355 300" 
        stroke="currentColor" 
        strokeWidth="16" 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* Wave 2 */}
      <path 
        d="M 378 180 A 130 130 0 0 1 378 320" 
        stroke="currentColor" 
        strokeWidth="16" 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* Wave 3 */}
      <path 
        d="M 401 160 A 160 160 0 0 1 401 340" 
        stroke="currentColor" 
        strokeWidth="16" 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* Wave 4 */}
      <path 
        d="M 424 140 A 190 190 0 0 1 424 360" 
        stroke="currentColor" 
        strokeWidth="16" 
        strokeLinecap="round" 
        fill="none" 
      />
    </svg>
  );
};
