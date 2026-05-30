import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { Router, type CookieOptions, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import qrcode from 'qrcode';
import * as OTPAuth from 'otpauth';
import { LoginRequestDto, RegisterRequestDto } from '../dto/auth.dto.js';
import { AppError } from '../errors/AppError.js';
import { AuthError, NotFoundError, ValidationError } from '../errors/customErrors.js';
import { authenticate, type AuthTokenPayload, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { logger } from '../logger/index.js';
import { prisma } from '../prisma/unifiedClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decryptText, encryptText } from '../utils/encryption.js';

const router = Router();

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  rememberMe?: boolean;
  tokenType: 'refresh';
  jti: string;
}

interface MfaChallengePayload extends JwtPayload {
  userId: string;
  tokenType: 'mfa_challenge';
}

type RefreshTokenRecord = {
  tokenHash: string;
  revokedAt?: number;
  expiresAt: number;
  replacedByJti?: string;
};

type LoginBody = LoginRequestDto & {
  mfaCode?: string;
  backupCode?: string;
  mfaToken?: string;
};

const refreshTokenStore = new Map<string, RefreshTokenRecord>();

// Remove expired tokens periodically (every 6 hours)
const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    logger.error('Error cleaning up expired tokens', { error });
  }
  
  // Also clean up in-memory tokens
  const now = Date.now();
  for (const [jti, record] of refreshTokenStore.entries()) {
    if (record.expiresAt < now) {
      refreshTokenStore.delete(jti);
    }
  }
};

// Schedule cleanup to run every 6 hours
setInterval(cleanupExpiredTokens, 6 * 60 * 60 * 1000).unref();

const ACCESS_COOKIE_NAME = 'token';
const REFRESH_COOKIE_NAME = 'refreshToken';
const BACKUP_CODE_COUNT = 8;

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('Access token configuration missing', 500, undefined, false);
  }
  return secret;
};

const getRefreshTokenSecret = (): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('Refresh token configuration missing', 500, undefined, false);
  }
  return secret;
};

const getMfaChallengeSecret = (): string => {
  return process.env.MFA_CHALLENGE_SECRET ?? getAccessTokenSecret();
};

const getAccessTokenExpiry = (): SignOptions['expiresIn'] => {
  return (process.env.ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn'] | undefined) ??
    (process.env.JWT_EXPIRY as SignOptions['expiresIn'] | undefined) ??
    '15m';
};

const getRefreshTokenExpiry = (): SignOptions['expiresIn'] => {
  return (process.env.REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'] | undefined) ?? '7d';
};

const getRefreshCookieMaxAgeMs = (): number => {
  const parsed = Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE_MS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 7 * 24 * 60 * 60 * 1000;
};

const createAuthPayload = ({
  userId,
  tenantId,
  role,
}: {
  userId: string;
  tenantId: string;
  role: string;
}): AuthTokenPayload => {
  return {
    userId,
    tenantId,
    role,
    hospitalId: tenantId,
  };
};

const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

const normalizeTotpCode = (value: string): string => value.replace(/\s|-/g, '').trim();

const normalizeBackupCode = (value: string): string => value.replace(/\s/g, '').toUpperCase();

const setAccessCookie = (res: Response, token: string, rememberMe = true): void => {
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: !isLocal,
    sameSite: isLocal ? 'lax' : 'none',
    ...(rememberMe ? { maxAge: 24 * 60 * 60 * 1000 } : {}),
  };

  res.cookie(ACCESS_COOKIE_NAME, token, cookieOptions);
};

const setRefreshCookie = (res: Response, token: string, rememberMe = true): void => {
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: !isLocal,
    sameSite: isLocal ? 'lax' : 'none',
    ...(rememberMe ? { maxAge: getRefreshCookieMaxAgeMs() } : {}),
  };

  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions);
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE_NAME);
  res.clearCookie(REFRESH_COOKIE_NAME);
};

const buildAccessToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, getAccessTokenSecret(), { expiresIn: getAccessTokenExpiry() });
};

const buildRefreshToken = (
  payload: AuthTokenPayload,
  rememberMe: boolean
): { token: string; jti: string } => {
  const jti = randomUUID();
  const refreshPayload: RefreshTokenPayload = {
    ...payload,
    rememberMe,
    tokenType: 'refresh',
    jti,
  };

  const token = jwt.sign(refreshPayload, getRefreshTokenSecret(), {
    expiresIn: getRefreshTokenExpiry(),
  });

  return { token, jti };
};

const buildMfaChallengeToken = (userId: string): string => {
  return jwt.sign(
    {
      userId,
      tokenType: 'mfa_challenge',
    } satisfies MfaChallengePayload,
    getMfaChallengeSecret(),
    { expiresIn: '5m' }
  );
};

const decodeRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, getRefreshTokenSecret()) as RefreshTokenPayload;
  if (decoded.tokenType !== 'refresh' || !decoded.jti) {
    throw new AuthError('Invalid refresh token');
  }
  return decoded;
};

const decodeMfaChallengeToken = (token: string): MfaChallengePayload => {
  const decoded = jwt.verify(token, getMfaChallengeSecret()) as MfaChallengePayload;
  if (decoded.tokenType !== 'mfa_challenge' || !decoded.userId) {
    throw new AuthError('Invalid MFA challenge token');
  }
  return decoded;
};

const persistRefreshToken = async (token: string, decoded: RefreshTokenPayload): Promise<void> => {
  const expiresAtMs = typeof decoded.exp === 'number' ? decoded.exp * 1000 : Date.now() + getRefreshCookieMaxAgeMs();
  const expiresAtDate = new Date(expiresAtMs);
  
  try {
    await prisma.refreshToken.create({
      data: {
        jti: decoded.jti,
        tokenHash: hashToken(token),
        expiresAt: expiresAtDate,
        userId: decoded.userId,
      },
    });
  } catch (error) {
    // Fallback to in-memory storage if database table doesn't exist yet (migration not run)
    logger.warn('Database token storage unavailable, using fallback in-memory storage', { error });
    refreshTokenStore.set(decoded.jti, {
      tokenHash: hashToken(token),
      expiresAt: expiresAtMs,
    });
  }
};

const revokeRefreshToken = async (decoded: RefreshTokenPayload, replacedByJti?: string): Promise<void> => {
  try {
    await prisma.refreshToken.update({
      where: { jti: decoded.jti },
      data: {
        revokedAt: new Date(),
        replacedByJti,
      },
    });
  } catch (error) {
    // Fallback to in-memory revocation
    logger.warn('Database token revocation unavailable, using fallback in-memory revocation', { error });
    const record = refreshTokenStore.get(decoded.jti);
    if (record) {
      refreshTokenStore.set(decoded.jti, {
        ...record,
        revokedAt: Date.now(),
        replacedByJti,
      });
    }
  }
};

const issueAuthTokens = async (
  payload: AuthTokenPayload,
  rememberMe: boolean
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = buildAccessToken(payload);
  const { token: refreshToken } = buildRefreshToken(payload, rememberMe);
  const refreshDecoded = decodeRefreshToken(refreshToken);
  await persistRefreshToken(refreshToken, refreshDecoded);
  return { accessToken, refreshToken };
};

const getAuthenticatedUserId = (req: Request): string => {
  const userId = (req as AuthenticatedRequest).user?.userId;
  if (!userId) {
    throw new AuthError('Unauthorized');
  }
  return userId;
};

const generateBackupCodes = (): string[] => {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const partA = randomInt(1000, 10000);
    const partB = randomInt(1000, 10000);
    return `${partA}-${partB}`;
  });
};

const parseEncryptedBackupCodes = (encrypted: string | null): string[] => {
  if (!encrypted) {
    return [];
  }

  try {
    const raw = decryptText(encrypted);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((code): code is string => typeof code === 'string');
  } catch {
    return [];
  }
};

const getDecryptedMfaSecret = (encryptedSecret: string | null): string => {
  if (!encryptedSecret) {
    throw new ValidationError('MFA setup is not initialized');
  }
  try {
    return decryptText(encryptedSecret);
  } catch {
    throw new AppError('Failed to read MFA secret', 500);
  }
};

const verifyTotpCode = (encryptedSecret: string | null, code: string): boolean => {
  const secret = getDecryptedMfaSecret(encryptedSecret);
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  const delta = totp.validate({ token: normalizeTotpCode(code), window: 1 });
  return delta !== null;
};

const consumeBackupCode = async (userId: string, encryptedBackupCodes: string | null, inputCode: string): Promise<boolean> => {
  const existingCodes = parseEncryptedBackupCodes(encryptedBackupCodes);
  if (existingCodes.length === 0) {
    return false;
  }

  const normalizedInput = Buffer.from(normalizeBackupCode(inputCode), 'utf8');
  const remaining: string[] = [];
  let used = false;

  for (const code of existingCodes) {
    const normalizedCode = Buffer.from(normalizeBackupCode(code), 'utf8');
    const equal =
      normalizedCode.length === normalizedInput.length &&
      timingSafeEqual(normalizedCode, normalizedInput);

    if (!used && equal) {
      used = true;
      continue;
    }

    remaining.push(code);
  }

  if (!used) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      backupCodes: encryptText(JSON.stringify(remaining)),
    },
  });

  return true;
};

router.post(
  '/register',
  validateRequest(RegisterRequestDto),
  asyncHandler(async (req, res) => {
    const { hospitalName, address, phone, email, password, licenseNo, gstin } =
      req.body as RegisterRequestDto;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    const existingHospital = await prisma.hospital.findUnique({
      where: { licenseNo },
    });
    if (existingHospital) {
      throw new ValidationError('License number already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const hospital = await prisma.hospital.create({
      data: {
        name: hospitalName,
        address: address ?? 'Address not provided',
        phone: phone ?? 'N/A',
        licenseNo,
        gstin,
        email,
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        hospitalId: hospital.id,
      },
    });

    const payload = createAuthPayload({
      userId: user.id,
      tenantId: hospital.id,
      role: user.role,
    });
    const { accessToken, refreshToken } = await issueAuthTokens(payload, true);

    setAccessCookie(res, accessToken, true);
    setRefreshCookie(res, refreshToken, true);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: hospital.id,
          hospitalId: hospital.id,
        },
      },
    });
  })
);

router.post(
  '/login',
  validateRequest(LoginRequestDto),
  asyncHandler(async (req, res) => {
    const { email, password, rememberMe = false, mfaCode, backupCode, mfaToken } = req.body as LoginBody;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new AuthError('Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!mfaCode && !backupCode) {
        return res.status(401).json({
          success: false,
          mfaRequired: true,
          mfaToken: buildMfaChallengeToken(user.id),
          message: 'MFA verification required',
        });
      }

      if (!mfaToken) {
        throw new AuthError('MFA challenge token required');
      }

      let challenge: MfaChallengePayload;
      try {
        challenge = decodeMfaChallengeToken(mfaToken);
      } catch {
        throw new AuthError('Invalid MFA challenge token');
      }

      if (challenge.userId !== user.id) {
        throw new AuthError('Invalid MFA challenge token');
      }

      let verified = false;
      if (mfaCode) {
        verified = verifyTotpCode(user.mfaSecret, mfaCode);
      } else if (backupCode) {
        verified = await consumeBackupCode(user.id, user.backupCodes, backupCode);
      }

      if (!verified) {
        throw new AuthError('Invalid MFA code');
      }
    }

    const payload = createAuthPayload({
      userId: user.id,
      tenantId: user.hospitalId,
      role: user.role,
    });
    const { accessToken, refreshToken } = await issueAuthTokens(payload, rememberMe);

    setAccessCookie(res, accessToken, rememberMe);
    setRefreshCookie(res, refreshToken, rememberMe);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.hospitalId,
          hospitalId: user.hospitalId,
        },
      },
    });
  })
);

router.post(
  '/mfa/setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const otpSecret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'Hosp',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: otpSecret,
    });
    const base32 = otpSecret.base32;
    const otpauth_url = totp.toString();

    if (!base32 || !otpauth_url) {
      throw new AppError('Failed to generate MFA secret', 500);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: encryptText(base32),
        mfaEnabled: false,
        backupCodes: null,
      },
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauth_url);

    res.status(200).json({
      success: true,
      message: 'MFA setup initialized',
      secret: base32,
      otpauthUrl: otpauth_url,
      qrCodeDataUrl,
    });
  })
);

router.post(
  '/mfa/verify',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    if (!code) {
      throw new ValidationError('code is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const verified = verifyTotpCode(user.mfaSecret, code);
    res.status(200).json({
      success: verified,
      verified,
      message: verified ? 'MFA code is valid' : 'Invalid MFA code',
    });
  })
);

router.post(
  '/mfa/enable',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    if (!code) {
      throw new ValidationError('code is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const verified = verifyTotpCode(user.mfaSecret, code);
    if (!verified) {
      throw new ValidationError('Invalid MFA code');
    }

    const backupCodes = generateBackupCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        backupCodes: encryptText(JSON.stringify(backupCodes)),
      },
    });

    res.status(200).json({
      success: true,
      message: 'MFA enabled successfully',
      backupCodes,
    });
  })
);

router.post(
  '/mfa/disable',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'MFA disabled successfully',
    });
  })
);

router.post(
  '/mfa/backup-codes',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (!user.mfaEnabled) {
      throw new ValidationError('Enable MFA first');
    }

    const backupCodes = generateBackupCodes();
    await prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes: encryptText(JSON.stringify(backupCodes)),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Backup codes generated',
      backupCodes,
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const bodyRefreshToken =
      typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    const refreshToken = bodyRefreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      try {
        const decoded = decodeRefreshToken(refreshToken);
        await revokeRefreshToken(decoded);
      } catch {
        // Keep logout idempotent even when token is already invalid/expired.
      }
    }

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

const refreshTokenHandler = asyncHandler(async (req, res) => {
  const bodyRefreshToken =
    typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
  const refreshToken = bodyRefreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'No refresh token found',
    });
  }

  let decoded: RefreshTokenPayload;
  try {
    decoded = decodeRefreshToken(refreshToken);
  } catch {
    throw new AuthError('Invalid refresh token');
  }

  // Try to fetch from database first
  let record: any = null;
  let useInMemoryFallback = false;
  
  try {
    record = await prisma.refreshToken.findUnique({
      where: { jti: decoded.jti },
    });
  } catch (error) {
    // Database table doesn't exist yet - fall back to in-memory
    logger.warn('RefreshToken table not accessible, using fallback in-memory storage');
    useInMemoryFallback = true;
    record = refreshTokenStore.get(decoded.jti);
  }

  if (!record) {
    throw new AuthError('Refresh token revoked');
  }

  // Check revocation status
  const revokedAt = useInMemoryFallback ? record.revokedAt : record.revokedAt;
  if (revokedAt) {
    throw new AuthError('Refresh token already used');
  }

  // Check expiration
  const expiresAtMs = useInMemoryFallback ? record.expiresAt : record.expiresAt.getTime();
  if (expiresAtMs < Date.now()) {
    if (!useInMemoryFallback) {
      try {
        await prisma.refreshToken.delete({
          where: { jti: decoded.jti },
        });
      } catch {
        // Ignore delete errors
      }
    } else {
      refreshTokenStore.delete(decoded.jti);
    }
    throw new AuthError('Refresh token expired');
  }

  // Verify token hash
  if (record.tokenHash !== hashToken(refreshToken)) {
    throw new AuthError('Invalid refresh token');
  }

  const tenantId = decoded.tenantId ?? decoded.hospitalId;
  if (!tenantId) {
    throw new AuthError('Invalid refresh token');
  }

  const payload = createAuthPayload({
    userId: decoded.userId,
    tenantId,
    role: decoded.role,
  });
  const rememberMe = decoded.rememberMe ?? true;
  const accessToken = buildAccessToken(payload);
  const rotated = buildRefreshToken(payload, rememberMe);
  const rotatedDecoded = decodeRefreshToken(rotated.token);

  await revokeRefreshToken(decoded, rotated.jti);
  await persistRefreshToken(rotated.token, rotatedDecoded);

  setAccessCookie(res, accessToken, rememberMe);
  setRefreshCookie(res, rotated.token, rememberMe);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {},
  });
});

router.post('/refresh-token', refreshTokenHandler);
router.post('/refresh', refreshTokenHandler);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[ACCESS_COOKIE_NAME];
    if (!token) {
      throw new AuthError('Unauthorized');
    }

    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(token, getAccessTokenSecret()) as AuthTokenPayload;
    } catch {
      throw new AuthError('Invalid token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        hospitalId: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: {
        user: {
          ...user,
          tenantId: user.hospitalId,
        },
      },
    });
  })
);

router.get(
  '/export-my-data',
  authenticate,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[ACCESS_COOKIE_NAME];
    if (!token) {
      throw new AuthError('Unauthorized');
    }

    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(token, getAccessTokenSecret()) as AuthTokenPayload;
    } catch {
      throw new AuthError('Invalid token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        hospitalId: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const activityLogs = await prisma.auditLog.findMany({
      where: {
        hospitalId: user.hospitalId,
        OR: [{ userId: user.id }, { actor: user.id }],
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        changesJson: true,
        consentVersion: true,
        purpose: true,
        retentionPolicy: true,
        ipAddress: true,
        userAgent: true,
        timestamp: true,
      },
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tenant: user.hospital,
      activityLogs,
    };

    const fileName = `hosp-my-data-${user.id}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).json(payload);
  })
);

export { router as authRouter };
