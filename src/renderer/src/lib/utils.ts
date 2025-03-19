import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(str: string, maxLength: number) {
  return str.length > maxLength ? str.substring(0, maxLength) + '..' : str
}

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()
}

export function getCleanFileName(fileName: string) {
  return fileName.split('.').slice(0, -1).join('.')
}

export function formatBytes(bytes: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1000, i)) + ' ' + sizes[i]
}

export async function validateLicenseKey(licenseKey: string) {
  const response = await window.api.validateLicenseKey(licenseKey)
  console.log('🚀 ~ validateLicenseKey ~ response:', response)
  return response
}
