const MAX_EDGE = 1920;
const DIRECT_LIMIT_BYTES = 450 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Не удалось прочитать файл"));
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Файл не является изображением"));
    image.src = src;
  });
}

export async function prepareBackgroundImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Выберите файл изображения (PNG, JPG, WebP)");
  }

  const rawDataUrl = await readAsDataUrl(file);
  if (file.size <= DIRECT_LIMIT_BYTES || file.type === "image/gif" || file.type === "image/svg+xml") {
    return rawDataUrl;
  }

  const image = await loadImage(rawDataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;

  ctx.drawImage(image, 0, 0, width, height);
  const webp = canvas.toDataURL("image/webp", 0.84);
  if (webp.startsWith("data:image/webp") && webp.length < rawDataUrl.length) {
    return webp;
  }
  const jpeg = canvas.toDataURL("image/jpeg", 0.84);
  return jpeg.length < rawDataUrl.length ? jpeg : rawDataUrl;
}
