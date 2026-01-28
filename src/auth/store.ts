import fs from "fs";
import path from "path";
import type { AtlassianAccessibleResource } from "./atlassian";

export type JiraOAuthClientRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  resources: AtlassianAccessibleResource[];
  selectedResourceId?: string;
};

type JiraOAuthStoreData = Record<string, JiraOAuthClientRecord>;

export class JiraOAuthStore {
  private data: JiraOAuthStoreData = {};

  constructor(private readonly storePath: string) {
    this.load();
  }

  getClient(token: string): JiraOAuthClientRecord | undefined {
    return this.data[token];
  }

  setClient(token: string, record: JiraOAuthClientRecord): void {
    this.data[token] = record;
    this.save();
  }

  updateClient(
    token: string,
    updater: (record: JiraOAuthClientRecord) => JiraOAuthClientRecord,
  ): JiraOAuthClientRecord | undefined {
    const record = this.data[token];
    if (!record) {
      return undefined;
    }
    const updated = updater(record);
    this.data[token] = updated;
    this.save();
    return updated;
  }

  private load(): void {
    if (!fs.existsSync(this.storePath)) {
      this.data = {};
      return;
    }

    try {
      const raw = fs.readFileSync(this.storePath, "utf-8");
      const parsed = JSON.parse(raw) as JiraOAuthStoreData;
      this.data = parsed ?? {};
    } catch {
      this.data = {};
    }
  }

  private save(): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2));
  }
}
