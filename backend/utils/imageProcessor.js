const sharp = require('sharp');

const resizeToBuffer = async (buffer, opts = { width: 1200 }) => {
  return await sharp(buffer)
    .rotate()
    .resize({ width: opts.width, withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
};

module.exports = { resizeToBuffer };
