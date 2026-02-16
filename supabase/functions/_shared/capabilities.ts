/**
 * Capability Definitions and Action Routing for Supabase Edge Functions
 *
 * Maps API gateway actions to required capabilities and routes them
 * to the appropriate handler (agent, workflow, integration, query).
 *
 * Usage:
 *   import { canPerformAction, resolveRoute } from '../_shared/capabilities.ts'
 *
 *   const allowed = canPerformAction(agent.capabilities, 'query.contacts')
 *   const route = resolveRoute('workflow.execute')
 */

/**
 * Maps action prefixes/names to the required capability.
 * Actions follow the pattern: "<domain>.<operation>"
 */
export const ACTION_CAPABILITY_MAP: Record<string, string> = {
  // CRM actions
  'query.contacts': 'crm',
  'query.deals': 'crm',
  'query.interactions': 'crm',
  'crm.create_contact': 'crm',
  'crm.update_contact': 'crm',
  'crm.search': 'crm',

  // Knowledge base
  'kb.search': 'kb',
  'kb.ingest': 'kb',
  'kb.summarize': 'kb',

  // Video
  'video.transcode': 'video',
  'video.analyze': 'video',

  // Meta-analysis
  'analysis.cross_domain': 'meta_analysis',
  'analysis.patterns': 'meta_analysis',
  'analysis.report': 'meta_analysis',

  // Email
  'email.send': 'email',
  'email.draft': 'email',
  'email.search': 'email',

  // Calendar
  'calendar.create_event': 'calendar',
  'calendar.list_events': 'calendar',
  'calendar.check_availability': 'calendar',

  // Tasks
  'tasks.create': 'tasks',
  'tasks.update': 'tasks',
  'tasks.list': 'tasks',
  'tasks.complete': 'tasks',

  // Documents
  'documents.create': 'documents',
  'documents.edit': 'documents',
  'documents.search': 'documents',

  // Research
  'research.web_search': 'research',
  'research.summarize': 'research',
  'research.gather': 'research',

  // Code
  'code.generate': 'code',
  'code.review': 'code',
  'code.deploy': 'code',

  // Data
  'data.transform': 'data',
  'data.query': 'data',
  'data.export': 'data',

  // Social
  'social.post': 'social',
  'social.schedule': 'social',
  'social.analytics': 'social',

  // Finance
  'finance.invoice': 'finance',
  'finance.report': 'finance',
  'finance.payment': 'finance',

  // Automation
  'automation.trigger': 'automation',
  'automation.schedule': 'automation',

  // System actions (no capability required)
  'agent.status': '',
  'agent.capabilities': '',
  'workflow.execute': 'automation',
  'workflow.status': '',
  'integration.status': '',
}

export interface RouteTarget {
  type: 'agent' | 'workflow' | 'integration' | 'query' | 'system'
  handler: string
}

/**
 * Check if an agent with the given capabilities can perform an action.
 * Returns true if:
 *   - The action has no capability requirement (system actions)
 *   - The agent's capabilities include the required capability
 */
export function canPerformAction(agentCapabilities: string[], action: string): boolean {
  const required = ACTION_CAPABILITY_MAP[action]

  // Unknown action — deny by default
  if (required === undefined) return false

  // System action — no capability needed
  if (required === '') return true

  return agentCapabilities.includes(required)
}

/**
 * Resolve an action string to a route target.
 * Routes are determined by the action prefix:
 *   - agent.*       -> agent handler
 *   - workflow.*     -> workflow handler
 *   - integration.*  -> integration handler
 *   - query.*        -> query handler
 *   - everything else -> system handler
 */
export function resolveRoute(action: string): RouteTarget {
  const prefix = action.split('.')[0]

  switch (prefix) {
    case 'agent':
      return { type: 'agent', handler: 'agent-command' }
    case 'workflow':
      return { type: 'workflow', handler: 'workflow-executor' }
    case 'integration':
      return { type: 'integration', handler: 'integration-credentials' }
    case 'query':
      return { type: 'query', handler: 'query-engine' }
    default:
      return { type: 'system', handler: action }
  }
}
