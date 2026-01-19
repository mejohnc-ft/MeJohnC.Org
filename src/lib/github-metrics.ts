/**
 * GitHub Metrics Integration
 * Fetches repository metrics from GitHub API
 */

// GitHub API base URL
const GITHUB_API = 'https://api.github.com';

// Types
export interface GitHubRepo {
  name: string;
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  size: number;
  default_branch: string;
  pushed_at: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{ name: string; color: string }>;
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

export interface GitHubMetrics {
  repo: GitHubRepo;
  recentCommits: GitHubCommit[];
  openPullRequests: GitHubPullRequest[];
  openIssues: GitHubIssue[];
  contributors: GitHubContributor[];
  commitActivity: CommitActivity[];
}

export interface CommitActivity {
  week: number;
  total: number;
  days: number[];
}

// Helper for making authenticated requests
async function githubFetch<T>(
  endpoint: string,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API}${endpoint}`, { headers });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later or provide a token.');
    }
    if (response.status === 404) {
      throw new Error('Repository not found');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Fetch repository info
export async function getRepoInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepo> {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`, token);
}

// Fetch recent commits
export async function getRecentCommits(
  owner: string,
  repo: string,
  limit: number = 30,
  token?: string
): Promise<GitHubCommit[]> {
  return githubFetch<GitHubCommit[]>(
    `/repos/${owner}/${repo}/commits?per_page=${limit}`,
    token
  );
}

// Fetch open pull requests
export async function getOpenPullRequests(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubPullRequest[]> {
  return githubFetch<GitHubPullRequest[]>(
    `/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
    token
  );
}

// Fetch open issues
export async function getOpenIssues(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubIssue[]> {
  return githubFetch<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?state=open&per_page=100`,
    token
  );
}

// Fetch contributors
export async function getContributors(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubContributor[]> {
  return githubFetch<GitHubContributor[]>(
    `/repos/${owner}/${repo}/contributors?per_page=100`,
    token
  );
}

// Fetch commit activity (last 52 weeks)
export async function getCommitActivity(
  owner: string,
  repo: string,
  token?: string
): Promise<CommitActivity[]> {
  return githubFetch<CommitActivity[]>(
    `/repos/${owner}/${repo}/stats/commit_activity`,
    token
  );
}

// Fetch all metrics for a repository
export async function getAllGitHubMetrics(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubMetrics> {
  const [repoInfo, commits, pullRequests, issues, contributors, commitActivity] =
    await Promise.all([
      getRepoInfo(owner, repo, token),
      getRecentCommits(owner, repo, 30, token),
      getOpenPullRequests(owner, repo, token),
      getOpenIssues(owner, repo, token),
      getContributors(owner, repo, token),
      getCommitActivity(owner, repo, token).catch(() => []), // This endpoint can be slow/unavailable
    ]);

  return {
    repo: repoInfo,
    recentCommits: commits,
    openPullRequests: pullRequests,
    openIssues: issues,
    contributors,
    commitActivity,
  };
}

// Transform GitHub data into metrics format for storage
export interface TransformedMetric {
  metric_name: string;
  metric_type: 'counter' | 'gauge';
  value: number;
  unit: string | null;
  dimensions: Record<string, string>;
  recorded_at: string;
}

export function transformGitHubMetrics(
  metrics: GitHubMetrics,
  owner: string,
  repo: string
): TransformedMetric[] {
  const now = new Date().toISOString();
  const dimensions = { owner, repo };

  return [
    {
      metric_name: 'github_stars',
      metric_type: 'gauge',
      value: metrics.repo.stargazers_count,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'github_forks',
      metric_type: 'gauge',
      value: metrics.repo.forks_count,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'github_open_issues',
      metric_type: 'gauge',
      value: metrics.openIssues.length,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'github_open_prs',
      metric_type: 'gauge',
      value: metrics.openPullRequests.length,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'github_contributors',
      metric_type: 'gauge',
      value: metrics.contributors.length,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'github_repo_size',
      metric_type: 'gauge',
      value: metrics.repo.size,
      unit: 'kb',
      dimensions,
      recorded_at: now,
    },
    {
      metric_name: 'github_watchers',
      metric_type: 'gauge',
      value: metrics.repo.watchers_count,
      unit: 'count',
      dimensions,
      recorded_at: now,
    },
  ];
}

// Calculate commits per day from commit activity
export function getCommitsPerDay(activity: CommitActivity[]): { date: string; commits: number }[] {
  const result: { date: string; commits: number }[] = [];

  activity.forEach((week) => {
    const weekStart = new Date(week.week * 1000);
    week.days.forEach((commits, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + dayIndex);
      result.push({
        date: date.toISOString().split('T')[0],
        commits,
      });
    });
  });

  return result;
}

// Calculate commits per week from commit activity
export function getCommitsPerWeek(activity: CommitActivity[]): { date: string; commits: number }[] {
  return activity.map((week) => ({
    date: new Date(week.week * 1000).toISOString().split('T')[0],
    commits: week.total,
  }));
}
