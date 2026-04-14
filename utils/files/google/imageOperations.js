const {
  optimizeImage,
  uploadToGCS,
  deleteFromGCS,
  getImageFilenameFromUrl,
  generateUniqueFilename,
  storage,
  bucketName
} = require('./gcs');

const {
  getImageHashFromBuffer,
  findImageByHash,
  createImageRegistry,
  addUsageToRegistry,
  removeUsageFromRegistry,
  deleteImageRegistry,
  ensureLegacyImageRegistered
} = require("../imageRegistry");

const isPdfBuffer = (buffer) => {
  return buffer && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
};

const uploadImageWithRegistry = async (imageBuffer, context) => {
  const { collection, documentId, fieldPath } = context;

  const { optimizedImageBuffer, imgFormat } = await optimizeImage(imageBuffer);
  const contentHash = getImageHashFromBuffer(optimizedImageBuffer);
  
  const existingImage = await findImageByHash(contentHash);
  if (existingImage) {
    await addUsageToRegistry(existingImage.imageId, collection, documentId, fieldPath);
    return existingImage.storageUrl;
  }

  const uniqueFilename = generateUniqueFilename(imgFormat);
  const imageUrl = await uploadToGCS(optimizedImageBuffer, uniqueFilename);

  try {
    await createImageRegistry(uniqueFilename, imageUrl, contentHash);
  } catch (error) {
    if (error.code === 11000) { 
      await deleteFromGCS(uniqueFilename); 
      const existingImage = await findImageByHash(contentHash);
      await addUsageToRegistry(existingImage.imageId, collection, documentId, fieldPath);
      return existingImage.storageUrl;
    }
    throw error;
  }

  await addUsageToRegistry(uniqueFilename, collection, documentId, fieldPath);
  return imageUrl;
};
const uploadPdfWithRegistry = async (pdfBuffer, context) => {
  const { collection, documentId, fieldPath } = context;

  const contentHash = getImageHashFromBuffer(pdfBuffer);

  const existingFile = await findImageByHash(contentHash);
  if (existingFile) {
    await addUsageToRegistry(existingFile.imageId, collection, documentId, fieldPath);
    return existingFile.storageUrl;
  }

  const uniqueFilename = generateUniqueFilename('pdf');
  const fileUrl = await uploadToGCS(pdfBuffer, uniqueFilename, 'application/pdf');

  try {
    await createImageRegistry(uniqueFilename, fileUrl, contentHash);
  } catch (error) {
    if (error.code === 11000) {
      await deleteFromGCS(uniqueFilename);
      const existingFile = await findImageByHash(contentHash);
      await addUsageToRegistry(existingFile.imageId, collection, documentId, fieldPath);
      return existingFile.storageUrl;
    }
    throw error;
  }

  await addUsageToRegistry(uniqueFilename, collection, documentId, fieldPath);
  return fileUrl;
};
const deleteImageWithRegistry = async (url, context) => {
  if (!url) return;

  const { collection, documentId, fieldPath } = context;
  const imageId = getImageFilenameFromUrl(url);
  
  if (!imageId) return;
  const registry = await removeUsageFromRegistry(imageId, collection, documentId, fieldPath);
  
  if (!registry) {
    return;
  }

  if (registry.usageCount === 0) {
    try {
      await storage.bucket(bucketName).file(imageId).delete();
    } catch (err) {
      console.warn(`GCS Delete Warning: ${err.message}`);
    }
    await deleteImageRegistry(imageId);
  }
};

const registerLegacyImage = async (url, context) => {
  if (!url) return null;
  const { collection, documentId, fieldPath } = context;
  return await ensureLegacyImageRegistered(url, collection, documentId, fieldPath);
};

const replaceImageWithRegistry = async (oldUrl, newBuffer, context) => {
  const newUrl = isPdfBuffer(newBuffer)
    ? await uploadPdfWithRegistry(newBuffer, context)
    : await uploadImageWithRegistry(newBuffer, context);
  if (oldUrl) {
    await deleteImageWithRegistry(oldUrl, context);
  }
  
  return newUrl;
};

module.exports = {
  uploadImageWithRegistry,
  deleteImageWithRegistry,
  registerLegacyImage,
  replaceImageWithRegistry,
  uploadPdfWithRegistry,
};