import { Dependency } from './types'

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif']
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm']
export const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]

export const DEPENDENCIES: Dependency[] = [
  {
    name: 'ffmpeg',
    url: 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-macos-64.zip',
    size: 25,
    executable: true
  },
  {
    name: 'ffprobe',
    url: 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffprobe-6.1-macos-64.zip',
    size: 25,
    executable: true
  }
]
