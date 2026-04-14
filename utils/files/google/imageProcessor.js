const {
  deleteImageWithRegistry,
  registerLegacyImage,
  replaceImageWithRegistry
} = require('./imageOperations');

const processMainImage = async (fieldName, context) => {
  const { req, existingDoc } = context;
  
  const currentUrl = existingDoc?.[fieldName];
  const newFile = req.files?.find(file => file.fieldname === fieldName);
  const deleteFlag = req.body[`delete${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`];

  if (newFile?.buffer) {
    const newUrl = await replaceImageWithRegistry(
      currentUrl,
      newFile.buffer,
      {
        ...context,
        fieldPath: fieldName
      }
    );
    return newUrl;
  }
  if (deleteFlag === 'true' && currentUrl) {
    await deleteImageWithRegistry(currentUrl, {
      ...context,
      fieldPath: fieldName
    });
    return '';
  }
  if (currentUrl) {
    await registerLegacyImage(currentUrl, {
      ...context,
      fieldPath: fieldName
    });
  }
  
  return currentUrl || '';
};

const processImageTranslations = async (fieldName, context) => {
  const { req, existingDoc } = context;
  const translationsFieldName = `${fieldName}Translations`;

  let currentTranslations = existingDoc?.[translationsFieldName] || {};
  if (currentTranslations instanceof Map) {
    currentTranslations = Object.fromEntries(currentTranslations);
  }

  const translationsData = req.body[translationsFieldName];
  const deleteTranslationsData = req.body[`delete${translationsFieldName.charAt(0).toUpperCase() + translationsFieldName.slice(1)}`];

  const imgTrans = translationsData
    ? (typeof translationsData === 'string' ? JSON.parse(translationsData) : translationsData)
    : {};

  const updatedTranslations = {};
  const selectedLanguages = Object.keys(imgTrans);
  for (const [lang, oldUrl] of Object.entries(currentTranslations)) {
    if (!selectedLanguages.includes(lang) && oldUrl) {
      await deleteImageWithRegistry(oldUrl, {
        ...context,
        fieldPath: `${translationsFieldName}.${lang}`
      });
    }
  }
  for (const [lang, value] of Object.entries(imgTrans)) {
    const langImageFile = req.files?.find(
      file => file.fieldname === `${translationsFieldName}[${lang}]`
    );

    if (langImageFile?.buffer) {
      const uploadedUrl = await replaceImageWithRegistry(
        currentTranslations[lang],
        langImageFile.buffer,
        {
          ...context,
          fieldPath: `${translationsFieldName}.${lang}`
        }
      );
      updatedTranslations[lang] = uploadedUrl;
    } 
    else if (typeof value === 'string' && value.trim() && value !== 'FILE' && value !== 'FILE_UPLOAD') {
      await registerLegacyImage(value, {
        ...context,
        fieldPath: `${translationsFieldName}.${lang}`
      });
      updatedTranslations[lang] = value;
    }
  }

  if (deleteTranslationsData) {
    let parsedDeleteKeys = [];

    if (typeof deleteTranslationsData === 'string') {
      try {
        parsedDeleteKeys = JSON.parse(deleteTranslationsData);
      } catch (_) {
        parsedDeleteKeys = [];
      }
    } else if (Array.isArray(deleteTranslationsData)) {
      parsedDeleteKeys = deleteTranslationsData;
    }

    if (Array.isArray(parsedDeleteKeys)) {
      for (const langKey of parsedDeleteKeys) {
        if (updatedTranslations[langKey]) {
          await deleteImageWithRegistry(updatedTranslations[langKey], {
            ...context,
            fieldPath: `${translationsFieldName}.${langKey}`
          });
          delete updatedTranslations[langKey];
        }
      }
    }
  }

  return updatedTranslations;
};

const processSingleImageField = async (fieldName, context) => {
  const mainImageUrl = await processMainImage(fieldName, context);
  const translations = await processImageTranslations(fieldName, context);

  return {
    [fieldName]: mainImageUrl,
    [`${fieldName}Translations`]: translations
  };
};

const processImageFields = async ({ req, collection, documentId, existingDoc, imageFields }) => {
  const context = { req, collection, documentId, existingDoc };
  const result = {};

  for (const fieldName of imageFields) {
    const fieldResult = await processSingleImageField(fieldName, context);
    Object.assign(result, fieldResult);
  }

  return result;
};

module.exports = {
  processImageFields
};