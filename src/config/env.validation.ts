import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  TAX_RATE: Joi.number().min(0).max(1).default(0.22),

  // Fiserv ITD (opcionales en dev, requeridas en prod)
  ITD_BASE_URL: Joi.string().allow('').optional(),
  ITD_SYSTEM_ID: Joi.string().allow('').optional(),
  ITD_POS_ID: Joi.string().allow('').optional(),
  ITD_BRANCH: Joi.string().allow('').optional(),
  ITD_CLIENT_APP_ID: Joi.string().allow('').optional(),
  ITD_PASSWORD: Joi.string().allow('').optional(),
});
