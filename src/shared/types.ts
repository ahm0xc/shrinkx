export type CompressionSettings = {
  image: ImageCompressionSettings
  video: VideoCompressionSettings
}

export type ImageCompressionSettings = {
  compressionQuality: number
  outputFormat: 'preserve' | 'png' | 'jpeg'
  removeInputFileAfterCompression: boolean
}

export type VideoCompressionSettings = {
  resolution: 'preserve' | '1920:1080' | '1280:720' | '854:480' | '640:360'
  compressionQuality: number
  speed: 'default' | 'superfast' | 'veryfast' | 'veryslow'
  removeInputFileAfterCompression: boolean
  removeAudio: boolean
}
