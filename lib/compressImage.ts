/**
 * Compress an image for storage. Accepts up to 5MB input, outputs <1MB.
 * Same behavior as zine cover compression: max 800px, JPEG, iterative quality reduction.
 */
const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_OUTPUT_BYTES = 1024 * 1024 // 1MB
const MAX_DIMENSION = 800
const INITIAL_QUALITY = 0.8
const MIN_QUALITY = 0.5

export function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error('Image must be smaller than 5MB'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height * MAX_DIMENSION) / width
          width = MAX_DIMENSION
        } else {
          width = (width * MAX_DIMENSION) / height
          height = MAX_DIMENSION
        }
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      let quality = INITIAL_QUALITY

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            if (blob.size <= MAX_OUTPUT_BYTES || quality <= MIN_QUALITY) {
              resolve(
                new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
              )
            } else {
              quality = Math.max(MIN_QUALITY, quality - 0.1)
              tryCompress()
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryCompress()
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
