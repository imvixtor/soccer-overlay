import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Chuẩn hóa tên để hiển thị: viết hoa chữ cái đầu mỗi từ, viết thường phần còn lại. */
export function capitalizeName(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
