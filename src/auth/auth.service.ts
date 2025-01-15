import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google, Auth } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService implements OnModuleInit {
  private oauth2Client: Auth.OAuth2Client;
  private readonly TOKEN_PATH = path.join(
    process.cwd(),
    'src/config/tokens.json',
  );
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/drive',
  ];

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/auth/callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Missing required Google OAuth credentials in environment variables',
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    // Set up token refresh handler
    this.oauth2Client.on('tokens', (tokens) => {
      this.handleTokenUpdate(tokens);
    });
  }

  async onModuleInit() {
    await this.initializeTokens();
  }

  private async initializeTokens() {
    const tokens = this.loadTokens();
    if (!tokens) {
      Logger.warn('No tokens found. Please authenticate via /auth/login');
      return;
    }

    if (!tokens.refresh_token) {
      Logger.warn(
        'No refresh token found. Please re-authenticate via /auth/login',
      );
      return;
    }

    try {
      this.oauth2Client.setCredentials(tokens);
      await this.refreshAccessToken();
      Logger.log('Token initialization successful');
    } catch (err) {
      Logger.error('Token initialization failed:', err);
      Logger.warn('Please re-authenticate via /auth/login');
    }
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: this.SCOPES,
    });
  }

  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      Logger.error('Error getting tokens:', error);
      throw error;
    }
  }

  private loadCredentials() {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [
        process.env.GOOGLE_REDIRECT_URI ||
          'http://localhost:3000/api/auth/callback',
      ],
    };
  }

  private loadTokens() {
    try {
      const content = fs.readFileSync(this.TOKEN_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      Logger.debug('No tokens file found');
      return null;
    }
  }

  private saveTokens(tokens: Auth.Credentials) {
    try {
      fs.writeFileSync(this.TOKEN_PATH, JSON.stringify(tokens, null, 2));
      Logger.log('Tokens saved successfully');
    } catch (error) {
      Logger.error('Error saving tokens:', error);
      throw error;
    }
  }

  private handleTokenUpdate(tokens: Partial<Auth.Credentials>) {
    const currentTokens = this.oauth2Client.credentials;
    const updatedTokens = {
      ...currentTokens,
      ...tokens,
    };
    this.saveTokens(updatedTokens);
  }

  private async refreshAccessToken() {
    try {
      const response = await this.oauth2Client.refreshAccessToken();
      const { credentials } = response;
      this.oauth2Client.setCredentials(credentials);
      this.saveTokens(credentials);
      Logger.log('Access token refreshed successfully');
    } catch (error) {
      Logger.error('Error refreshing access token:', error);
      throw error;
    }
  }

  async ensureFreshToken() {
    const tokens = this.oauth2Client.credentials;
    const isExpired = tokens.expiry_date && tokens.expiry_date < Date.now();

    if (isExpired) {
      await this.refreshAccessToken();
    }
  }

  getClient() {
    return this.oauth2Client;
  }

  async getAuthenticatedClient() {
    await this.ensureFreshToken();
    return this.oauth2Client;
  }
}
