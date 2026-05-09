export interface ConfluencePage {
  id: string;
  title: string;
  spaceId: string;
  status: "current" | "archived" | "draft" | "trashed";
  version: ConfluenceVersion;
  body?: ConfluenceBody;
  parentId?: string;
  parentType?: string;
  authorId: string;
  createdAt: string;
  position?: number;
  childPosition?: number;
  _links: {
    webui: string;
    self: string;
    tinyui?: string;
  };
}

export interface ConfluenceVersion {
  number: number;
  message: string;
  createdAt: string;
  authorId: string;
}

export interface ConfluenceBody {
  storage: ConfluenceBodyFormat;
  atlas_doc_format?: ConfluenceBodyFormat;
  view?: ConfluenceBodyFormat;
}

export interface ConfluenceBodyFormat {
  value: string;
  representation: "storage" | "atlas_doc_format" | "view";
}

export interface ConfluencePageSearchResponse {
  results: ConfluencePage[];
  _links: {
    next?: string;
    base: string;
  };
}

export interface ConfluencePageCreateRequest {
  spaceId: string;
  title: string;
  body: {
    representation: "storage" | "atlas_doc_format";
    value: string;
  };
  parentId?: string;
  status?: "current" | "draft";
}

export interface ConfluencePageUpdateRequest {
  id: string;
  title: string;
  body: {
    representation: "storage" | "atlas_doc_format";
    value: string;
  };
  version: {
    number: number;
    message?: string;
  };
  status?: "current" | "draft";
}

export interface ConfluenceAncestor {
  id: string;
  title: string;
  spaceId: string;
  status: string;
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluencePageAncestorsResponse {
  results: ConfluenceAncestor[];
  _links: {
    base: string;
  };
}

export interface ConfluencePageChildrenResponse {
  results: ConfluencePage[];
  _links: {
    next?: string;
    base: string;
  };
}

export interface ConfluenceSearchParams {
  title?: string;
  spaceId?: string;
  status?: string;
  limit?: number;
}

export interface ConfluenceCustomContentSearchResponse {
  results: ConfluenceCustomContent[];
  _links: {
    next?: string;
    base: string;
  };
}

export interface ConfluenceCustomContent {
  id: string;
  type: string;
  title?: string;
  spaceId: string;
  containerId?: string;
  version: ConfluenceVersion;
  body?: ConfluenceBody;
  _links: {
    webui?: string;
    self: string;
  };
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  authorId: string;
  createdAt: string;
  homepageId?: string;
  description?: {
    plain: {
      value: string;
      representation: "plain";
    };
  };
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSpaceSearchResponse {
  results: ConfluenceSpace[];
  _links: {
    next?: string;
    base: string;
  };
}
