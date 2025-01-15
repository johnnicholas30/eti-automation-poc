export interface GoogleFormMapping {
  name: string;
  id: string;
  link?: string;
}

// You can also move other form-related interfaces here
export interface CreateFormInterface {
  documentTitle: string;
  formTitle: string;
}

export interface MergeFormsInterface {
  formIds: string[];
  newFormTitle?: string;
  newDocumentTitle?: string;
}
