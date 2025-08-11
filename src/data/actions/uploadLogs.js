import fs from 'fs'
import glob from 'tiny-glob'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_AUTOMATION_BUCKET,
} from '#config'
import { logger } from '#utils'

const fileTypeMap = {
  // html: "text/html",
  // js: "text/javascript",
  // css: "text/css",
  // json: "application/json",
  png: 'image/png',
  jpg: 'image/jpeg',
  // jpeg: "image/jpeg",
  // gif: "image/gif",
  // svg: "image/svg+xml",
  // pdf: "application/pdf",
  // doc: "application/msword",
  // docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // ppt: "application/vnd.ms-powerpoint",
  // pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // xls: "application/vnd.ms-excel",
  // xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // zip: "application/zip",
  // exe: "application/x-msdownload",
  log: 'text/plain',
}

async function uploadFile(s3Client, stream, type, destPath) {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_AUTOMATION_BUCKET,
      Key: destPath,
      Body: stream,
      ContentType: type,
    },
  })

  upload.on('httpUploadProgress', progress => {
    logger.info(`Upload Progress: ${progress.loaded} / ${progress.total}`)
  })

  await upload.done()
  logger.info(`Upload completed: ${destPath}`)
}

export async function uploadLogs(local, destDir) {
  // Check if AWS credentials are configured
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    logger.info('AWS credentials not configured, skipping S3 upload');
    return [];
  }
  
  const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  })

  const files = await glob(`${local}/**/*`, { filesOnly: true })
  const publicUrls = []
  for (const file of files) {
    const stream = fs.createReadStream(file)
    const type = fileTypeMap[file.split('.').pop()]
    const destPath = file.replace(local, destDir)

    await uploadFile(s3Client, stream, type, destPath)
    const publicUrl = `https://${S3_AUTOMATION_BUCKET}.s3.amazonaws.com/${destPath}`
    publicUrls.push(publicUrl)
  }

  logger.info(`Upload data is done.`)
  return publicUrls
}
