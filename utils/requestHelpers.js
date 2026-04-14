const parseJSONFields = (data, fieldsToSkip = []) => {
  Object.keys(data).forEach(key => {
    if (fieldsToSkip.includes(key)) return;
    
    if (key.endsWith('Translations') && data[key]) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        return;
      }
      if (typeof data[key] === 'string' && data[key] !== '[object Object]') {
        try {
          data[key] = JSON.parse(data[key]);
        } catch (e) {
          data[key] = {};
        }
      } else {
        data[key] = {};
      }
    }
  });
};

const parseArrayOrObjectField = (data, fieldName, defaultValue = null) => {
  if (data[fieldName] && typeof data[fieldName] === 'string') {
    try {
      data[fieldName] = JSON.parse(data[fieldName]);
    } catch (e) {
      data[fieldName] = defaultValue;
    }
  }
};

const cleanupImageFields = (data) => {
  delete data.deleteImage;
  delete data.deleteImageTranslations;
};

module.exports = {
  parseJSONFields,
  parseArrayOrObjectField,
  cleanupImageFields
};