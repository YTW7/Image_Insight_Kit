# Image Insight — CNN-powered image classifier

## What it does
Upload an image, get back what's in it — object labels with confidence
percentages — using a MobileNetV2 CNN. Classification runs locally from
bundled/loaded weights, so the core feature works without depending on
any external API at inference time.

## Why
Most "what's in this image" tools require a paid API call per request.
This runs the CNN directly, and only touches AWS for optional storage/
logging of results — not for the classification itself.

## Tech stack
- Next.js (App Router) + TypeScript
- TensorFlow.js (WASM backend) + MobileNetV2 (`@tensorflow-models/mobilenet`, ImageNet, 1000 classes)
- sharp for image preprocessing
- AWS S3 for storing analyzed images + prediction metadata
- AWS Amplify Hosting for deployment
- LocalStack used during development to mock S3 before wiring real AWS

## How it works
1. User uploads an image via the UI
2. `/api/classify` preprocesses it (resize to 224x224, RGB) and runs it through MobileNetV2
3. Top 5 predictions with confidence scores are returned and rendered
4. Image + predictions are optionally logged to S3 (non-blocking — classification still works if this fails or isn't configured)

## AWS usage
**Build it:** LocalStack for local S3 mocking during development (no AWS costs/credentials needed to test the logging path)
**Ship it:** S3 (image + prediction logging), Amplify Hosting (deployment)

## Running locally

```bash
npm install
cp .env.local.example .env.local   # optional: fill in AWS creds to enable S3 logging
npm run dev
```

Open http://localhost:3000, upload an image, click Analyze.

## Notes / limitations
- S3 logging is best-effort: if credentials aren't set, classification still works and returns results; only the logging step is skipped.
- First model load may take a few seconds while weights initialize.

## Demo
- Video: [link]
- Live: [link, if deployed]