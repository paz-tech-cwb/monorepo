import { ProjectConfig } from './config.js';
import { sanitizeEventSummary, sanitizeIssue, sanitizeStack } from './sanitize.js';

export interface GlitchtipClientOptions {
  baseUrl: string;
  token: string;
}

export interface IssueSearchParams {
  project: ProjectConfig;
  environment: string;
  since?: string;
  query?: string;
  limit?: number;
}

export class GlitchtipClient {
  private readonly baseUrl: string;

  constructor(private readonly options: GlitchtipClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
  }

  async listTopErrors(params: IssueSearchParams): Promise<unknown> {
    const issues = await this.fetchJson<Array<Record<string, unknown>>>(this.issueUrl(params));
    return issues.slice(0, params.limit ?? 10).map(sanitizeIssue);
  }

  async listErrorsSinceRelease(params: IssueSearchParams & { release: string }): Promise<unknown> {
    const query = `release:${quoteSearch(params.release)}${params.query ? ` ${params.query}` : ''}`;
    const issues = await this.fetchJson<Array<Record<string, unknown>>>(this.issueUrl({ ...params, query }));
    return issues.slice(0, params.limit ?? 10).map(sanitizeIssue);
  }

  async findByRequestId(params: IssueSearchParams & { requestId: string }): Promise<unknown> {
    const query = `request_id:${quoteSearch(params.requestId)} OR correlation_id:${quoteSearch(params.requestId)}`;
    const issues = await this.fetchJson<Array<Record<string, unknown>>>(this.issueUrl({ ...params, query }));
    return issues.slice(0, params.limit ?? 10).map(sanitizeIssue);
  }

  async getIssueSummary(params: { project: ProjectConfig; environment: string; issueId: string }): Promise<unknown> {
    const issue = await this.fetchJson<Record<string, unknown>>(this.issueDetailUrl(params.project, params.issueId));
    return sanitizeIssue(issue);
  }

  async getRepresentativeStack(params: { project: ProjectConfig; environment: string; issueId: string }): Promise<unknown> {
    const events = await this.fetchJson<Array<Record<string, unknown>>>(this.issueEventsUrl(params.project, params.issueId));
    const event = events[0];

    if (!event) {
      return { issueId: params.issueId, frames: [] };
    }

    const eventId = String(event.id ?? event.eventID ?? '');
    const detailedEvent = eventId
      ? await this.fetchJson<Record<string, unknown>>(this.issueEventDetailUrl(params.project, params.issueId, eventId))
      : event;

    return sanitizeStack({ ...sanitizeEventSummary(event), ...detailedEvent });
  }

  issueUrl(params: IssueSearchParams): string {
    const search = new URLSearchParams({
      environment: params.environment,
      sort: 'freq',
      statsPeriod: '',
      limit: String(params.limit ?? 10),
    });

    if (params.since) {
      search.set('since', params.since);
    }

    if (params.query) {
      search.set('query', params.query);
    }

    return `${this.projectBase(params.project)}/issues/?${search.toString()}`;
  }

  private issueDetailUrl(project: ProjectConfig, issueId: string): string {
    return `${this.projectBase(project)}/issues/${encodeURIComponent(issueId)}/`;
  }

  private issueEventsUrl(project: ProjectConfig, issueId: string): string {
    return `${this.projectBase(project)}/issues/${encodeURIComponent(issueId)}/events/`;
  }

  private issueEventDetailUrl(project: ProjectConfig, issueId: string, eventId: string): string {
    return `${this.projectBase(project)}/issues/${encodeURIComponent(issueId)}/events/${encodeURIComponent(eventId)}/`;
  }

  private projectBase(project: ProjectConfig): string {
    return `${this.baseUrl}/projects/${encodeURIComponent(project.organizationSlug)}/${encodeURIComponent(project.projectSlug)}`;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GlitchTip request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

function quoteSearch(value: string): string {
  return JSON.stringify(value).replace(/:/g, '\\:');
}
