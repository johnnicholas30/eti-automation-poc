import { Injectable, Logger } from '@nestjs/common';
import { google, forms_v1 } from 'googleapis';
import { AuthService } from '@/auth/auth.service';
import { DriveService } from '@/drive/drive.service';
import {
  CreateFormInterface,
  MergeFormsInterface,
  GoogleFormMapping,
} from '@/forms/interfaces/form.interface';

@Injectable()
export class FormsService {
  private formClient: forms_v1.Forms;

  constructor(
    private readonly authService: AuthService,
    private readonly driveService: DriveService,
  ) {
    this.formClient = google.forms({
      version: 'v1',
      auth: this.authService.getClient(),
    });
  }

  async getFormDetails(formId: string) {
    try {
      await this.authService.ensureFreshToken();
      const response = await this.formClient.forms.get({ formId });
      return response.data;
    } catch (error) {
      Logger.error(`Failed to get form details for ${formId}:`, error);
      throw error;
    }
  }

  async createForm({ documentTitle, formTitle }: CreateFormInterface) {
    try {
      await this.authService.ensureFreshToken();
      const form = await this.formClient.forms.create({
        requestBody: {
          info: {
            title: formTitle,
            documentTitle: documentTitle,
          },
        },
      });

      const folderId =
        await this.driveService.getOrCreateFolder('Generated ETIs');
      await this.driveService.moveFileToFolder(form.data.formId, folderId);

      return form.data;
    } catch (error) {
      Logger.error('Failed to create form:', error);
      throw error;
    }
  }

  private async getForms(formIds: string[]) {
    const INTRO_FORM_ID = '13LE8e3p_PPel6otrvtDHxHF6me0DMhfAxEoTfZAx4JQ';
    const [introForm, ...rawForms] = await Promise.all([
      this.getFormDetails(INTRO_FORM_ID),
      ...formIds.map((id) => this.getFormDetails(id)),
    ]);

    const formsWithoutIntro = rawForms.map((form) => ({
      ...form,
      items: form.items.slice(4),
    }));

    return [introForm, ...formsWithoutIntro];
  }

  private cleanFormItem(item: forms_v1.Schema$Item) {
    // use structuredClone to avoid modifying the original item
    // strip newline characters as it is causing errors
    // delete itemId to let Google generate new IDs
    const newItem = structuredClone(item);
    delete newItem.itemId;

    if (newItem.title) {
      newItem.title = newItem.title.replace(/\n/g, ' ');
    }
    if (newItem.description) {
      newItem.description = newItem.description.replace(/\n/g, ' ');
    }

    if (newItem.questionItem?.question?.choiceQuestion?.options) {
      newItem.questionItem.question.choiceQuestion.options =
        newItem.questionItem.question.choiceQuestion.options.map((option) => ({
          value: option.value.replace(/\n/g, ' '),
        }));
    }

    return newItem;
  }

  private createItemRequests(forms: forms_v1.Schema$Form[]) {
    let totalIndex = 0;
    return forms.flatMap((form) =>
      (form.items ?? []).map((item) => ({
        createItem: {
          item: this.cleanFormItem(item),
          location: { index: totalIndex++ },
        },
      })),
    );
  }

  private buildIdMap(
    forms: forms_v1.Schema$Form[],
    updatedForm: forms_v1.Schema$Form,
  ) {
    const idMap = new Map<string, string>();
    let currentIndex = 0;

    forms.forEach((form, formIndex) => {
      form.items?.forEach((_, itemIndex) => {
        const newItem = updatedForm.items[currentIndex++];
        if (newItem?.itemId) {
          idMap.set(`${formIndex}_${itemIndex}`, newItem.itemId);
        }
      });
    });

    return idMap;
  }

  private createNavigationUpdates(
    forms: forms_v1.Schema$Form[],
    idMap: Map<string, string>,
  ) {
    let updateIndex = 0;
    return forms.flatMap((form, formIndex) =>
      form.items
        ?.map((item, itemIndex) => {
          const currentIndex = updateIndex++;
          if (!this.hasNavigation(item)) return null;

          const updatedOptions = this.updateNavigationOptions(
            item,
            formIndex,
            forms,
            idMap,
          );

          return {
            updateItem: {
              item: {
                itemId: idMap.get(`${formIndex}_${itemIndex}`),
                questionItem: {
                  question: {
                    choiceQuestion: {
                      options: updatedOptions,
                    },
                  },
                },
              },
              location: { index: currentIndex },
              updateMask: 'questionItem.question.choiceQuestion.options',
            },
          };
        })
        .filter(Boolean),
    );
  }

  private hasNavigation(item: forms_v1.Schema$Item) {
    return item.questionItem?.question?.choiceQuestion?.options?.some(
      (option) => option.goToSectionId || option.goToAction,
    );
  }

  private updateNavigationOptions(
    item: forms_v1.Schema$Item,
    formIndex: number,
    forms: forms_v1.Schema$Form[],
    idMap: Map<string, string>,
  ) {
    return item.questionItem.question.choiceQuestion.options.map((option) => {
      const newOption = structuredClone(option);

      if (
        newOption.goToAction === 'SUBMIT_FORM' &&
        formIndex < forms.length - 1
      ) {
        delete newOption.goToAction;
        const nextFormFirstItemKey = `${formIndex + 1}_0`;
        newOption.goToSectionId = idMap.get(nextFormFirstItemKey);
      } else if (newOption.goToSectionId) {
        this.updateGoToSectionId(newOption, forms, idMap);
      }

      return newOption;
    });
  }

  private updateGoToSectionId(
    option: any,
    forms: forms_v1.Schema$Form[],
    idMap: Map<string, string>,
  ) {
    for (
      let targetFormIndex = 0;
      targetFormIndex < forms.length;
      targetFormIndex++
    ) {
      const targetForm = forms[targetFormIndex];
      const targetItemIndex = targetForm.items.findIndex(
        (targetItem) => targetItem.itemId === option.goToSectionId,
      );
      if (targetItemIndex !== -1) {
        option.goToSectionId = idMap.get(
          `${targetFormIndex}_${targetItemIndex}`,
        );
        break;
      }
    }
  }

  async mergeForms({
    formIds,
    newFormTitle,
    newDocumentTitle,
  }: MergeFormsInterface) {
    try {
      const forms = await this.getForms(formIds);
      const allRequests = this.createItemRequests(forms);

      const emptyTemplateFormId =
        '1AVVAOVjjZBWXaOlYSFAVXxs8OpCoNVrJ9Dq0oSEvuVA';
      const formCopy = await this.driveService.copyForm(
        emptyTemplateFormId,
        newDocumentTitle,
      );

      const createResponse = await this.formClient.forms.batchUpdate({
        formId: formCopy.id,
        requestBody: {
          requests: [
            {
              updateFormInfo: {
                info: {
                  title: newFormTitle,
                },
                updateMask: 'title',
              },
            },
            ...allRequests,
          ],
          includeFormInResponse: true,
        },
      });

      const idMap = this.buildIdMap(forms, createResponse.data.form);
      const navigationUpdates = this.createNavigationUpdates(forms, idMap);

      if (navigationUpdates.length > 0) {
        await this.formClient.forms.batchUpdate({
          formId: formCopy.id,
          requestBody: {
            requests: navigationUpdates,
          },
        });
      }

      return formCopy;
    } catch (error) {
      Logger.error('Failed to merge forms:', error);
      throw error;
    }
  }

  async listForms(): Promise<GoogleFormMapping[]> {
    try {
      const files = await this.driveService.getGoogleFormFiles();

      return files.map((file) => ({
        name: file.name || 'Untitled Form',
        id: file.id || '',
        link: file.webViewLink || undefined,
      }));
    } catch (error) {
      Logger.error('Failed to list forms:', error);
      throw error;
    }
  }
}
