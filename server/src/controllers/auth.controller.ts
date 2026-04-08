import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { loginSchema } from '../utils/validators';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await AuthService.login(input);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token) {
      res.status(400).json({ success: false, error: 'refresh_token is required' });
      return;
    }
    const result = await AuthService.refreshToken(refresh_token);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.slice(7) ?? '';
    await AuthService.logout(token);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
