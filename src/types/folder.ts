export interface FolderDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderWithProjects<TProject> {
  folder: FolderDocument;
  projects: TProject[];
}
