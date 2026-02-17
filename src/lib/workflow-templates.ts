import {
  Link,
  Activity,
  ArrowUpRight,
  Users,
  Webhook,
  MessageSquare,
  RefreshCw,
  Database,
} from 'lucide-react';

interface WorkflowTemplateStep {
  id: string;
  type: 'agent_command' | 'wait' | 'condition' | 'integration_action';
  config: Record<string, unknown>;
  timeout_ms: number;
  retries: number;
  on_failure: 'continue' | 'stop' | 'skip';
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'agent' | 'integration';
  icon: typeof Link;
  trigger_type: 'manual' | 'scheduled' | 'webhook' | 'event';
  trigger_config: Record<string, unknown>;
  steps: WorkflowTemplateStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ===== Agent-Centric Templates =====
  {
    id: 'chain-agents',
    name: 'Chain Agents',
    description: 'Execute a sequence of agent commands, passing results between steps with failure handling.',
    category: 'agent',
    icon: Link,
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      {
        id: 'step-1',
        type: 'agent_command',
        config: {
          command: 'analyze',
          payload: { task: 'Analyze input data' },
        },
        timeout_ms: 60000,
        retries: 1,
        on_failure: 'stop',
      },
      {
        id: 'step-2',
        type: 'condition',
        config: {
          expression: 'step-1.status == completed',
          then_step: 'step-3',
          else_step: undefined,
        },
        timeout_ms: 5000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-3',
        type: 'agent_command',
        config: {
          command: 'process',
          payload: { task: 'Process analysis results' },
        },
        timeout_ms: 60000,
        retries: 1,
        on_failure: 'stop',
      },
    ],
  },
  {
    id: 'agent-health-monitor',
    name: 'Agent Health Monitor',
    description: 'Periodically check agent health and trigger alerts on failures.',
    category: 'agent',
    icon: Activity,
    trigger_type: 'scheduled',
    trigger_config: { cron: '*/5 * * * *' },
    steps: [
      {
        id: 'step-1',
        type: 'agent_command',
        config: {
          command: 'health_check',
          payload: { check_type: 'full' },
        },
        timeout_ms: 15000,
        retries: 2,
        on_failure: 'continue',
      },
      {
        id: 'step-2',
        type: 'condition',
        config: {
          expression: 'step-1.status != completed',
          then_step: 'step-3',
        },
        timeout_ms: 5000,
        retries: 0,
        on_failure: 'continue',
      },
      {
        id: 'step-3',
        type: 'agent_command',
        config: {
          command: 'notify',
          payload: { message: 'Agent health check failed', severity: 'warning' },
        },
        timeout_ms: 10000,
        retries: 1,
        on_failure: 'continue',
      },
    ],
  },
  {
    id: 'auto-escalation',
    name: 'Auto-Escalation',
    description: 'Wait for a task to complete, then escalate to a human or senior agent if it times out.',
    category: 'agent',
    icon: ArrowUpRight,
    trigger_type: 'event',
    trigger_config: { event_type: 'task.created' },
    steps: [
      {
        id: 'step-1',
        type: 'agent_command',
        config: {
          command: 'execute_task',
          payload: { priority: 'normal' },
        },
        timeout_ms: 120000,
        retries: 0,
        on_failure: 'continue',
      },
      {
        id: 'step-2',
        type: 'condition',
        config: {
          expression: 'step-1.status == failed',
          then_step: 'step-3',
        },
        timeout_ms: 5000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-3',
        type: 'agent_command',
        config: {
          command: 'escalate',
          payload: { reason: 'Task timed out or failed', escalate_to: 'admin' },
        },
        timeout_ms: 30000,
        retries: 1,
        on_failure: 'stop',
      },
    ],
  },
  {
    id: 'smart-delegation',
    name: 'Smart Delegation',
    description: 'Route tasks to the best-fit agent based on capability matching.',
    category: 'agent',
    icon: Users,
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      {
        id: 'step-1',
        type: 'agent_command',
        config: {
          command: 'find_best_agent',
          payload: { capability: 'code_review', min_proficiency: 0.7 },
        },
        timeout_ms: 15000,
        retries: 1,
        on_failure: 'stop',
      },
      {
        id: 'step-2',
        type: 'agent_command',
        config: {
          command: 'delegate_task',
          payload: { task: 'Review pull request' },
        },
        timeout_ms: 60000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-3',
        type: 'wait',
        config: { delay_ms: 5000 },
        timeout_ms: 10000,
        retries: 0,
        on_failure: 'continue',
      },
      {
        id: 'step-4',
        type: 'agent_command',
        config: {
          command: 'check_delegation_status',
          payload: {},
        },
        timeout_ms: 15000,
        retries: 0,
        on_failure: 'continue',
      },
    ],
  },

  // ===== Integration-Driven Templates =====
  {
    id: 'webhook-pipeline',
    name: 'Webhook Pipeline',
    description: 'Receive webhook data, validate it, and dispatch to an integration action.',
    category: 'integration',
    icon: Webhook,
    trigger_type: 'webhook',
    trigger_config: { path: '/incoming' },
    steps: [
      {
        id: 'step-1',
        type: 'agent_command',
        config: {
          command: 'validate_payload',
          payload: { schema: 'webhook_input' },
        },
        timeout_ms: 10000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-2',
        type: 'integration_action',
        config: {
          integration_id: '',
          action_name: '',
          parameters: {},
        },
        timeout_ms: 30000,
        retries: 1,
        on_failure: 'stop',
      },
    ],
  },
  {
    id: 'slack-notifications',
    name: 'Slack Notifications',
    description: 'Send formatted notifications to Slack channels based on events.',
    category: 'integration',
    icon: MessageSquare,
    trigger_type: 'event',
    trigger_config: { event_type: 'notification.send' },
    steps: [
      {
        id: 'step-1',
        type: 'agent_command',
        config: {
          command: 'format_message',
          payload: { template: 'slack_notification' },
        },
        timeout_ms: 10000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-2',
        type: 'integration_action',
        config: {
          integration_id: '',
          action_name: 'send_message',
          parameters: { channel: '#general', text: '' },
        },
        timeout_ms: 15000,
        retries: 2,
        on_failure: 'continue',
      },
    ],
  },
  {
    id: 'api-polling',
    name: 'API Polling',
    description: 'Periodically poll an external API and process new data.',
    category: 'integration',
    icon: RefreshCw,
    trigger_type: 'scheduled',
    trigger_config: { cron: '0 * * * *' },
    steps: [
      {
        id: 'step-1',
        type: 'integration_action',
        config: {
          integration_id: '',
          action_name: 'fetch_data',
          parameters: { endpoint: '/api/updates', since: 'last_run' },
        },
        timeout_ms: 30000,
        retries: 2,
        on_failure: 'stop',
      },
      {
        id: 'step-2',
        type: 'condition',
        config: {
          expression: 'step-1.status == completed',
          then_step: 'step-3',
        },
        timeout_ms: 5000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-3',
        type: 'agent_command',
        config: {
          command: 'process_updates',
          payload: {},
        },
        timeout_ms: 60000,
        retries: 1,
        on_failure: 'continue',
      },
    ],
  },
  {
    id: 'data-sync',
    name: 'Data Sync',
    description: 'Synchronize data between two integrations on a schedule.',
    category: 'integration',
    icon: Database,
    trigger_type: 'scheduled',
    trigger_config: { cron: '0 */6 * * *' },
    steps: [
      {
        id: 'step-1',
        type: 'integration_action',
        config: {
          integration_id: '',
          action_name: 'export_data',
          parameters: { format: 'json' },
        },
        timeout_ms: 60000,
        retries: 1,
        on_failure: 'stop',
      },
      {
        id: 'step-2',
        type: 'agent_command',
        config: {
          command: 'transform_data',
          payload: { mapping: 'default' },
        },
        timeout_ms: 30000,
        retries: 0,
        on_failure: 'stop',
      },
      {
        id: 'step-3',
        type: 'integration_action',
        config: {
          integration_id: '',
          action_name: 'import_data',
          parameters: { format: 'json', upsert: true },
        },
        timeout_ms: 60000,
        retries: 1,
        on_failure: 'stop',
      },
    ],
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'agent', label: 'Agent' },
  { id: 'integration', label: 'Integration' },
] as const;
