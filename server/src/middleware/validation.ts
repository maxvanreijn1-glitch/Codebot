import { Request, Response, NextFunction } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Prevent HTML injection by stripping angle brackets and dangerous URL schemes.
// Removing < and > individually is sufficient to prevent HTML element injection
// in a REST API context where output is JSON-encoded.
function sanitizeString(value: string): string {
  return value
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    .trim();
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 255;
}

export function validateRegister(req: Request, res: Response, next: NextFunction): void {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (password.length > 128) {
    res.status(400).json({ error: 'Password must be at most 128 characters' });
    return;
  }
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const sanitizedName = sanitizeString(name);
  if (sanitizedName.length === 0 || sanitizedName.length > 100) {
    res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    return;
  }

  // Normalise values on body
  req.body.email = email.toLowerCase().trim();
  req.body.name = sanitizedName;
  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  req.body.email = email.toLowerCase().trim();
  next();
}

export function validateForgotPassword(req: Request, res: Response, next: NextFunction): void {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  req.body.email = email.toLowerCase().trim();
  next();
}

export function validateResetPassword(req: Request, res: Response, next: NextFunction): void {
  const { token, newPassword } = req.body;

  if (!token || typeof token !== 'string' || token.length === 0) {
    res.status(400).json({ error: 'Reset token is required' });
    return;
  }
  if (!newPassword || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'New password is required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (newPassword.length > 128) {
    res.status(400).json({ error: 'Password must be at most 128 characters' });
    return;
  }

  next();
}

export function validateProfileUpdate(req: Request, res: Response, next: NextFunction): void {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const sanitized = sanitizeString(name);
  if (sanitized.length === 0 || sanitized.length > 100) {
    res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    return;
  }

  req.body.name = sanitized;
  next();
}

export function validateRepositoryCreate(req: Request, res: Response, next: NextFunction): void {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Repository name is required' });
    return;
  }
  const sanitizedName = sanitizeString(name);
  if (sanitizedName.length === 0 || sanitizedName.length > 200) {
    res.status(400).json({ error: 'Repository name must be between 1 and 200 characters' });
    return;
  }

  req.body.name = sanitizedName;
  if (description) {
    req.body.description = sanitizeString(String(description)).slice(0, 1000);
  }
  next();
}

export function validateAnalysisCreate(req: Request, res: Response, next: NextFunction): void {
  const { prompt, repositoryId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }
  const sanitizedPrompt = sanitizeString(prompt);
  if (sanitizedPrompt.length === 0 || sanitizedPrompt.length > 5000) {
    res.status(400).json({ error: 'Prompt must be between 1 and 5000 characters' });
    return;
  }

  if (repositoryId !== undefined && (typeof repositoryId !== 'string' || repositoryId.length === 0)) {
    res.status(400).json({ error: 'Invalid repositoryId' });
    return;
  }

  req.body.prompt = sanitizedPrompt;
  next();
}
