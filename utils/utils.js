const axios = require('axios');

require('dotenv').config();

const VIMEO_CACHE_TTL_MS = 10 * 60 * 1000;
const vimeoDetailsCache = new Map();

const getVimeoDetails = async (vimeoId) => {
  const cachedEntry = vimeoDetailsCache.get(vimeoId);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.data;
  }

  const vimeoUrl = `https://api.vimeo.com/videos/${vimeoId}`;
  const vimeoToken = process.env.VIMEO_ACCESS_TOKEN;

  const { data } = await axios.get(vimeoUrl, {
    headers: {
      Authorization: `Bearer ${vimeoToken}`,
    },
  });

  vimeoDetailsCache.set(vimeoId, {
    data,
    expiresAt: Date.now() + VIMEO_CACHE_TTL_MS,
  });
  return data;
}
  

const getSortInfo = (sortBy) => {
  const sortMap = {
    Popularity: { popularity: -1 },
    NameAtoZ: { title: 1 },
    NameZtoA: { title: -1 },
    NewestAdded: { createdAt: -1 },
    OldestAdded: { createdAt: 1 },
    LastViewed: { lastview: -1 },
  };
  return sortMap[sortBy] || { title: 1 };
};

module.exports = {
  getVimeoDetails,
  getSortInfo
};
