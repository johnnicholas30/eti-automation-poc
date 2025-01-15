import { Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class DriveService {
  private driveClient: drive_v3.Drive;

  constructor(private readonly authService: AuthService) {
    this.driveClient = google.drive({
      version: 'v3',
      auth: this.authService.getClient(),
    });
  }

  async getOrCreateFolder(folderName: string) {
    try {
      const response = await this.driveClient.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      const folder = await this.driveClient.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
      });

      return folder.data.id;
    } catch (error) {
      Logger.error('Failed to get/create folder:', error);
      throw error;
    }
  }

  async moveFileToFolder(fileId: string, folderId: string) {
    try {
      const file = await this.driveClient.files.get({
        fileId: fileId,
        fields: 'parents',
      });

      await this.driveClient.files.update({
        fileId: fileId,
        addParents: folderId,
        removeParents: file.data.parents?.join(','),
        fields: 'id, parents',
      });
    } catch (error) {
      Logger.error('Failed to move file:', error);
      throw error;
    }
  }

  async getGoogleFormFiles() {
    try {
      Logger.log('Fetching Google Form files');
      const response = await this.driveClient.files.list({
        q: "mimeType='application/vnd.google-apps.form' and trashed=false",
        fields: 'files(id, name, webViewLink)',
        spaces: 'drive',
      });

      return response.data.files || [];
    } catch (error) {
      Logger.error('Failed to fetch Google Form files:', error);
      throw error;
    }
  }
}
