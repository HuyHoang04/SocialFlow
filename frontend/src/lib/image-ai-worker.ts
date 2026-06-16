import { env, AutoModel, AutoProcessor, RawImage, DepthAnythingForDepthEstimation } from '@huggingface/transformers';

// Skip local model check since we are downloading from HF hub
env.allowLocalModels = false;

// Web worker message interface
interface WorkerMessage {
  id: string;
  action: 'removeBackground' | 'detectDepth' | 'upscale' | 'caption';
  imageUrl: string;
}

class AIModels {
  static rmbgModel: any = null;
  static rmbgProcessor: any = null;
  
  static depthModel: any = null;
  static depthProcessor: any = null;

  static captionModel: any = null;
  static captionProcessor: any = null;

  static async getRMBG() {
    if (!this.rmbgModel) {
      postMessage({ status: 'progress', message: 'Loading RMBG model (40MB)...' });
      this.rmbgModel = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
        // @ts-ignore
        config: { model_type: 'custom' },
      });
      this.rmbgProcessor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
        // @ts-ignore
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        }
      });
    }
    return { model: this.rmbgModel, processor: this.rmbgProcessor };
  }

  static async getDepth() {
    if (!this.depthModel) {
      postMessage({ status: 'progress', message: 'Loading Depth model (25MB)...' });
      this.depthModel = await DepthAnythingForDepthEstimation.from_pretrained('Xenova/depth-anything-small-hf');
      this.depthProcessor = await AutoProcessor.from_pretrained('Xenova/depth-anything-small-hf');
    }
    return { model: this.depthModel, processor: this.depthProcessor };
  }
}

async function removeBackground(imageUrl: string) {
  const { model, processor } = await AIModels.getRMBG();
  postMessage({ status: 'progress', message: 'Processing image...' });

  const image = await RawImage.fromURL(imageUrl);
  const inputs = await processor(image);
  
  // The RMBG model expects an input named "input", but the processor outputs "pixel_values"
  const { output } = await model({ input: inputs.pixel_values });

  // Parse the output mask
  const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

  // Apply mask to original image
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  // Combine the original image and the mask into a single RGBA ImageData
  const resultImgData = new ImageData(image.width, image.height);
  const maskData = mask.data;
  const isRGB = image.channels === 3;

  for (let i = 0; i < image.width * image.height; ++i) {
    resultImgData.data[4 * i] = image.data[isRGB ? i * 3 : i * 4];           // R
    resultImgData.data[4 * i + 1] = image.data[isRGB ? i * 3 + 1 : i * 4 + 1]; // G
    resultImgData.data[4 * i + 2] = image.data[isRGB ? i * 3 + 2 : i * 4 + 2]; // B
    resultImgData.data[4 * i + 3] = maskData[i];                             // A (mask)
  }

  ctx.putImageData(resultImgData, 0, 0);
  
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const resultUrl = URL.createObjectURL(blob);
  
  return resultUrl;
}

async function estimateDepth(imageUrl: string) {
  const { model, processor } = await AIModels.getDepth();
  postMessage({ status: 'progress', message: 'Estimating depth...' });

  const image = await RawImage.fromURL(imageUrl);
  const inputs = await processor(image);
  const { predicted_depth } = await model(inputs);

  const depthMap = await RawImage.fromTensor(predicted_depth[0].mul(255).to('uint8')).resize(image.width, image.height);
  
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const imgData = new ImageData(image.width, image.height);
  for (let i = 0; i < image.width * image.height; ++i) {
    const val = depthMap.data[i];
    imgData.data[4 * i] = val;     // R
    imgData.data[4 * i + 1] = val; // G
    imgData.data[4 * i + 2] = val; // B
    imgData.data[4 * i + 3] = 255; // A
  }
  ctx.putImageData(imgData, 0, 0);
  
  const blob = await canvas.convertToBlob({ type: 'image/jpeg' });
  const resultUrl = URL.createObjectURL(blob);
  
  return resultUrl;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, action, imageUrl } = e.data;
  
  try {
    let resultUrl = '';
    
    if (action === 'removeBackground') {
      resultUrl = await removeBackground(imageUrl);
    } else if (action === 'detectDepth') {
      resultUrl = await estimateDepth(imageUrl);
    } else {
      throw new Error(`Action ${action} not implemented yet`);
    }

    self.postMessage({ id, status: 'complete', resultUrl });
  } catch (error: any) {
    self.postMessage({ id, status: 'error', error: error.message });
  }
};
