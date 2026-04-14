const ImageRegistry = require("../../models/ImageRegistryModel");
const crypto = require('crypto');

const normalizeDocumentId = (documentId) => {
  if (!documentId) return null;
  return documentId.toString();
};

const getImageHashFromBuffer = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const findImageByHash = async (contentHash) => {
  return await ImageRegistry.findOne({ contentHash });
};

const getImageRegistry = async (imageId) => {
  return await ImageRegistry.findOne({ imageId });
};

const createImageRegistry = async (imageId, storageUrl, contentHash) => {
  const registry = new ImageRegistry({
    imageId,
    storageUrl,
    contentHash,
    usageCount: 0,
    usedBy: []
  });

  await registry.save();
  return registry;
};

const addUsageToRegistry = async (imageId, collectionName, documentId, fieldPath) => {
  const normalizedDocId = normalizeDocumentId(documentId);
  
  let languageKey = null;
  let cleanFieldPath = fieldPath;
  
  const translationMatch = fieldPath.match(/(.+Translations)\.(.+)/);
  if (translationMatch) {
    cleanFieldPath = translationMatch[1];
    languageKey = translationMatch[2];
  }
  
  await ImageRegistry.updateOne(
    { 
      imageId,
      usedBy: { 
        $not: { 
          $elemMatch: { 
            collectionName, 
            documentId: normalizedDocId,
            fieldPath: cleanFieldPath,
            languageKey: languageKey 
          } 
        } 
      }
    },
    { 
      $push: { 
        usedBy: {
          collectionName,
          documentId: normalizedDocId,
          fieldPath: cleanFieldPath,
          languageKey
        }
      } 
    }
  );

  const registry = await ImageRegistry.findOne({ imageId });
  if (registry) {
    if (registry.usageCount !== registry.usedBy.length) {
      registry.usageCount = registry.usedBy.length;
      await registry.save();
    }
    
  } 
};

const removeUsageFromRegistry = async (imageId, collectionName, documentId, fieldPath) => {
  const normalizedDocId = normalizeDocumentId(documentId);
  
  let languageKey = null;
  let cleanFieldPath = fieldPath;
  
  const translationMatch = fieldPath.match(/(.+Translations)\.(.+)/);
  if (translationMatch) {
    cleanFieldPath = translationMatch[1];
    languageKey = translationMatch[2];
  }
  
  const registry = await getImageRegistry(imageId);
  
  if (!registry) {
    return null; 
  }
  
  const usageIndex = registry.usedBy.findIndex(
    u => {
      return u.collectionName === collectionName &&
           normalizeDocumentId(u.documentId) === normalizedDocId &&
           u.fieldPath === cleanFieldPath &&
           (u.languageKey || null) === (languageKey || null);
    }
  );

  if (usageIndex === -1) {
    return registry;
  }
  registry.usedBy.splice(usageIndex, 1);
  registry.usageCount = Math.max(0, registry.usedBy.length);

  await registry.save();

  return registry;
};

const deleteImageRegistry = async (imageId) => {
  await ImageRegistry.findOneAndDelete({ imageId });
};

const ensureLegacyImageRegistered = async (imageUrl, collectionName, documentId, fieldPath) => {
  if (!imageUrl) return null;

  const imageId = imageUrl.split('/').pop();
  if (!imageId) return null;
  let registry = await getImageRegistry(imageId);
  if (!registry) {
    try {
      await createImageRegistry(imageId, imageUrl, null);
    } catch (error) {
      if (error.code === 11000) {
      } else {
        console.error(`Failed to register legacy image ${imageId}:`, error.message);
        return imageId;
      }
    }
  }
  await addUsageToRegistry(imageId, collectionName, documentId, fieldPath);
  
  return imageId;
};

const getImageIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
};

module.exports = {
  createImageRegistry,
  getImageRegistry,
  addUsageToRegistry,
  removeUsageFromRegistry,
  deleteImageRegistry,
  getImageHashFromBuffer,
  findImageByHash,
  ensureLegacyImageRegistered,
  getImageIdFromUrl,
};