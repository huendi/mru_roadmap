import { v2 as cloudinary } from 'cloudinary'

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  fileName: string
) => {
  // Config called at runtime so env vars are always available
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  // Use the original fileName as the Cloudinary public_id
  // so it matches what is displayed in the exam history list
  const cleanName = fileName.replace(/\s+/g, '_').replace(/\.docx$/i, '')

  return await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // for docx
        folder: 'question_uploads',
        public_id: cleanName,
        overwrite: true, // replace if same name is re-uploaded
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )

    stream.end(buffer)
  })
}