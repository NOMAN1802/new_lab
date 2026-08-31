import type { UploadApiResponse } from 'cloudinary';
import httpStatus from 'http-status';
import { cloudinary } from '../config/cloudinary.config';
import AppError from '../errors/AppError';

export type TStoredFile = {
  url: string;
  publicId: string;
  resourceType: string;
  /** Delivery extension, e.g. 'pdf' or 'png'. Needed to build a working URL. */
  format?: string;
  version?: string;
  mimeType: string;
  originalName: string;
  size: number;
};

const REPORTS_FOLDER = 'newlab/reports';

/**
 * PDFs go to `raw`, images to `image`.
 *
 * Not `auto`: that routes a PDF into Cloudinary's *image* pipeline, where PDF
 * delivery is blocked by default on most accounts — every uploaded PDF report
 * then 401s on download. `raw` stores and returns the exact bytes, which is
 * what a diagnostic report needs anyway.
 */
const resourceTypeFor = (mimetype: string): 'raw' | 'image' =>
  mimetype === 'application/pdf' ? 'raw' : 'image';

/**
 * Streams a buffer to Cloudinary.
 *
 * `type: 'authenticated'` keeps the asset off the public CDN, so a patient's
 * report cannot be read by guessing its URL. Delivery goes through
 * getSignedFileUrl() below.
 */
export const uploadReportFile = (
  file: Express.Multer.File,
  folder: string = REPORTS_FOLDER
): Promise<TStoredFile> =>
  new Promise((resolve, reject) => {
    const resourceType = resourceTypeFor(file.mimetype);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: 'authenticated',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(
            new AppError(
              httpStatus.INTERNAL_SERVER_ERROR,
              `Report upload failed: ${error?.message ?? 'unknown error'}`
            )
          );
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          version: result.version ? String(result.version) : undefined,
          mimeType: file.mimetype,
          originalName: file.originalname,
          size: result.bytes,
        });
      }
    );

    stream.end(file.buffer);
  });

/**
 * Signed delivery URL for an authenticated asset.
 *
 * `format` and `version` both matter: without the extension Cloudinary cannot
 * resolve the delivery format, and without the real version the signature is
 * computed against the wrong path — either way the link 401s.
 */
export const getSignedFileUrl = (
  publicId: string,
  resourceType = 'image',
  format?: string,
  version?: string
): string =>
  cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'authenticated',
    sign_url: true,
    secure: true,
    ...(format ? { format } : {}),
    ...(version ? { version } : {}),
  });

export const deleteReportFile = async (
  publicId: string,
  resourceType = 'image'
): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: 'authenticated',
    invalidate: true,
  });
};
