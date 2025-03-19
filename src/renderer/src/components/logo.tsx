import React from 'react'

import { cn } from '@renderer/lib/utils'

type LogoProps = React.ComponentPropsWithoutRef<'svg'>

export default function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <g clipPath="url(#clip0_231_793)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M50 0H200V50V150L150 200L150 50H0L50 0ZM0 165.067V100L65.067 100L0 165.067ZM100 200H35.7777L100 135.778L100 200Z"
          fill="url(#paint0_linear_231_793)"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_231_793"
          x1={177}
          y1="-9.23648e-06"
          x2="39.5"
          y2="152.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#15803d" /> <stop offset={1} stopColor="#4ade80" />{' '}
        </linearGradient>
        <clipPath id="clip0_231_793">
          <rect width={200} height={200} fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
