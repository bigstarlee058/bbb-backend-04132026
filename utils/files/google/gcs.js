const { Storage } = require("@google-cloud/storage");

const sharp = require("sharp");
const imageSize = require("image-size");

const {
  ALLOWED_IMAGE_FORMATS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_WIDTH,
} = require("../../enum/image");

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

// Initialize GCS client with your service account credentials
const storage = new Storage({
  keyFilename: "./utils/files/google/bbb-app-d4b41-8bb202309cf1.json", // Replace with the path to your JSON key file
  projectId,
});

const getImageFilenameFromUrl = (url) => {
  const parts = url.split("/");
  return parts[parts.length - 1];
};

const optimizeImage = async (imageBuffer) => {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  

  const currentWidth = metadata.width || MAX_IMAGE_WIDTH;
  const newHeight = Math.floor((MAX_IMAGE_WIDTH / currentWidth) * metadata.height);

  const optimizedImageBuffer = await image
    .resize({ width: MAX_IMAGE_WIDTH, height: newHeight })
    .png({ quality: 80 })
    .toBuffer();

  const dimensions = imageSize(optimizedImageBuffer);
  const imgFormat = dimensions.type.toLowerCase();

  if (!ALLOWED_IMAGE_FORMATS.includes(imgFormat)) {
    throw new Error("Invalid image format");
  }

  if (optimizedImageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image size exceeds the maximum allowed size");
  }

  return { optimizedImageBuffer, imgFormat };
};

const uploadToGCS = async (buffer, filename) => {
  await storage.bucket(bucketName).file(filename).save(buffer);
  return `https://storage.cloud.google.com/${bucketName}/${filename}`;
};

const deleteFromGCS = async (filename) => {
  await storage.bucket(bucketName).file(filename).delete();
};

const generateUniqueFilename = (format) => {
  return `${Date.now()}_${Math.floor(Math.random() * 1000)}.${format}`;
};
const uploadImage = async (buffer) => {
  try {
    const { optimizedImageBuffer, imgFormat } = await optimizeImage(buffer);
    const filename = generateUniqueFilename(imgFormat);
    const url = await uploadToGCS(optimizedImageBuffer, filename);
    return url;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  optimizeImage,
  uploadToGCS,
  deleteFromGCS,
  getImageFilenameFromUrl,
  generateUniqueFilename,
  uploadImage,
  storage,
  bucketName
};
