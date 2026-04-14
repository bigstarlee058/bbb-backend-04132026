const ImageRegistry = require("../models/ImageRegistryModel");

const renameLanguageKeyInRegistry = async (oldKey, newKey) => {
  const result = await ImageRegistry.updateMany(
    { 'usedBy.languageKey': oldKey },
    { $set: { 'usedBy.$[elem].languageKey': newKey } },
    { arrayFilters: [{ 'elem.languageKey': oldKey }] }
  );
  return result;
};

const removeLanguageKeyFromRegistry = async (langKey) => {
  const registries = await ImageRegistry.find({ 'usedBy.languageKey': langKey });
  
  let deletedCount = 0;
  let updatedCount = 0;

  for (const registry of registries) {
    const originalLength = registry.usedBy.length;
    registry.usedBy = registry.usedBy.filter(u => u.languageKey !== langKey);
    registry.usageCount = registry.usedBy.length;
    
    if (registry.usageCount === 0) {
      await registry.deleteOne();
      deletedCount++;
    } else if (registry.usedBy.length !== originalLength) {
      await registry.save();
      updatedCount++;
    }
  }
  
};

module.exports = {
  renameLanguageKeyInRegistry,
  removeLanguageKeyFromRegistry
};