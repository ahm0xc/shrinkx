import { Dependency } from './types'

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif']
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm']
export const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]

export const DEPENDENCIES: Dependency[] = [
  {
    name: 'ffmpeg',
    url: 'https://5kkscs4luj.ufs.sh/f/yWO233OZgnAQiSfUk4wjskNLOTC4xcGAIFdyqgEHvhznbl0B',
    size: 25,
    executable: true
  },
  {
    name: 'ffprobe',
    url: 'https://5kkscs4luj.ufs.sh/f/yWO233OZgnAQOvzW2Hl2DpTC0GWm7R6jZQFgAlb8O9ufk1EN',
    size: 25,
    executable: true
  }
]
