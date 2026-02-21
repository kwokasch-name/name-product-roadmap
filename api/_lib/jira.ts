import type { JiraEpic, InitiativeStatus } from './types.js';

export function isJiraConfigured(): boolean {
  return !!(process.env.JIRA_HOST && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN);
}

function getJiraConfig() {
  const host = process.env.JIRA_HOST!;
  const email = process.env.JIRA_EMAIL!;
  const token = process.env.JIRA_API_TOKEN!;
  const baseUrl = host.startsWith('http') ? host : `https://${host}`;
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  return { baseUrl, auth };
}

async function jiraFetch(path: string, options: RequestInit = {}): Promise<any> {
  const { baseUrl, auth } = getJiraConfig();
  const url = `${baseUrl}/rest/api/3${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Jira API error ${response.status}: ${errorText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function extractPlainText(adf: any): string | null {
  if (!adf) return null;
  if (typeof adf === 'string') return adf;
  const texts: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === 'text' && node.text) texts.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  }
  walk(adf);
  return texts.join(' ').trim() || null;
}

function mapJiraStatusToApp(jiraStatus: string): InitiativeStatus {
  const lower = jiraStatus.toLowerCase();
  if (lower === 'done' || lower === 'closed' || lower === 'resolved') return 'completed';
  if (lower === 'in progress' || lower === 'in development' || lower === 'in review') return 'in_progress';
  if (lower === 'blocked' || lower === 'impediment') return 'blocked';
  return 'planned';
}

function rowToJiraEpic(issue: any): JiraEpic {
  const { baseUrl } = getJiraConfig();
  return {
    key: issue.key,
    summary: issue.fields.summary,
    description: extractPlainText(issue.fields.description),
    status: issue.fields.status?.name ?? 'To Do',
    startDate: issue.fields.customfield_10014 ?? null,
    dueDate: issue.fields.duedate ?? null,
    url: `${baseUrl}/browse/${issue.key}`,
  };
}

export async function getEpic(epicKey: string): Promise<JiraEpic> {
  const data = await jiraFetch(
    `/issue/${epicKey}?fields=summary,description,status,customfield_10014,duedate`
  );
  return rowToJiraEpic(data);
}

export async function searchEpics(query: string): Promise<JiraEpic[]> {
  const jql = `issuetype = Epic AND (summary ~ "${query}" OR key = "${query}") ORDER BY updated DESC`;
  const data = await jiraFetch('/search/jql', {
    method: 'POST',
    body: JSON.stringify({
      jql,
      fields: ['summary', 'description', 'status', 'customfield_10014', 'duedate'],
      maxResults: 20,
    }),
  });
  return (data.issues ?? []).map(rowToJiraEpic);
}

export function mapEpicToInitiativeFields(epic: JiraEpic) {
  return {
    title: epic.summary,
    description: epic.description,
    status: mapJiraStatusToApp(epic.status),
    startDate: epic.startDate,
    endDate: epic.dueDate,
  };
}
