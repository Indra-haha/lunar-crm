import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="lunarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3122c6" />
      <stop offset="50%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#ede9fe" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f0069" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="512" height="512" rx="118" fill="url(#lunarGrad)" />
  
  <!-- Subtle Inner Border Highlight -->
  <rect x="6" y="6" width="500" height="500" rx="112" fill="none" stroke="rgba(255, 255, 255, 0.22)" stroke-width="8" />

  <!-- Emblem Group with Shadow -->
  <g filter="url(#softGlow)">
    <!-- Crescent Moon -->
    <path
      d="M 275 110 C 180 110 105 185 105 280 C 105 375 180 445 275 445 C 332 445 382 416 410 366 C 305 376 215 296 215 185 C 215 158 222 133 234 112 C 247 111 261 110 275 110 Z"
      fill="#ffffff"
    />

    <!-- Main Studio Sparkle Star -->
    <path
      d="M 345 130 Q 345 195 410 195 Q 345 195 345 260 Q 345 195 280 195 Q 345 195 345 130 Z"
      fill="url(#starGrad)"
    />

    <!-- Secondary Accent Sparkle -->
    <path
      d="M 395 305 Q 395 330 420 330 Q 395 330 395 355 Q 395 330 370 330 Q 395 330 395 305 Z"
      fill="#ffffff"
    />

    <!-- Micro Starlight Sparkle -->
    <circle cx="178" cy="165" r="9" fill="#ffffff" opacity="0.85" />
  </g>
</svg>`;

const FULL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">
  <defs>
    <linearGradient id="lunarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3122c6" />
      <stop offset="50%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#ede9fe" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f0069" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Icon Emblem (200x200 scale mapped into left 160x160 box) -->
  <g transform="translate(20, 20) scale(0.3125)">
    <rect width="512" height="512" rx="118" fill="url(#lunarGrad)" />
    <rect x="6" y="6" width="500" height="500" rx="112" fill="none" stroke="rgba(255, 255, 255, 0.22)" stroke-width="8" />
    <g filter="url(#softGlow)">
      <path
        d="M 275 110 C 180 110 105 185 105 280 C 105 375 180 445 275 445 C 332 445 382 416 410 366 C 305 376 215 296 215 185 C 215 158 222 133 234 112 C 247 111 261 110 275 110 Z"
        fill="#ffffff"
      />
      <path
        d="M 345 130 Q 345 195 410 195 Q 345 195 345 260 Q 345 195 280 195 Q 345 195 345 130 Z"
        fill="url(#starGrad)"
      />
      <path
        d="M 395 305 Q 395 330 420 330 Q 395 330 395 355 Q 395 330 370 330 Q 395 330 395 305 Z"
        fill="#ffffff"
      />
      <circle cx="178" cy="165" r="9" fill="#ffffff" opacity="0.85" />
    </g>
  </g>

  <!-- Typography -->
  <text x="210" y="102" font-family="Plus Jakarta Sans, Inter, sans-serif" font-size="52" font-weight="800" fill="#0f172a" letter-spacing="-1.5">Lunarchivve</text>
  <text x="212" y="136" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="#64748b" letter-spacing="2.5">MERCH &amp; STUDIO CRM</text>
</svg>`;

// Helper to assemble standard Windows .ico file with embedded PNGs
function buildIcoFile(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  const root = process.cwd();
  const appDir = path.join(root, 'app');
  const publicDir = path.join(root, 'public');

  console.log('Generating Lunarchivve icons and assets...');

  // 1. Write SVG icons
  fs.writeFileSync(path.join(appDir, 'icon.svg'), SVG_ICON, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), SVG_ICON, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'lunarchivve-icon.svg'), SVG_ICON, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'lunarchivve-logo.svg'), FULL_LOGO_SVG, 'utf8');

  // 2. Generate PNGs for various standard sizes
  const svgBuffer = Buffer.from(SVG_ICON);

  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  // 3. Apple Touch Icon & Android Chrome icons
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), png180);
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), png180);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

  // 4. Multi-resolution Favicon.ico
  const icoBuffer = buildIcoFile([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ]);

  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('✓ Successfully generated:');
  console.log('  - app/icon.svg (App Router scalable vector favicon)');
  console.log('  - app/favicon.ico (Multi-res 16/32/48px standard ICO)');
  console.log('  - app/apple-icon.png (180x180 Retina iOS icon)');
  console.log('  - public/icon.svg');
  console.log('  - public/favicon.ico');
  console.log('  - public/lunarchivve-icon.svg');
  console.log('  - public/lunarchivve-logo.svg');
  console.log('  - public/apple-icon.png');
}

main().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
