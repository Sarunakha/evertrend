import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const buildDummySizeChart = (baseChest, baseWaist, baseShoulder = 43) => ({
  S: {
    chest: baseChest - 4,
    waist: baseWaist - 4,
    shoulder: baseShoulder - 2,
    shoulderWidth: baseShoulder - 2
  },
  M: {
    chest: baseChest,
    waist: baseWaist,
    shoulder: baseShoulder,
    shoulderWidth: baseShoulder
  },
  L: {
    chest: baseChest + 4,
    waist: baseWaist + 4,
    shoulder: baseShoulder + 2,
    shoulderWidth: baseShoulder + 2
  },
  XL: {
    chest: baseChest + 8,
    waist: baseWaist + 8,
    shoulder: baseShoulder + 4,
    shoulderWidth: baseShoulder + 4
  }
});

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  let updated = 0;

  for (const p of products) {
    let changed = false;

    if (!p.sizeChart) {
      // Use available dimensions as a base where possible
      const chestBase = typeof p.dimensions?.chest === 'number' ? p.dimensions.chest : 96;
      const shoulderBase = typeof p.dimensions?.shoulder === 'number' ? p.dimensions.shoulder : 43;
      const waistBase = Math.max(70, chestBase - 12);
      p.sizeChart = buildDummySizeChart(chestBase, waistBase, shoulderBase);
      changed = true;
    }

    if (!p.vtoImage && Array.isArray(p.images) && p.images.length > 0) {
      // Temporary testing fallback: use first product image as overlay source
      p.vtoImage = p.images[0];
      changed = true;
    }

    if (changed) {
      await p.save();
      updated += 1;
      console.log(`Patched product: ${p._id} (${p.name})`);
    }
  }

  console.log(`Done. Updated ${updated} product(s).`);
  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Patch script failed:', err.message);
    process.exit(1);
  });

